export interface Coordinates {
    latitude: number;
    longitude: number;
}
export function isCoordinates(value: unknown): value is Coordinates {
    const point = value as Coordinates;
    return !!point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
        && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
export function distanceMeters(a: Coordinates, b: Coordinates): number {
    const radians = (d: number) => d * Math.PI / 180;
    const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2
        + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function boundingBox(origin: Coordinates, radiusMeters: number) {
    const angle = radiusMeters / 6371000, latitude = origin.latitude * Math.PI / 180;
    const lowLat = Math.max(-Math.PI / 2, latitude - angle), highLat = Math.min(Math.PI / 2, latitude + angle);
    const wrap = (degrees: number) => ((degrees + 540) % 360) - 180;
    const allLongitudes = lowLat <= -Math.PI / 2 || highLat >= Math.PI / 2;
    const longitudeDelta = allLongitudes ? 180 : Math.asin(Math.sin(angle) / Math.cos(latitude)) * 180 / Math.PI;
    return {
        low: { latitude: lowLat * 180 / Math.PI, longitude: allLongitudes ? -180 : wrap(origin.longitude - longitudeDelta) },
        high: { latitude: highLat * 180 / Math.PI, longitude: allLongitudes ? 180 : wrap(origin.longitude + longitudeDelta) },
    };
}
