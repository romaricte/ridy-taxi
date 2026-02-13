import { PlacesClient } from '@googlemaps/places';
import { Inject, Injectable } from '@nestjs/common';
import { SharedConfigurationService } from '../config/shared-configuration.service';
import { google } from '@googlemaps/places/build/protos/protos';
import { PlaceDTO } from '../interfaces';
import { REDIS } from '../redis';
import { RedisClientType } from 'redis';
import { latLngToCell } from 'h3-js';
import { Client } from '@googlemaps/google-maps-services-js';

@Injectable()
export class GoogleGeoService {
  private placesApi: PlacesClient;

  constructor(
    private configurationService: SharedConfigurationService,
    @Inject(REDIS) readonly redis: RedisClientType,
  ) {}

  private async getPlacesApi(): Promise<PlacesClient> {
    if (!this.placesApi) {
      const config = await this.configurationService.getConfiguration();
      this.placesApi = new PlacesClient({
        apiKey: config!.backendMapsAPIKey!,
      });
    }
    return this.placesApi;
  }

  // --- config ---
  private readonly H3_CITY_RES = 6; // coarse "city-ish" resolution
  private readonly TTL_PLACES_SEC = 86400; // 24h for places list
  private readonly TTL_REVERSE_SEC = 86400; // 24h for reverse geocode points
  private readonly GEO_RADIUS_M = 10; // 10 meters proximity hit
  private readonly PLACES_FIELDS_MIN =
    'places.location,places.formattedAddress,places.displayName,places.name';

  // --- helpers ---
  private cityCell(lat: number, lng: number) {
    return latLngToCell(lat, lng, this.H3_CITY_RES);
  }

  private placesCityKey(
    lang: string | undefined,
    keyword: string,
    cityCell: string,
  ) {
    return `geo:places:${(lang ?? 'any').toLowerCase()}:${keyword.trim().toLowerCase()}:city:${cityCell}:v1`;
  }

  private reverseGeoKey(lang: string | undefined) {
    return `geo:reverse:${(lang ?? 'any').toLowerCase()}:v1`; // GEO index
  }

  private reverseHashKey(memberId: string) {
    return `geo:reverse:hash:${memberId}`; // payload for reverse GEO member
  }

  private pickTitle(p: any) {
    return p?.displayName?.text || p?.name || '';
  }

  private pickAddress(p: any) {
    return p?.formattedAddress || this.pickTitle(p) || 'Address not found';
  }

  // stable member id for GEO (approx coordinates)
  private makeMemberId(lat: number, lng: number) {
    // micro-degree rounding ~0.11m — stable and collision-resistant enough here
    const la = Math.round(lat * 1e6);
    const lo = Math.round(lng * 1e6);
    return `${la}:${lo}`;
  }

  async getPlaces(input: {
    keyword: string;
    location?: { lat: number; lng: number };
    language?: string;
  }): Promise<PlaceDTO[]> {
    const pipeline = this.redis.multi();
    pipeline.hIncrBy('geo:stats', 'getPlaces:requests', 1);
    // pipeline.ts.incrBy(`geo:stats:kw:${input.keyword.toLowerCase()}`, 1, {
    //   RETENTION: 2592000, // 30 days
    //   LABELS: { type: 'getPlaces', keyword: input.keyword.toLowerCase() },
    // });
    pipeline.exec().catch(() => null);

    // Build city cache key only if we have a location
    let cityKey: string | null = null;
    if (input.location) {
      const c = this.cityCell(input.location.lat, input.location.lng);
      cityKey = this.placesCityKey(input.language, input.keyword, c);
      const cached = await this.redis.get(cityKey).catch(() => null);
      if (cached) {
        await this.redis.hIncrBy('geo:stats', 'getPlaces:cacheHits', 1);
        return JSON.parse(cached);
      }
    }

    // Call provider
    const placesApi = await this.getPlacesApi();
    const req: google.maps.places.v1.ISearchTextRequest = {
      textQuery: input.keyword,
      languageCode: input.language,
      maxResultCount: 5,
    };
    if (input.location) {
      req.locationBias = {
        circle: {
          center: {
            latitude: input.location.lat,
            longitude: input.location.lng,
          },
          radius: 5000, // sensible bias without exploding variants
        },
      };
    }

    const resp = await placesApi
      .searchText(req, {
        otherArgs: { headers: { 'X-Goog-FieldMask': this.PLACES_FIELDS_MIN } },
      })
      .catch(() => [{ places: [] } as any]);

    const items = resp?.[0]?.places ?? [];
    const results: PlaceDTO[] = [];
    for (const p of items) {
      const lat = p?.location?.latitude;
      const lng = p?.location?.longitude;
      if (lat == null || lng == null) continue;
      results.push({
        point: { lat, lng },
        title: this.pickTitle(p),
        address: this.pickAddress(p),
      });
    }

    // Cache at city scope if we can
    if (cityKey) {
      const ttl = results.length ? this.TTL_PLACES_SEC : 600; // negative cache 10m if empty
      await this.redis
        .setEx(cityKey, ttl, JSON.stringify(results))
        .catch(() => {});
    }

    return results;
  }

  async reverseGeocode(input: {
    lat: number;
    lng: number;
    language?: string;
  }): Promise<PlaceDTO> {
    await this.redis.hIncrBy('geo:stats', 'reverseGeocode:requests', 1);

    const geoKey = this.reverseGeoKey(input.language);

    // 1) Try GEO within 20m
    const hits = await this.redis
      .geoSearch(
        geoKey,
        { latitude: input.lat, longitude: input.lng },
        { radius: this.GEO_RADIUS_M, unit: 'm' },
        { SORT: 'ASC', COUNT: 1 },
      )
      .catch(() => null);

    if (hits && hits.length > 0) {
      const memberId = hits[0].member ?? hits[0]; // node-redis returns object or string depending on options
      const h = await this.redis.hGetAll(this.reverseHashKey(memberId));
      if (h && h.address) {
        await this.redis.hIncrBy('geo:stats', 'reverseGeocode:cacheHits', 1);
        return {
          point: { lat: parseFloat(h.lat), lng: parseFloat(h.lng) },
          title: h.title || '',
          address: h.address,
        };
      }
    }

    // 2) Fallback to provider, then store in GEO for future 20m hits
    const config = await this.configurationService.getConfiguration();
    const client = new Client({});
    const response = await client.reverseGeocode({
      params: {
        latlng: [input.lat, input.lng],
        key: config.backendMapsAPIKey!,
      },
    });
    const place = response.data.results[0];

    const dto: PlaceDTO = place
      ? {
          point: {
            lat: place.geometry.location!.lat!,
            lng: place.geometry.location!.lng!,
          },
          title: place.address_components.map((c) => c.long_name).join(', '),
          address: place.formatted_address || 'Address not found',
        }
      : {
          point: { lat: input.lat, lng: input.lng },
          title: '',
          address: 'Address not found',
        };

    // Store in GEO + hash (even if "Address not found"—it still avoids repeated calls)
    const memberId = this.makeMemberId(dto.point.lat, dto.point.lng);
    await this.redis
      .geoAdd(geoKey, {
        longitude: dto.point.lng,
        latitude: dto.point.lat,
        member: memberId,
      })
      .catch(() => {});
    await this.redis
      .hSet(this.reverseHashKey(memberId), {
        lat: String(dto.point.lat),
        lng: String(dto.point.lng),
        title: dto.title,
        address: dto.address,
      })
      .catch(() => {});
    await this.redis.expire(geoKey, this.TTL_REVERSE_SEC).catch(() => {});
    await this.redis
      .expire(this.reverseHashKey(memberId), this.TTL_REVERSE_SEC)
      .catch(() => {});

    return dto;
  }
}
