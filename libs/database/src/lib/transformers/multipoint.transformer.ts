import { ValueTransformer } from "typeorm";
import { Point } from "../interfaces/point";

export class MultipointTransformer implements ValueTransformer {
	from(value: string | any): Point[] {
		if (value == null) return [];
		// Handle GeoJSON format (Postgres)
		if (typeof value === 'object' && value.type === 'MultiPoint') {
			return value.coordinates.map((coord: number[]) => ({
				lng: coord[0],
				lat: coord[1]
			}));
		}
		// Handle WKT format (MySQL legacy)
		if (typeof value === 'string' && value.startsWith('MULTIPOINT')) {
			return value.substring(11, value.length - 1).split(',').map(x => {
				const s = x.trim().replace(/^\(/, '').replace(/\)$/, '').split(' ');
				return {
					lng: parseFloat(s[0]),
					lat: parseFloat(s[1])
				}
			});
		}
		return [];
	}
	to(value?: Point[]): object | string | null {
		if (value == null || value.length < 1) return null;
		// Return GeoJSON for Postgres
		return {
			type: 'MultiPoint',
			coordinates: value.map(p => [p.lng, p.lat])
		};
	}
}