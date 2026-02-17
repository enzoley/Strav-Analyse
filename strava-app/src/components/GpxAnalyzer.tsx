import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './GpxAnalyzer.css';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

class KalmanFilter1D {
    R: number; Q: number; P: number; X: number; K: number;
    constructor(R = 2, Q = 0.5) { // Paramétrage UTMB / Montagne
        this.R = R; this.Q = Q; this.P = 1; this.X = NaN; this.K = 0;
    }
    filter(measurement: number) {
        if (isNaN(this.X)) this.X = measurement;
        else {
            this.P = this.P + this.Q;
            this.K = this.P / (this.P + this.R);
            this.X = this.X + this.K * (measurement - this.X);
            this.P = (1 - this.K) * this.P;
        }
        return this.X;
    }
}

const calculateStravaGAPFactor = (percentGrad: number) => {
    const g = Math.max(-30, Math.min(30, percentGrad));

    const a = -5.96892723e-10;
    const b = -3.66663630e-07;
    const c = -1.66779606e-06;
    const d = 1.82471254e-03;
    const e = 3.01350192e-02;
    const f = 9.97584372e-01;

    return a * Math.pow(g, 5) + b * Math.pow(g, 4) + c * Math.pow(g, 3) + d * Math.pow(g, 2) + e * g + f;
};

const formatPace = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return "-:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface GpxSplit {
    km: number;
    actualPace: string;
    gapPace: string;
}

interface AnalysisResult {
    splits: GpxSplit[];
    flatPercent: string;
    climbPercent: string;
    downhillPercent: string;
}

export default function GpxAnalyzer() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            analyzeGpx(text);
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const analyzeGpx = (xmlString: string) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const trkpts = xmlDoc.getElementsByTagName("trkpt");

        if (trkpts.length < 2) {
            alert("Le fichier GPX ne contient pas assez de données spatio-temporelles.");
            setLoading(false);
            return;
        }

        let totalDistance = 0;
        let distFlat = 0;
        let distClimb = 0;
        let distDown = 0;

        const splits: GpxSplit[] = [];
        let cumulativeTime = 0;
        let cumulativeGapDist = 0;
        let nextKmTarget = 1000;
        let splitStartTime = 0;
        let splitStartGapDist = 0;

        const kalman = new KalmanFilter1D(2, 0.5);
        let previousSmoothedEle = kalman.filter(parseFloat(trkpts[0].getElementsByTagName("ele")[0]?.textContent || "0"));

        for (let i = 1; i < trkpts.length; i++) {
            const lat = parseFloat(trkpts[i].getAttribute("lat") || "0");
            const lon = parseFloat(trkpts[i].getAttribute("lon") || "0");
            const prevLat = parseFloat(trkpts[i-1].getAttribute("lat") || "0");
            const prevLon = parseFloat(trkpts[i-1].getAttribute("lon") || "0");

            const timeStr = trkpts[i].getElementsByTagName("time")[0]?.textContent;
            const prevTimeStr = trkpts[i-1].getElementsByTagName("time")[0]?.textContent;

            let deltaTime = 1;
            if (timeStr && prevTimeStr) {
                deltaTime = (new Date(timeStr).getTime() - new Date(prevTimeStr).getTime()) / 1000;
            }

            const rawEle = parseFloat(trkpts[i].getElementsByTagName("ele")[0]?.textContent || "0");
            const smoothedEle = kalman.filter(rawEle);
            const deltaEle = smoothedEle - previousSmoothedEle;
            const dist = calculateDistance(prevLat, prevLon, lat, lon);

            if (dist > 0.5) {
                const gradient = deltaEle / dist;
                const percentGrad = gradient * 100;
                if (percentGrad > 2) distClimb += dist;
                else if (percentGrad < -2) distDown += dist;
                else distFlat += dist;

                const normalizedEffortRatio = calculateStravaGAPFactor(percentGrad);

                cumulativeTime += Math.max(0.1, deltaTime);
                cumulativeGapDist += dist * normalizedEffortRatio;
                totalDistance += dist;

                if (totalDistance >= nextKmTarget) {
                    const splitTime = cumulativeTime - splitStartTime;
                    const splitGapDist = cumulativeGapDist - splitStartGapDist;

                    const actualPaceSecs = splitTime;
                    const gapPaceSecs = splitTime / (splitGapDist / 1000);

                    splits.push({
                        km: nextKmTarget / 1000,
                        actualPace: formatPace(actualPaceSecs),
                        gapPace: formatPace(gapPaceSecs)
                    });

                    nextKmTarget += 1000;
                    splitStartTime = cumulativeTime;
                    splitStartGapDist = cumulativeGapDist;
                }
            }

            previousSmoothedEle = smoothedEle;
        }

        setResult({
            splits,
            flatPercent: ((distFlat / totalDistance) * 100).toFixed(1),
            climbPercent: ((distClimb / totalDistance) * 100).toFixed(1),
            downhillPercent: ((distDown / totalDistance) * 100).toFixed(1)
        });
        setLoading(false);
    };

    return (
        <div className="gpx-page-container">
            <Link to="/activities" style={{ color: '#FC4C02', textDecoration: 'none', fontWeight: 'bold' }}>← Retour au profil</Link>

            <h1 style={{ marginTop: '20px', color: '#1a1919' }}>Analyse GPX</h1>

            <div className="gpx-upload-box">
                <p style={{ color: '#6d6d78', marginBottom: '20px', fontSize: '1.1rem' }}>
                    Traitement algorithmique (Minetti GAP) : Vitesse réelle vs Allure ajustée à la pente par kilomètre.
                </p>
                <input
                    type="file"
                    accept=".gpx"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <button className="gpx-analyze-btn" onClick={() => fileInputRef.current?.click()}>
                    {loading ? 'Calcul des splits en cours...' : '📁 Choisir un fichier GPX'}
                </button>
            </div>

            {result && (
                <div className="gpx-results-card">

                    <h2 style={{ marginBottom: '15px' }}>Allure Ajustée (GAP) par Km</h2>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '30px', border: '1px solid #eee', borderRadius: '8px' }}>
                        <table className="gpx-splits-table">
                            <thead>
                            <tr style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                                <th>Km</th>
                                <th>Allure brute</th>
                                <th>Allure ajustée (Effort)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {result.splits.map((split) => (
                                <tr key={split.km}>
                                    <td><strong>{split.km}</strong></td>
                                    <td>{split.actualPace} /km</td>
                                    <td style={{ color: '#FC4C02', fontWeight: 'bold' }}>{split.gapPace} /km</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <h3 style={{ color: '#6d6d78', marginTop: '30px' }}>Topologie du terrain</h3>
                    <div className="gpx-stat-row">
                        <strong>Terrain roulant :</strong> <span>{result.flatPercent} %</span>
                    </div>
                    <div className="gpx-stat-row">
                        <strong>Montée (&gt; 2%) :</strong> <span style={{color: '#E71D36'}}>{result.climbPercent} %</span>
                    </div>
                    <div className="gpx-stat-row">
                        <strong>Descente (&lt; -2%) :</strong> <span style={{color: '#2EC4B6'}}>{result.downhillPercent} %</span>
                    </div>
                </div>
            )}
        </div>
    );
}