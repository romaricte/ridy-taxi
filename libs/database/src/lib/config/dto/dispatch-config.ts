export enum DispatchStrategy {
  Broadcast = 'broadcast',
  Sequential = 'sequential',
}

export class BroadcastConfig {
  waveSize: number;
  waveIntervalSeconds: number;
  maxWaves: number;
  radiusIncrementMeters?: number;
}

export class SequentialConfig {
  perDriverTimeoutSeconds!: number;
  avoidPreviousCandidates!: boolean;
  driverRetryLimit!: number;
  maxDriversToTest?: number;
}
export class DriverScoringConfig {
  distanceWeight!: number;
  driverRatingWeight!: number;
  idleTimeWeight!: number;
  cancelRateWeight!: number;
  threshold?: number;
  topN?: number;
}

export class RadiusExpansionConfig {
  enabled: boolean;
  stepMeters: number;
  intervalSeconds: number;
  maxSteps: number;
}

export class FallbackConfig {
  fallbackEnabled: boolean;
  fallbackStrategy: DispatchStrategy;
  fallbackScoring?: DriverScoringConfig;
}

export class DispatchConfig {
  strategy: DispatchStrategy;
  requestTimeoutSeconds: number;
  maxSearchRadiusMeters: number;
  scoring?: DriverScoringConfig;
  radiusExpansion?: RadiusExpansionConfig;
  fallback?: FallbackConfig;
  notifyAdminOnFailure?: boolean;
  broadcastConfig?: BroadcastConfig;
  sequentialConfig?: SequentialConfig;
}
