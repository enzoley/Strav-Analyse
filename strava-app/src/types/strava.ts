export interface StravaMap {
    id: string;
    summary_polyline: string;
    resource_state: number;
    polyline?: string;
}

export interface StravaActivitySummary {
    id: number;
    name: string;
    distance: number;
    moving_time: number;
    start_date: string;
    type: string;
    map: StravaMap;
    average_speed: number;
    total_elevation_gain: number;
    average_heartrate?: number;
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
    splits_metric?: StravaSplit[];
    gear?: StravaGear;
    segment_efforts?: StravaSegmentEffort[];
}

export interface StravaStreamRaw {
    type: string;
    data: number[];
    series_type: string;
    original_size: number;
    resolution: string;
}

export interface ChartDataPoint {
    distanceKm: number;
    heartrate?: number | null;
    cadence?: number | null;
    altitude?: number | null;
    pace?: number | null;
    watts?: number | null;
}

export interface StravaSplit {
    split: number;
    distance: number;
    elapsed_time: number;
    moving_time: number;
    average_speed: number;
    average_heartrate?: number;
    elevation_difference: number;
}

export interface StravaGear {
    id: string;
    name: string;
    distance: number;
}

export interface StravaSegmentEffort {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    pr_rank?: number;
}

export interface StravaAthlete {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
}

export interface StravaAthleteStats {
    ytd_run_totals: {
        distance: number;
        count: number;
        elevation_gain: number;
        moving_time: number;
    };
}
