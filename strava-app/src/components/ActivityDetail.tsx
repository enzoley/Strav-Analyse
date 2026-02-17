// src/components/ActivityDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import polyline from '@mapbox/polyline';
import { StravaActivityDetailed, StravaStreamRaw, ChartDataPoint } from '../types/strava';
import ActivityChart from './ActivityChart';
import './ActivityDetail.css';
import AIAnalysis from './AIAnalysis';

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};
const getKmH = (ms: number) => (ms * 3.6).toFixed(1);
const getPaceStr = (ms: number) => {
    if (!ms || ms === 0 || !isFinite(1000 / ms)) return "0:00";
    const secondsPerKm = 1000 / ms;
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const paceTooltipFormatter = (decimalPace: number): [string, string] => {
    const mins = Math.floor(decimalPace);
    const secs = Math.round((decimalPace - mins) * 60);
    return [`${mins}:${secs.toString().padStart(2,'0')} /km`, "Allure"];
}

const MapBounds = ({ positions }: { positions: [number, number][] }) => {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) map.fitBounds(positions, { padding: [20, 20] });
    }, [map, positions]);
    return null;
};

export default function ActivityDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activity, setActivity] = useState<StravaActivityDetailed | null>(null);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('strava_access_token');
            if (!token) { navigate('/'); return; }

            try {
                const [detailResponse, streamsResponse] = await Promise.all([
                    axios.get(`https://www.strava.com/api/v3/activities/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`https://www.strava.com/api/v3/activities/${id}/streams/distance,altitude,time,heartrate,cadence,velocity_smooth,watts`, {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { key_by_type: true }
                    })
                ]);

                setActivity(detailResponse.data);
                processStreamData(streamsResponse.data);

            } catch (error) {
                console.error("Erreur de récupération :", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    const processStreamData = (streams: any) => {
        const distanceStream: StravaStreamRaw = streams.distance;
        if (!distanceStream) return;

        const dataCount = distanceStream.data.length;
        const formatted: ChartDataPoint[] = [];

        for (let i = 0; i < dataCount; i++) {
            const distMeters = distanceStream.data[i];
            const velocityMs = streams.velocity_smooth?.data[i];

            let paceDecimal = null;
            if (velocityMs && velocityMs > 0) {
                const secondsPerKm = 1000 / velocityMs;
                paceDecimal = secondsPerKm / 60;
                if(paceDecimal > 30) paceDecimal = null;
            }

            formatted.push({
                distanceKm: distMeters / 1000,
                altitude: streams.altitude?.data[i] || null,
                heartrate: streams.heartrate?.data[i] || null,
                cadence: streams.cadence?.data[i] || null,
                watts: streams.watts?.data[i] || null,
                pace: paceDecimal,
            });
        }
        setChartData(formatted);
    };


    if (loading) return <div className="loader">Analyse de la sortie...</div>;
    if (!activity) return <div className="loader">Activité introuvable.</div>;

    const mapPolyline = activity.map?.polyline || activity.map?.summary_polyline;
    const decodedPath = mapPolyline ? polyline.decode(mapPolyline) as [number, number][] : [];

    return (
        <div className="detail-container">
            <Link to="/activities" className="back-button">← Retour aux activités</Link>
            <div className="detail-header">
                <h1 className="detail-title">{activity.name}</h1>
                <div className="detail-meta">{format(parseISO(activity.start_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })} • {activity.type}</div>
                {activity.description && <p>"{activity.description}"</p>}
            </div>

            {decodedPath.length > 0 && (
                <div className="map-container-large">
                    <MapContainer center={decodedPath[0]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Polyline positions={decodedPath} color="#FC4C02" weight={4} />
                        <MapBounds positions={decodedPath} />
                    </MapContainer>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-section">
                    <h2 className="section-title">Général</h2>
                    <div className="stat-row"><span className="stat-name">Distance</span><span className="stat-val">{(activity.distance / 1000).toFixed(2)} km</span></div>
                    <div className="stat-row"><span className="stat-name">Temps</span><span className="stat-val">{formatTime(activity.moving_time)}</span></div>
                    <div className="stat-row"><span className="stat-name">Dénivelé +</span><span className="stat-val">{activity.total_elevation_gain} m</span></div>
                    <div className="stat-row"><span className="stat-name">Calories</span><span className="stat-val">{activity.calories || 'N/A'} kcal</span></div>
                    {activity.gear && (
                        <div className="stat-row"><span className="stat-name">Chaussures</span><span className="stat-val">👟 {activity.gear.name}</span></div>
                    )}
                </div>
                <div className="stat-section">
                    <h2 className="section-title">Vitesse & Allure</h2>
                    <div className="stat-row"><span className="stat-name">Vit. moy.</span><span className="stat-val">{getKmH(activity.average_speed)} km/h</span></div>
                    <div className="stat-row"><span className="stat-name">Vit. max</span><span className="stat-val">{getKmH(activity.max_speed)} km/h</span></div>
                    <div className="stat-row"><span className="stat-name">Allure moy.</span><span className="stat-val">{getPaceStr(activity.average_speed)} /km</span></div>
                    <div className="stat-row"><span className="stat-name">Allure max</span><span className="stat-val">{getPaceStr(activity.max_speed)} /km</span></div>
                </div>
                {(activity.average_heartrate || activity.average_cadence || activity.average_watts) && (
                    <div className="stat-section">
                        <h2 className="section-title">Effort</h2>
                        {activity.average_heartrate && <div className="stat-row"><span className="stat-name">FC Moy.</span><span className="stat-val">{Math.round(activity.average_heartrate)} bpm</span></div>}
                        {activity.max_heartrate && <div className="stat-row"><span className="stat-name">FC Max</span><span className="stat-val">{activity.max_heartrate} bpm</span></div>}
                        {activity.average_cadence && <div className="stat-row"><span className="stat-name">Cadence moy.</span><span className="stat-val">{Math.round(activity.average_cadence * 2)} spm</span></div>}
                        {activity.average_watts && <div className="stat-row"><span className="stat-name">Puissance moy.</span><span className="stat-val">{Math.round(activity.average_watts)} W</span></div>}
                        {activity.suffer_score && (
                            <div className="suffer-score-container">
                                <div className="suffer-score-header">
                                    <span className="stat-name">Suffer Score (Intensité)</span>
                                    <span className="stat-val">{activity.suffer_score}</span>
                                </div>
                                <div className="suffer-score-bar-bg">
                                    <div
                                        className="suffer-score-bar-fill"
                                        style={{
                                            width: `${Math.min((activity.suffer_score / 200) * 100, 100)}%`,
                                            backgroundColor: activity.suffer_score > 150 ? '#E71D36' : activity.suffer_score > 80 ? '#FF9F1C' : '#2EC4B6'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {activity.splits_metric && activity.splits_metric.length > 0 && (
                <div className="stats-grid" style={{ marginTop: '20px' }}>
                    <div className="stat-section full-width">
                        <h2 className="section-title">Temps intermédiaires</h2>
                        <div className="table-responsive">
                            <table className="splits-table">
                                <thead>
                                <tr>
                                    <th>Km</th>
                                    <th>Allure</th>
                                    <th>Dénivelé</th>
                                    <th>FC Moyenne</th>
                                </tr>
                                </thead>
                                <tbody>
                                {activity.splits_metric.map((split, index) => (
                                    <tr key={index}>
                                        <td>{split.split}</td>
                                        <td><strong>{getPaceStr(split.average_speed)}</strong> /km</td>
                                        <td style={{ color: split.elevation_difference > 0 ? '#E71D36' : (split.elevation_difference < 0 ? '#2EC4B6' : 'inherit') }}>
                                            {split.elevation_difference > 0 ? '+' : ''}{Math.round(split.elevation_difference)}m
                                        </td>
                                        <td>{split.average_heartrate ? `${Math.round(split.average_heartrate)} bpm` : '-'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activity.segment_efforts && activity.segment_efforts.length > 0 && (
                <div className="stats-grid" style={{ marginTop: '20px' }}>
                    <div className="stat-section full-width">
                        <h2 className="section-title">Segments Strava ({activity.segment_efforts.length})</h2>
                        <ul className="segments-list">
                            {activity.segment_efforts.map((effort) => (
                                <li key={effort.id} className="segment-item">
                                    <div className="segment-info">
                                        <span className="segment-name">{effort.name}</span>
                                        <span className="segment-dist">{(effort.distance / 1000).toFixed(2)} km</span>
                                    </div>
                                    <div className="segment-stats">
                                        <span className="segment-time">{formatTime(effort.moving_time)}</span>
                                        {effort.pr_rank && <span className="segment-pr">🏆 PR ({effort.pr_rank}e)</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <AIAnalysis activity={activity} />

            {chartData.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#1a1919', borderLeft: '5px solid #FC4C02', paddingLeft: '15px' }}>Analyse</h2>

                    <ActivityChart title="Profil d'altitude" data={chartData} dataKey="altitude" color="#383838" yAxisLabel="m" />

                    <ActivityChart
                        title="Allure"
                        data={chartData}
                        dataKey="pace"
                        color="#0074D9"
                        yAxisLabel="/km"
                        tooltipFormatter={paceTooltipFormatter}
                    />

                    <ActivityChart title="Fréquence Cardiaque" data={chartData} dataKey="heartrate" color="#E71D36" yAxisLabel="bpm" />
                    <ActivityChart title="Cadence" data={chartData} dataKey="cadence" color="#FF9F1C" yAxisLabel="spm" />
                    <ActivityChart title="Puissance" data={chartData} dataKey="watts" color="#8A2BE2" yAxisLabel="Watts" />
                </div>
            )}
        </div>
    );
}