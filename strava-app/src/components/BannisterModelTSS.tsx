import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { StravaActivitySummary } from '../types/strava';
import './BannisterModel.css';

const CTL_DAYS = 42;
const ATL_DAYS = 7;
const ctlAlpha = 1 - Math.exp(-1 / CTL_DAYS);
const atlAlpha = 1 - Math.exp(-1 / ATL_DAYS);

const THRESHOLD_HR = 165;
const THRESHOLD_SPEED = 3.45;

const calculateTSS = (activity: StravaActivitySummary) => {
    const durationHours = activity.moving_time / 3600;

    if (activity.average_heartrate) {
        const IF_hr = activity.average_heartrate / THRESHOLD_HR;
        return Math.round((durationHours * Math.pow(IF_hr, 2)) * 100);
    }

    const IF_pace = activity.average_speed / THRESHOLD_SPEED;
    return Math.round((durationHours * Math.pow(IF_pace, 2)) * 100);
};

export default function BannisterModelTSS() {
    const [activities, setActivities] = useState<StravaActivitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const isDemo = localStorage.getItem('demo_mode') === 'true';

            // --- BRANCHE 1 : MODE DÉMO (GPX) ---
            if (isDemo) {
                try {
                    const { parseGpxForDemo } = await import('../utils/gpxParser');

                    // Ta fameuse liste de fichiers démo
                    const demoFiles = [
                        { url: '/demo1.gpx', id: '1' },
                        { url: '/demo2.gpx', id: '2' },
                        { url: '/demo3.gpx', id: '3' }
                    ];

                    // On mouline tout en parallèle
                    const parsedResults = await Promise.all(
                        demoFiles.map(file => parseGpxForDemo(file.url, file.id))
                    );

                    const demoActivities = parsedResults.map(res => res.activity);

                    // Tri chronologique indispensable pour que tes courbes TSS/CTL/ATL aient du sens
                    demoActivities.sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

                    setActivities(demoActivities as any);
                } catch (error) {
                    console.error("Erreur de chargement des GPX pour le modèle TSS", error);
                } finally {
                    setLoading(false);
                }
                return; // FIN DE LA DÉMO
            }

            // --- BRANCHE 2 : VRAIE CONNEXION STRAVA ---
            const token = localStorage.getItem('strava_access_token');
            if (!token) { navigate('/'); return; }

            try {
                const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { per_page: 200 } // On tape large pour l'historique
                });
                setActivities(res.data);
            } catch (error) {
                console.error("Erreur de récupération", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const chartData = useMemo(() => {
        if (activities.length === 0) return [];

        const tssByDate = new Map<string, number>();
        activities.forEach(act => {
            const dateStr = format(parseISO(act.start_date), 'yyyy-MM-dd');
            tssByDate.set(dateStr, (tssByDate.get(dateStr) || 0) + calculateTSS(act));
        });

        const today = new Date();
        const startDate = subDays(today, 90);
        const endDate = addDays(today, 14);

        const oldestActivityDate = parseISO(activities[activities.length - 1].start_date);
        const calcStart = oldestActivityDate < startDate ? oldestActivityDate : startDate;

        let currentCTL = 0;
        let currentATL = 0;
        const data = [];

        for (let d = calcStart; d <= endDate; d = addDays(d, 1)) {
            const dateStr = format(d, 'yyyy-MM-dd');
            const dailyTSS = tssByDate.get(dateStr) || 0;

            currentCTL = currentCTL + (dailyTSS - currentCTL) * ctlAlpha;
            currentATL = currentATL + (dailyTSS - currentATL) * atlAlpha;
            const currentTSB = currentCTL - currentATL;

            if (d >= startDate) {
                data.push({
                    dateFormatted: format(d, 'dd MMM', { locale: fr }),
                    ctl: Math.round(currentCTL),
                    atl: Math.round(currentATL),
                    tsb: Math.round(currentTSB)
                });
            }
        }
        return data;
    }, [activities]);

    if (loading) return <div className="loader">Calcul de tes courbes TSS...</div>;

    return (
        <div className="bannister-container">
            <Link to="/activities" style={{ color: '#FC4C02', textDecoration: 'none', fontWeight: 'bold' }}>← Retour au profil</Link>

            <div className="bannister-header" style={{ marginTop: '20px' }}>
                <h1 className="bannister-title">Modèle de Bannister (TSS)</h1>
                <p className="bannister-subtitle">Basé sur le Training Stress Score (1h au seuil = 100 TSS).</p>
            </div>

            <div className="bannister-chart-card">
                <div className="bannister-legend">
                    <div className="legend-item"><div className="color-box" style={{ backgroundColor: '#C87038' }}></div> Niveau (CTL)</div>
                    <div className="legend-item"><div className="color-box" style={{ backgroundColor: '#E29E38' }}></div> Fatigue (ATL)</div>
                    <div className="legend-item"><div className="color-box" style={{ backgroundColor: '#7CB5EC', opacity: 0.5 }}></div> Forme (TSB)</div>
                </div>

                <div style={{ width: '100%', height: 500 }}>
                    <ResponsiveContainer>
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="dateFormatted" minTickGap={40} tick={{ fill: '#6d6d78', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#6d6d78', fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />

                            <ReferenceLine x={format(new Date(), 'dd MMM', { locale: fr })} stroke="#E71D36" strokeDasharray="3 3" label={{ value: "Aujourd'hui", position: 'insideTopLeft', fill: '#E71D36', fontSize: 12 }} />
                            <ReferenceLine y={0} stroke="#ccc" />

                            <Area type="monotone" dataKey="tsb" name="Forme (TSB)" fill="#7CB5EC" stroke="#7CB5EC" fillOpacity={0.2} baseValue={0} />
                            <Line type="monotone" dataKey="atl" name="Fatigue (ATL)" stroke="#E29E38" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="ctl" name="Niveau (CTL)" stroke="#C87038" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}