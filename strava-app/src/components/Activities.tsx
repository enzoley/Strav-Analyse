// src/components/Activities.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StravaActivitySummary } from '../types/strava';
import ActivityMap from './ActivityMap';
import './Activities.css';

const formatMovingTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}m`;
};

export default function Activities() {
    const [activities, setActivities] = useState<StravaActivitySummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchActivities = async () => {
            const token = localStorage.getItem('strava_access_token');

            if (!token) {
                navigate('/');
                return;
            }

            try {
                const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { per_page: 50 }
                });

                const allActivities = response.data;

                const runsOnly = allActivities.filter(
                    (activity: StravaActivitySummary) => activity.type === 'Run'
                );

                setActivities(runsOnly);
            } catch (error) {
                console.error("Erreur lors de la récupération des activités", error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [navigate]);

    if (loading) return <div className="loader">Chargement de tes exploits...</div>;

    return (
        <div className="activities-container">
            <h1 className="page-title">Mes Activités</h1>

            <div className="activities-grid">
                {activities.map((activity) => (
                    <Link
                        to={`/activities/${activity.id}`}
                        key={activity.id}
                        style={{ textDecoration: 'none' }}
                    >
                        <div className="activity-card">

                            {activity.map?.summary_polyline ? (
                                <ActivityMap summaryPolyline={activity.map.summary_polyline} />
                            ) : (
                                <div style={{ height: '150px', backgroundColor: '#e2e2e2' }} />
                            )}
                            <div className="activity-content">

                                <div className="activity-header">
                                    <div className="activity-avatar">
                                        {activity.type.charAt(0)}
                                    </div>
                                    <div className="activity-title-group">
                                        <h3 className="activity-name">{activity.name}</h3>
                                        <p className="activity-date">
                                            {format(parseISO(activity.start_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                        </p>
                                    </div>
                                </div>

                                <div className="activity-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Distance</span>
                                        <span className="stat-value">{(activity.distance / 1000).toFixed(2)} km</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Temps</span>
                                        <span className="stat-value">{formatMovingTime(activity.moving_time)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Type</span>
                                        <span className="stat-value">{activity.type}</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}