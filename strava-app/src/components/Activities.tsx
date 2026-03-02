import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { StravaActivitySummary, StravaAthlete, StravaAthleteStats } from '../types/strava';
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
    const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
    const [stats, setStats] = useState<StravaAthleteStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    // Fonction pour gérer la déconnexion et virer le mode démo
    const handleLogout = () => {
        localStorage.removeItem('demo_mode');
        localStorage.removeItem('strava_access_token');
        navigate('/');
    };

    useEffect(() => {
        const fetchData = async () => {
            const isDemo = localStorage.getItem('demo_mode') === 'true';

            // --- BRANCHE 1 : MODE DÉMO (AVEC LE GPX) ---
            // --- BRANCHE 1 : MODE DÉMO (MULTI-GPX) ---
            if (isDemo) {
                try {
                    setAthlete({
                        id: 999999,
                        firstname: "Jury",
                        lastname: "Expert",
                        profile: "https://ui-avatars.com/api/?name=Jury+Expert&background=FC4C02&color=fff&size=128&rounded=true&bold=true"
                    } as any);

                    setStats({
                        ytd_run_totals: { distance: 284500 }
                    } as any);

                    const { parseGpxForDemo } = await import('../utils/gpxParser');

                    // 1. Tu listes tes fichiers ici avec un ID unique pour chacun
                    const demoFiles = [
                        { url: '/demo1.gpx', id: '1' },
                        { url: '/demo2.gpx', id: '2' },
                        { url: '/demo3.gpx', id: '3' }
                    ];

                    // 2. On parse tous les fichiers en même temps
                    const parsedResults = await Promise.all(
                        demoFiles.map(file => parseGpxForDemo(file.url, file.id))
                    );

                    // 3. On extrait la partie "activity" et on met à jour le state
                    const demoActivities = parsedResults.map(res => res.activity);

                    // Petit bonus : on les trie de la plus récente à la plus ancienne
                    demoActivities.sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

                    setActivities(demoActivities as any);

                } catch (error) {
                    console.error("Erreur de chargement des GPX pour la démo", error);
                } finally {
                    setLoading(false);
                }
                return;
            }

            // --- BRANCHE 2 : VRAIE CONNEXION STRAVA ---
            const token = localStorage.getItem('strava_access_token');
            if (!token) {
                navigate('/');
                return; // FIN DE L'EXÉCUTION SI PAS DE TOKEN
            }

            try {
                const athleteRes = await axios.get('https://www.strava.com/api/v3/athlete', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAthlete(athleteRes.data);

                const [statsRes, activitiesRes] = await Promise.all([
                    axios.get(`https://www.strava.com/api/v3/athletes/${athleteRes.data.id}/stats`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('https://www.strava.com/api/v3/athlete/activities', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { per_page: 100 }
                    })
                ]);

                setStats(statsRes.data);

                const runsOnly = activitiesRes.data.filter((act: StravaActivitySummary) => act.type === 'Run');
                setActivities(runsOnly);

            } catch (error) {
                console.error("Erreur de récupération", error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const weeklyData = useMemo(() => {
        const weeklyMap = new Map<string, number>();

        activities.forEach(run => {
            const date = parseISO(run.start_date);
            const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            weeklyMap.set(weekStart, (weeklyMap.get(weekStart) || 0) + (run.distance / 1000));
        });

        return Array.from(weeklyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)
            .map(([dateStr, distance]) => ({
                week: format(parseISO(dateStr), 'dd/MM'), // Ex: "16/02"
                km: Number(distance.toFixed(1))
            }));
    }, [activities]);


    if (loading) return <div className="loader">Chargement de ton profil...</div>;

    return (
        <div className="activities-page">

            <aside className="profile-sidebar">
                {athlete && (
                    <div className="profile-header">
                        <img src={athlete.profile} alt="Profil" className="profile-pic"/>
                        <h2 className="profile-name">{athlete.firstname} {athlete.lastname}</h2>
                    </div>
                )}

                {stats && (
                    <div className="profile-stat-box">
                        <div className="profile-stat-val">
                            {Math.round(stats.ytd_run_totals.distance / 1000)}
                        </div>
                        <span className="profile-stat-label">km parcourus cette année</span>
                    </div>
                )}

                {weeklyData.length > 0 && (
                    <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px'}}>
                        <h3 className="chart-title">Dernières semaines</h3>
                        <div style={{width: '100%', height: 180}}>
                            <ResponsiveContainer>
                                <BarChart data={weeklyData} margin={{top: 10, right: 0, left: -25, bottom: 0}}>
                                    <XAxis dataKey="week" tick={{fontSize: 11}} tickLine={false} axisLine={false}/>
                                    <Tooltip
                                        cursor={{fill: '#f5f5f5'}}
                                        formatter={(value: any) => [`${value} km`, 'Distance']}
                                        labelStyle={{color: '#242428', fontWeight: 'bold'}}
                                    />
                                    <Bar dataKey="km" fill="#FC4C02" radius={[4, 4, 0, 0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '25px'}}>
                    <Link to="/bannister" className="bannister-link-btn" style={{marginTop: 0}}>
                        📊 Modèle de Bannister (TRIMP)
                    </Link>
                    <Link to="/bannister-tss" className="bannister-link-btn" style={{marginTop: 0}}>
                        ⚡ Modèle de Bannister (TSS)
                    </Link>
                    {/* Bouton de déconnexion ajouté ici */}
                    <button
                        onClick={handleLogout}
                        className="bannister-link-btn"
                        style={{ marginTop: '10px', border: 'none', cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white' }}
                    >
                        🚪 Déconnexion
                    </button>
                </div>
            </aside>

            <main>
                <div className="gpx-header-action" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <h1 className="page-title" style={{marginBottom: 0}}>Mes Séances ({activities.length})</h1>
                    <Link to="/gpx-analyzer" className="gpx-analyze-btn" style={{textDecoration: 'none'}}>
                        📈 Analyse du GPX
                    </Link>
                </div>

                <div className="activities-grid">
                    {activities.map((activity) => (
                        <Link to={`/activities/${activity.id}`} key={activity.id} style={{textDecoration: 'none'}}>
                            <div className="activity-card">

                                {activity.map?.summary_polyline ? (
                                    <ActivityMap summaryPolyline={activity.map.summary_polyline} />
                                ) : (
                                    <div style={{ height: '150px', backgroundColor: '#e2e2e2' }} />
                                )}

                                <div className="activity-content">
                                    <div className="activity-header">
                                        <div className="activity-avatar">{activity.type.charAt(0)}</div>
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
                                            <span className="stat-label">Dénivelé</span>
                                            <span className="stat-value">{Math.round(activity.total_elevation_gain)} m</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>

        </div>
    );
}