// src/types/strava.ts

export interface StravaMap {
    id: string;
    summary_polyline: string; // C'est cette chaîne qu'on décodera pour tracer le parcours
    resource_state: number;
    polyline?: string;
}

// Typage pour les tuiles de la page liste
export interface StravaActivitySummary {
    id: number;
    name: string;
    distance: number; // en mètres
    moving_time: number; // en secondes
    start_date: string; // date au format ISO
    type: string; // Ride, Run, Walk, etc.
    map: StravaMap;
    average_speed: number; // mètres par seconde
}

// Typage pour les tokens d'authentification
export interface StravaAuthResponse {
    token_type: string;
    expires_at: number;
    expires_in: number;
    refresh_token: string;
    access_token: string;
    athlete: any; // On met 'any' ici pour simplifier, ou tu peux créer une interface StravaAthlete
}

export interface StravaActivityDetailed extends StravaActivitySummary {
    description: string;
    calories: number;
    total_elevation_gain: number;
    max_speed: number;
    average_cadence?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_watts?: number;
    max_watts?: number;
    suffer_score?: number;
    deviceName?: string;
}

// La structure brute renvoyée par l'API Streams de Strava
export interface StravaStreamRaw {
    type: string; // 'distance', 'heartrate', 'time', etc.
    data: number[]; // Le tableau géant de chiffres [1, 2, 3...]
    series_type: string;
    original_size: number;
    resolution: string;
}

// La structure "propre" que nous allons créer pour donner à Recharts
export interface ChartDataPoint {
    distanceKm: number; // Notre axe X commun
    // Les données optionnelles selon l'activité
    heartrate?: number | null;
    cadence?: number | null;
    altitude?: number | null;
    pace?: number | null; // Allure en min/km (calculée)
    watts?: number | null;
}