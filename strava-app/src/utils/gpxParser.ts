// src/utils/gpxParser.ts
import polyline from '@mapbox/polyline';
import { ChartDataPoint } from '../types/strava';

// Formule de Haversine pour la distance entre deux coordonnées
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const parseGpxForDemo = async (gpxUrl: string, activityId: string) => {
    const response = await fetch(gpxUrl);
    const gpxText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(gpxText, "text/xml");

    const trkpts = Array.from(xml.querySelectorAll('trkpt'));
    if (!trkpts.length) throw new Error("GPX vide ou invalide");

    let totalDistKm = 0;
    let totalElev = 0;
    const chartData: ChartDataPoint[] = [];
    const path: [number, number][] = [];

    const startTime = new Date(trkpts[0].querySelector('time')?.textContent || '').getTime();
    let lastTime = startTime;
    let hrSum = 0, hrCount = 0;

    trkpts.forEach((pt, i) => {
        const lat = parseFloat(pt.getAttribute('lat') || '0');
        const lon = parseFloat(pt.getAttribute('lon') || '0');
        const ele = parseFloat(pt.querySelector('ele')?.textContent || '0');
        const timeStr = pt.querySelector('time')?.textContent;
        const time = timeStr ? new Date(timeStr).getTime() : lastTime;

        // Extraction Cardio & Cadence (souvent dans les balises <gpxtpx:TrackPointExtension>)
        const hrNode = pt.getElementsByTagNameNS('*', 'hr')[0];
        const hr = hrNode ? parseInt(hrNode.textContent || '0') : null;
        if (hr) { hrSum += hr; hrCount++; }

        const cadNode = pt.getElementsByTagNameNS('*', 'cad')[0];
        const cad = cadNode ? parseInt(cadNode.textContent || '0') : null;

        if (i > 0) {
            const prevPt = trkpts[i - 1];
            const prevLat = parseFloat(prevPt.getAttribute('lat') || '0');
            const prevLon = parseFloat(prevPt.getAttribute('lon') || '0');
            totalDistKm += getDistanceKm(prevLat, prevLon, lat, lon);

            const prevEle = parseFloat(prevPt.querySelector('ele')?.textContent || '0');
            if (ele > prevEle) totalElev += (ele - prevEle);
        }

        // Calcul de l'allure (min/km)
        let pace = null;
        if (i > 0 && time > lastTime) {
            const timeDiffH = (time - lastTime) / 3600000;
            const distDiffKm = totalDistKm - (chartData[i-1]?.distanceKm || 0);
            if (distDiffKm > 0) {
                const speed = distDiffKm / timeDiffH;
                pace = speed > 0 ? 60 / speed : null;
            }
        }

        chartData.push({
            distanceKm: totalDistKm,
            altitude: ele,
            heartrate: hr,
            cadence: cad,
            watts: null,
            pace: pace && pace < 15 ? pace : null // Ignore les grosses pauses de plus de 15min/km
        });

        path.push([lat, lon]);
        lastTime = time;
    });

    const totalTimeSec = (lastTime - startTime) / 1000;
    const avgSpeedMs = (totalDistKm * 1000) / totalTimeSec;

    return {
        activity: {
            id: parseInt(activityId),
            name: "Analyse avancée depuis GPX 🛰️",
            type: "Run",
            start_date: new Date(startTime).toISOString(),
            distance: totalDistKm * 1000,
            moving_time: totalTimeSec,
            total_elevation_gain: Math.round(totalElev),
            average_speed: avgSpeedMs,
            max_speed: avgSpeedMs * 1.5,
            average_heartrate: hrCount ? Math.round(hrSum / hrCount) : null,
            map: { summary_polyline: polyline.encode(path) } // On réutilise mapbox/polyline pour la carte
        },
        chartData
    };
};