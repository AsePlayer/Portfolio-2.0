import type { DiningLocation } from '../domain/SearchPreferences.ts';
export const DEMO_CENTER = { latitude: 34.1478, longitude: -118.1445 };
export function distanceMeters(a: {
    latitude: number;
    longitude: number;
}, b: {
    latitude: number;
    longitude: number;
}): number {
    const radians = (d: number) => d * Math.PI / 180;
    const deltaLat = radians(b.latitude - a.latitude), deltaLon = radians(b.longitude - a.longitude);
    const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLon / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function parseLocation(raw: string): DiningLocation {
    const input = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (['91101', '91103', '91105', 'pasadena', 'pasadena, ca', 'pasadena ca', 'pasadena, california'].includes(input)) {
        return { ...DEMO_CENTER, label: 'Pasadena, CA', source: /^\d/.test(input) ? 'zip' : 'city' };
    }
    const coordinates = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordinates) {
        const latitude = Number(coordinates[1]), longitude = Number(coordinates[2]);
        if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180)
            return { latitude, longitude, source: 'manual', label: 'Entered coordinates' };
    }
    throw new Error('The test kitchen covers Pasadena, CA. Try Pasadena or ZIP 91101. Other cities will need a live provider.');
}
