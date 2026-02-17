// src/types/strava.ts

export interface StravaMap {
    id: string;
    summary_polyline: string; // C'est cette chaîne qu'on décodera pour tracer le parcours
    resource_state: number;
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