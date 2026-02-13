import { Point } from '../interfaces/point';

export class ClusteredLocation {
  h3Index!: string;
  location: Point;
  count: number;
}

export class DriverLocationUpdate {
  point!: Point;
  driverId!: number;
  orderIds!: number[];
  lastUpdatedAt!: Date;
}
