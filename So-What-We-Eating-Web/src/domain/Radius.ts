export const RADII = [2, 5, 10, 20, 30] as const;
export const PROVIDER_MAX_RADIUS_METERS = 50000;
export const milesToMeters = (miles: number) => Math.round(miles * 1609.344);
export const radiusMiles = (meters: number) => Math.round(meters / 1609.344);
export function nextRadius(meters: number): number | null {
    const miles = RADII.find(m => milesToMeters(m) > meters);
    return miles ? milesToMeters(miles) : null;
}
export function validRadius(meters: unknown): meters is number {
    return typeof meters === 'number' && RADII.some(m => milesToMeters(m) === meters) && meters <= PROVIDER_MAX_RADIUS_METERS;
}
