import type { DiningLocation } from '../domain/SearchPreferences.ts';
import { isCoordinates } from './geo.ts';
export { distanceMeters } from './geo.ts';
// Parse intent only. Ordinary text is geocoded by the discovery Worker.
export function parseLocation(raw: string): DiningLocation {
    const input = raw.trim().replace(/\s+/g, ' ');
    if (input.length < 2 || input.length > 240 || /[\u0000-\u001f]/.test(input))
        throw new Error('Enter a city, ZIP code, or street address. Add a state or country if needed.');
    const coordinates = input.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordinates) {
        const latitude = Number(coordinates[1]), longitude = Number(coordinates[2]);
        if (!isCoordinates({ latitude, longitude }))
            throw new Error('Those coordinates are outside the valid latitude/longitude range.');
        return { latitude, longitude, source: 'manual', label: 'Entered location' };
    }
    return { query: input, label: input, source: /^\d{5}(?:-\d{4})?$/.test(input) ? 'zip' : 'city' };
}
