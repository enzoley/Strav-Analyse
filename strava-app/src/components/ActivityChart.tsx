import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ChartDataPoint } from '../types/strava';

interface ActivityChartProps {
    title: string;
    data: ChartDataPoint[];
    dataKey: keyof ChartDataPoint;
    color: string;
    yAxisLabel: string;
    tooltipFormatter?: (value: number) => [string, string];
}

export default function ActivityChart({ title, data, dataKey, color, yAxisLabel, tooltipFormatter }: ActivityChartProps) {
    const hasData = data.some(point => point[dataKey] !== null && point[dataKey] !== undefined);
    if (!hasData) return null;

    const defaultFormatter = (value: number) => [`${value} ${yAxisLabel}`, title];
    const formatter = tooltipFormatter || defaultFormatter;

    return (
        <div className="stat-section" style={{ marginTop: '30px' }}>
            <h2 className="section-title">{title}</h2>
            <div style={{ width: '100%', height: 300, fontSize: '12px' }}>
                <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis
                            dataKey="distanceKm"
                            tickFormatter={(val) => `${val.toFixed(1)} km`}
                            label={{ value: 'Distance (km)', position: 'insideBottomRight', offset: -5 }}
                            minTickGap={50}
                        />
                        <YAxis
                            domain={['auto', 'auto']} // L'échelle s'adapte automatiquement aux données
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            width={60}
                        />
                        <Tooltip
                            formatter={formatter as any}
                            labelFormatter={(val) => `Distance : ${Number(val).toFixed(2)} km`}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                            name={title}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}