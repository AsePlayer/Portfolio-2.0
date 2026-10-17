import type { DiningLocation } from '../domain/SearchPreferences.ts';
export interface LocationService {
    current(): Promise<DiningLocation>;
    parse(input: string): DiningLocation;
}
import { parseLocation } from './LocationParser.ts';
export class BrowserLocationService implements LocationService {
    parse = parseLocation;
    current(): Promise<DiningLocation> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Location is unavailable in this browser. Type Pasadena or 91101 instead.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, source: 'browser', label: 'Current location' }), () => reject(new Error('Couldn’t use your location. You can still type Pasadena or 91101 to try the demo.')), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
        });
    }
}
