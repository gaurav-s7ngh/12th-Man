import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";

export interface RadarDataPoint {
  subject: string;
  playerA: number;
  playerB?: number;
  fullMark?: number;
}

interface RadarComparisonChartProps {
  data: RadarDataPoint[];
  playerAName?: string;
  playerBName?: string;
  className?: string;
}

export const RadarComparisonChart: React.FC<RadarComparisonChartProps> = ({
  data,
  playerAName = "Player A",
  playerBName = "Player B",
  className,
}) => {
  const hasPlayerB = data.some((d) => d.playerB !== undefined);

  return (
    <div className={`w-full aspect-square max-h-80 select-none ${className || ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#1D3025" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#87958B", fontSize: 10, fontFamily: "monospace" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "#87958B", fontSize: 9 }}
            stroke="#1D3025"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0D1C15",
              borderColor: "#1D3025",
              color: "#E8EDE9",
              fontFamily: "monospace",
              fontSize: "11px",
              borderRadius: "4px",
            }}
          />
          <Radar
            name={playerAName}
            dataKey="playerA"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.4}
          />
          {hasPlayerB && (
            <Radar
              name={playerBName}
              dataKey="playerB"
              stroke="#38BDF8"
              fill="#38BDF8"
              fillOpacity={0.3}
            />
          )}
          {hasPlayerB && (
            <Legend
              wrapperStyle={{
                fontFamily: "monospace",
                fontSize: "11px",
                paddingTop: "8px",
              }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
