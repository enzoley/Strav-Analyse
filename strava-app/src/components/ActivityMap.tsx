// src/components/ActivityMap.tsx
import { useEffect } from 'react';
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'; // <-- Ajout de TileLayer ici
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';

interface ActivityMapProps {
    summaryPolyline: string;
}

const MapBounds = ({ positions }: { positions: [number, number][] }) => {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            map.fitBounds(positions, { padding: [10, 10] });
        }
    }, [map, positions]);
    return null;
};

export default function ActivityMap({ summaryPolyline }: ActivityMapProps) {
    const decodedPath = polyline.decode(summaryPolyline) as [number, number][];

    if (decodedPath.length === 0) {
        return <div style={{ height: '150px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Aucun tracé GPS</div>;
    }

    return (
        <MapContainer
            center={decodedPath[0]}
            zoom={13}
            style={{ height: '150px', width: '100%', borderRadius: '8px 8px 0 0' }}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Polyline positions={decodedPath} color="#FC4C02" weight={3} />
            <MapBounds positions={decodedPath} />
        </MapContainer>
    );
}