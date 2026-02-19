import { ValueTransformer } from 'typeorm';
import { Point } from '../interfaces/point';

export class PolygonTransformer implements ValueTransformer {
    to(value: Point[][]): object | string | null {
        if (value == null) return null;
        return {
            type: 'Polygon',
            coordinates: value.map(ring => ring.map(p => [p.lng, p.lat]))
        };
    }

    from(value: string | any): Point[][] {
        if (value == null) return [];

        if (typeof value === 'object' && value.type === 'Polygon') {
            return value.coordinates.map((ring: number[][]) =>
                ring.map((coord: number[]) => ({ lng: coord[0], lat: coord[1] }))
            );
        }

        if (typeof value === 'string' && value.startsWith('POLYGON')) {
            return value.substring(8, value.length - 1).split('),(').map(x => {
                const res = x.replace(/^\(/, '').replace(/\)$/, '').split(',').map(y => {
                    const s = y.trim().split(' ');
                    return {
                        lng: parseFloat(s[0]),
                        lat: parseFloat(s[1])
                    }
                });
                return res;
            });
        }
        return [];
    }
}


