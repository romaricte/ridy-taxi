import { ValueTransformer } from 'typeorm';
import { Point } from '../interfaces/point';

export class PointTransformer implements ValueTransformer {
  to(value: Point): object | string | null {
    if (value == null) return null;
    return { type: 'Point', coordinates: [value.lng, value.lat] };
  }
  from(value: string | any): Point | null {
    if (value == null) return null;
    if (typeof value === 'object' && value.type === 'Point') {
      return { lng: value.coordinates[0], lat: value.coordinates[1] };
    }
    if (typeof value === 'string' && value.startsWith('POINT')) {
      const a = value.substring(6, value.length - 1).split(' ');
      return {
        lng: parseFloat(a[0]),
        lat: parseFloat(a[1]),
      };
    }
    return null;
  }
}
