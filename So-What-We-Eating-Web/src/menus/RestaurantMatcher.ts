import type { Restaurant } from '../domain/Restaurant.ts';
import { distanceMeters, isCoordinates } from '../location/geo.ts';
import { addressIdentity, normalizeName } from './normalizeIdentity.ts';

export type IdentityAssessment = { confidence: number; reasons: string[]; distanceMeters?: number; rejected: boolean };
export function assessIdentity(google: Restaurant, candidate: Restaurant): IdentityAssessment {
    const a = addressIdentity(google), b = addressIdentity(candidate), reasons: string[] = [];
    const reject = (reason: string): IdentityAssessment => ({ confidence: 0, reasons: [reason], rejected: true });
    if (a.countryCode && a.countryCode !== 'US' || b.countryCode && b.countryCode !== 'US') return reject('country-conflict');
    if (a.regionCode && b.regionCode && a.regionCode !== b.regionCode) return reject('state-conflict');
    if (a.locality && b.locality && a.locality !== b.locality) return reject('locality-conflict');
    if (a.number && b.number && a.number !== b.number) return reject('house-number-conflict');
    if (a.unit && b.unit && a.unit !== b.unit) return reject('unit-conflict');
    if (a.street && b.street && a.street !== b.street) return reject('street-conflict');
    if (a.postalCode && b.postalCode && a.postalCode !== b.postalCode) return reject('postal-code-conflict');
    const name = normalizeName(google.name), otherName = normalizeName(candidate.name);
    if (!name || name !== otherName) return reject('name-not-strong');
    let score = 40;
    reasons.push('normalized-name-exact');
    if (a.locality && a.locality === b.locality && a.regionCode && a.regionCode === b.regionCode) { score += 10; reasons.push('locality-state-exact'); }
    if (a.number && a.number === b.number) { score += 25; reasons.push('house-number-exact'); }
    if (a.street && a.street === b.street) { score += 15; reasons.push('street-exact'); }
    if (a.postalCode && a.postalCode === b.postalCode) { score += 10; reasons.push('postal-code-exact'); }
    let separation: number | undefined;
    if (isCoordinates(google) && isCoordinates(candidate)) {
        separation = distanceMeters(google, candidate);
        // Conservative: even 300m can be another branch on the same commercial street.
        if (separation > 300) return reject('coordinates-conflict');
        reasons.push(separation < 100 ? 'coordinates-under-100m' : 'coordinates-under-300m');
    }
    // An address without a house number never earns a match, even at a city centroid.
    const strong = reasons.includes('house-number-exact') && reasons.includes('street-exact') && reasons.includes('locality-state-exact');
    return { confidence: strong ? score : Math.min(score, 79), reasons, distanceMeters: separation, rejected: false };
}

/** Score is evidence, never a tie breaker between two plausible branches. */
export function matchRestaurant(google: Restaurant, candidates: Restaurant[]):
    | { status: 'matched'; candidate: Restaurant; assessment: IdentityAssessment }
    | { status: 'not-found' | 'ambiguous' } {
    const plausible = candidates.map(candidate => ({ candidate, assessment: assessIdentity(google, candidate) }))
        .filter(row => !row.assessment.rejected);
    const strong = plausible.filter(row => row.assessment.confidence >= 90);
    if (!strong.length) return { status: 'not-found' };
    if (plausible.length > 1) return { status: 'ambiguous' };
    return { status: 'matched', ...strong[0] };
}
