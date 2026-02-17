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
    R: number; // Bruit de mesure (Incertitude du capteur GPS/Baro)
    Q: number; // Bruit de processus (Variabilité réelle du terrain)
    P: number; // Erreur d'estimation
    X: number; // Valeur estimée (Altitude)
    K: number; // Gain de Kalman

    constructor(R = 10, Q = 0.1) {
        this.R = R;
        this.Q = Q;
        this.P = 1;
        this.X = NaN;
        this.K = 0;
    }

    filter(measurement: number) {
        if (isNaN(this.X)) {
            this.X = measurement;
        } else {
            this.P = this.P + this.Q;
            this.K = this.P / (this.P + this.R);
            this.X = this.X + this.K * (measurement - this.X);
            this.P = (1 - this.K) * this.P;
        }
        return this.X;
    }
}

const calculateMinettiCost = (i: number) => {
    const grad = Math.max(-0.45, Math.min(0.45, i));
    const cost = 155.4 * Math.pow(grad, 5) - 30.4 * Math.pow(grad, 4) - 43.3 * Math.pow(grad, 3) + 46.3 * Math.pow(grad, 2) + 19.5 * grad + 3.6;
    return cost;
};

interface AnalysisResult {
    distanceKm: string;
    gapDistanceKm: string;
    elevationGain: number;
    flatPercent: string;
    climbPercent: string;
    downhillPercent: string;
    technicalityIndex: string; // Heuristique de technicité
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
        let totalEnergyCost = 0;
        let dPlus = 0;
        let distFlat = 0;
        let distClimb = 0;
        let distDown = 0;

        const speeds: number[] = [];
        const timestamps: number[] = [];
        const kalman = new KalmanFilter1D(15, 0.05);
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
                timestamps.push(deltaTime);
            }

            const rawEle = parseFloat(trkpts[i].getElementsByTagName("ele")[0]?.textContent || "0");
            const smoothedEle = kalman.filter(rawEle);

            const deltaEle = smoothedEle - previousSmoothedEle;
            const dist = calculateDistance(prevLat, prevLon, lat, lon);

            if (dist > 0.5) {
                totalDistance += dist;
                const speed = dist / Math.max(0.1, deltaTime);
                speeds.push(speed);

                if (deltaEle > 0.3) dPlus += deltaEle;

                const gradient = deltaEle / dist;
                const percentGrad = gradient * 100;

                if (percentGrad > 2) distClimb += dist;
                else if (percentGrad < -2) distDown += dist;
                else distFlat += dist;

                const costCw = calculateMinettiCost(gradient);
                const normalizedEffortRatio = costCw / 3.6;
                totalEnergyCost += dist * normalizedEffortRatio;
            }

            previousSmoothedEle = smoothedEle;
        }

        let speedVariance = 0;
        if (speeds.length > 0) {
            const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
            const sumSquaredDiff = speeds.reduce((acc, val) => acc + Math.pow(val - avgSpeed, 2), 0);
            speedVariance = sumSquaredDiff / speeds.length;
        }

        const techIndex = Math.min(100, Math.max(0, (speedVariance * 15)));

        setResult({
            distanceKm: (totalDistance / 1000).toFixed(2),
            gapDistanceKm: (totalEnergyCost / 1000).toFixed(2),
            elevationGain: Math.round(dPlus),
            flatPercent: ((distFlat / totalDistance) * 100).toFixed(1),
            climbPercent: ((distClimb / totalDistance) * 100).toFixed(1),
            downhillPercent: ((distDown / totalDistance) * 100).toFixed(1),
            technicalityIndex: techIndex.toFixed(0)
        });
        setLoading(false);
    };

    return (
        <div className="gpx-page-container">
            <Link to="/activities" style={{ color: '#FC4C02', textDecoration: 'none', fontWeight: 'bold' }}>← Retour au profil</Link>

            <h1 style={{ marginTop: '20px', color: '#1a1919' }}>Analyse GPX</h1>

            <div className="gpx-upload-box">
                <p style={{ color: '#6d6d78', marginBottom: '20px', fontSize: '1.1rem' }}>
                    Traitement algorithmique : Filtre de Kalman 1D, Polynôme de Minetti (GAP) et heuristique de technicité.
                </p>
                <input
                    type="file"
                    accept=".gpx"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <button className="gpx-analyze-btn" onClick={() => fileInputRef.current?.click()}>
                    {loading ? 'Traitement algorithmique...' : '📁 Choisir un fichier GPX'}
                </button>
            </div>

            {result && (
                <div className="gpx-results-card">
                    <h2>Modélisation Physiologique</h2>

                    <div className="gpx-stat-row">
                        <strong>Distance Mesurée :</strong> <span>{result.distanceKm} km</span>
                    </div>
                    <div className="gpx-stat-row">
                        <strong>Distance d'Effort (GAP Minetti) :</strong> <span style={{color: '#FC4C02', fontWeight: 'bold'}}>{result.gapDistanceKm} km</span>
                    </div>
                    <div className="gpx-stat-row">
                        <strong>Dénivelé positif (Kalman Filter) :</strong> <span>+{result.elevationGain} m</span>
                    </div>
                    <div className="gpx-stat-row">
                        <strong>Indice de Technicité (Variance) :</strong> <span>{result.technicalityIndex} / 100</span>
                    </div>

                    <h3 style={{ marginTop: '30px', color: '#6d6d78' }}>Topologie du terrain</h3>
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