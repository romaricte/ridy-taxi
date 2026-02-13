// src/infra/redis-search-migration.service.ts
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type {
  RedisClientType,
  RediSearchLanguage,
  RediSearchSchema,
} from 'redis';
import { SCHEMA_FIELD_TYPE } from '@redis/search';
import { REDIS } from './redis-token';

/** Declarative spec for a JSON RediSearch index */
export interface SearchIndexSpec {
  /** Stable alias used by your queries (e.g., "index:rider") */
  alias: string;
  /** Version number for breaking changes (e.g., 3) */
  version: number;
  /** One or more key prefixes (JSON keys you index) */
  prefixes: string[];
  schema: RediSearchSchema;
  /** Optional extra create options, e.g. { LANGUAGE: 'English', STOPWORDS: ['0'] } */
  createOptions?: {
    LANGUAGE?: RediSearchLanguage;
    NOOFFSETS?: boolean;
    NOHL?: boolean;
    STOPWORDS?: string[]; // usually ["0"] to disable
    // DIALECT?: number; // if you set a default dialect
  };
}

@Injectable()
export class RedisSearchMigrationService implements OnApplicationBootstrap {
  private verificationDelayMs = Number(
    process.env.SEARCH_VERIFY_MS ?? 30 * 60 * 1000,
  ); // 30m
  private readonly log = new Logger(RedisSearchMigrationService.name);
  private lockToken: string | null = null;

  constructor(@Inject(REDIS) private readonly redis: RedisClientType) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.DISABLE_REDIS_MIGRATIONS === 'true') {
      this.log.log('Redis search migrations disabled via env');
      return;
    }

    const lockKey = 'lock:redis:search:migrate';
    if (!(await this.acquireLock(lockKey, 15_000))) {
      this.log.log('Another instance is migrating; skipping.');
      return;
    }

    try {
      // === Declare your indexes here or inject from config ===
      const specs: SearchIndexSpec[] = [
        {
          alias: 'index:driver',
          version: 1,
          prefixes: ['driver:'],
          schema: {
            '$.location': { type: SCHEMA_FIELD_TYPE.GEO, AS: 'location' },
            '$.serviceIds[*]': {
              type: SCHEMA_FIELD_TYPE.TAG,
              AS: 'serviceId',
            },
            '$.fleetId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'fleetId' },
            '$.status': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'status' },
            '$.currentOrderIds': {
              type: SCHEMA_FIELD_TYPE.TAG,
              AS: 'currentOrderIds',
            },
            '$.assignedRiderIds': {
              type: SCHEMA_FIELD_TYPE.TAG,
              AS: 'assignedRiderIds',
            },
            '$.searchDistance': {
              type: SCHEMA_FIELD_TYPE.NUMERIC,
              AS: 'searchDistance',
            },
            '$.locationTime': {
              type: SCHEMA_FIELD_TYPE.NUMERIC,
              AS: 'locationTime',
            },
          },
        },
        {
          alias: 'index:ride_offer',
          version: 1,
          prefixes: ['ride_offer:'],
          schema: {
            '$.id': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'id' },
            '$.pickupLocation': {
              type: SCHEMA_FIELD_TYPE.GEO,
              AS: 'pickupLocation',
            },
            '$.type': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'type' },
            '$.riderId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'riderId' },
            '$.serviceId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'serviceId' },
            '$.fleetId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'fleetId' },
            '$.createdAt': {
              type: SCHEMA_FIELD_TYPE.NUMERIC,
              AS: 'createdAt',
            },
            '$.scheduledAt': {
              type: SCHEMA_FIELD_TYPE.NUMERIC,
              AS: 'scheduledAt',
            },
          },
        },
        {
          alias: 'index:active_order',
          version: 1,
          prefixes: ['active_order:'],
          schema: {
            '$.id': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'id' },
            '$.pickupLocation': {
              type: SCHEMA_FIELD_TYPE.GEO,
              AS: 'pickupLocation',
            },
            '$.riderId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'riderId' },
            '$.driverId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'driverId' },
            '$.serviceId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'serviceId' },
            '$.fleetId': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'fleetId' },
            '$.status': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'status' },
            '$.type': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'type' },
            '$.createdAt': {
              type: SCHEMA_FIELD_TYPE.NUMERIC,
              AS: 'createdAt',
            },
          },
        },
        {
          alias: 'index:taxi_service',
          version: 1,
          prefixes: ['taxi_service:'],
          schema: {
            '$.id': { type: SCHEMA_FIELD_TYPE.TAG, AS: 'id' },
            '$.regionIds[*]': {
              type: SCHEMA_FIELD_TYPE.TAG,
              AS: 'regionIds',
            },
          },
        },
      ];

      await this.ensureIndexes(specs);
      this.log.log('RediSearch indexes are up to date.');
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  // ---------------- Core migration ----------------

  private async ensureIndexes(specs: SearchIndexSpec[]) {
    const existing = await this.redis.ft._list(); // typed list

    for (const spec of specs) {
      const versioned = `${spec.alias}:v${spec.version}`;
      const aliasTarget = await this.getAliasTarget(spec.alias);

      // (A) Create vN if missing
      if (!existing.includes(versioned)) {
        await this.createIndex(versioned, spec);
        this.log.log(`Created index ${versioned}`);
      }

      // (B) Ensure alias points to vN
      if (aliasTarget !== versioned) {
        await this.ensureAlias(spec.alias, versioned);
        this.log.log(`Alias ${spec.alias} -> ${versioned}`);
        // Persist our mapping for quick reads (optional but handy)
        await this.redis.set(this.aliasKey(spec.alias), versioned);
      }

      // schedule delayed cleanup
      setTimeout(async () => {
        try {
          const current = await this.getAliasTarget(spec.alias);
          if (current === versioned) {
            const freshList = await this.redis.ft._list();
            await this.dropOlderVersions(spec.alias, spec.version, freshList);
          }
        } catch (e) {
          this.log.warn(`Delayed drop failed for ${spec.alias}: ${String(e)}`);
        }
      }, this.verificationDelayMs).unref?.();
    }
  }

  private async createIndex(name: string, spec: SearchIndexSpec) {
    // `ft.create` typed signature:
    // create(index, schema, options: { ON: 'JSON' | 'HASH', PREFIX?: string | string[], LANGUAGE? ... })
    await this.redis.ft.create(
      name,
      spec.schema, // schema is typed per @redis/search; cast ok as we filled correctly
      {
        ON: 'JSON',
        PREFIX: spec.prefixes.length === 1 ? spec.prefixes[0] : spec.prefixes,
        ...(spec.createOptions ?? {}),
      },
    );
  }

  private async getAliasList(): Promise<
    Array<{ alias: string; index: string }>
  > {
    // Returns something like: [ [ "alias","index:rider","index","index:rider:v3" ], [ ... ] ]
    const resp = await this.redis
      .sendCommand<any[]>(['FT.ALIASLIST'])
      .catch(() => null);
    if (!Array.isArray(resp)) return [];
    return resp
      .filter(Array.isArray)
      .map((row: any[]) => {
        const obj: Record<string, string> = {};
        for (let i = 0; i + 1 < row.length; i += 2) {
          obj[String(row[i])] = String(row[i + 1]);
        }
        return { alias: obj.alias, index: obj.index };
      })
      .filter((a) => a.alias && a.index);
  }

  private async ensureAlias(alias: string, targetIndex: string) {
    // 0) Ensure target exists
    try {
      await this.redis.ft.info(targetIndex);
    } catch (e) {
      throw new Error(
        `Target index ${targetIndex} does not exist or is not a RediSearch index.`,
      );
    }

    // 1) If alias already points to target, we're done
    const aliases = await this.getAliasList().catch(
      () => [] as { alias: string; index: string }[],
    );
    const current = aliases.find((a) => a.alias === alias)?.index;
    if (current === targetIndex) return;

    // 2) Fast path: try to repoint
    try {
      if (current) {
        // Try update first when alias exists
        await this.redis.ft.aliasUpdate(alias, targetIndex);
      } else {
        await this.redis.ft.aliasAdd(alias, targetIndex);
      }
      return;
    } catch (_) {
      // continue to robust path
    }

    // 3) Robust path: DEL (if exists) → ADD
    try {
      if (current) {
        await this.redis.ft.aliasDel(alias);
      }
      await this.redis.ft.aliasAdd(alias, targetIndex);
      return;
    } catch (_) {
      // continue to final fallback
    }

    // 4) Final fallback for "Alias does not belong to provided spec":
    // Ensure the *index itself* declares the alias at creation time (some servers are strict).
    // If the index wasn't created with ALIASES, recreate it WITH the alias:
    //    await this.redis.ft.create(targetIndex, schema, { ON: 'JSON', PREFIX: ..., ALIASES: alias })
    // This is a breaking operation (needs a blue/green new version), so we just explain:
    throw new Error(
      `Failed to set alias ${alias} -> ${targetIndex}. ` +
        `If your server enforces alias membership, recreate the target index with { ALIASES: "${alias}" } ` +
        `or upgrade RediSearch to >= 2.8.x. Also verify you are on the correct logical DB and have ACL for alias ops.`,
    );
  }

  private aliasKey(alias: string) {
    return `search:alias:${alias}`;
  }

  private async getAliasTarget(alias: string): Promise<string | null> {
    // There isn't a built-in "alias get" in the module; store your mapping and read it here.
    let aliasKey = await this.redis.get(this.aliasKey(alias));
    return typeof aliasKey === 'string' ? aliasKey : null;
  }

  // Optional: drop older versioned indexes after a verification window
  private async dropOlderVersions(
    alias: string,
    keepVersion: number,
    existing: string[],
  ) {
    const prefix = `${alias}:v`;
    for (const idx of existing) {
      if (!idx.startsWith(prefix)) continue;
      const v = Number(idx.slice(prefix.length));
      if (!Number.isNaN(v) && v < keepVersion) {
        await this.redis.ft.dropIndex(idx); // typed drop with flag
        this.log.log(
          `Dropped old index ${idx} (KEEBDOCS=false, KEEPDOCS=true)`,
        );
      }
    }
  }

  // ---------------- Minimal distributed lock ----------------

  private async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const token = `${process.pid}-${Date.now()}`;
    const res = await this.redis.set(key, token, { NX: true, PX: ttlMs });
    if (res === 'OK') {
      this.lockToken = token;
      return true;
    }
    return false;
  }

  private async releaseLock(key: string): Promise<void> {
    if (!this.lockToken) return;
    // Best-effort Lua compare & delete
    const lua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    try {
      await this.redis.eval(lua, { keys: [key], arguments: [this.lockToken] });
    } catch {
      /* ignore */
    }
    this.lockToken = null;
  }
}
