export interface Restaurant {
    id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    cuisines: string[];
    rating?: number;
    reviewCount?: number;
    priceLevel?: number;
    isOpen?: boolean;
    distanceMeters?: number;
    websiteUrl?: string;
    menuUrl?: string;
    directionsUrl?: string;
    source: string;
    sourceId?: string;
    isDemo?: boolean;
}
