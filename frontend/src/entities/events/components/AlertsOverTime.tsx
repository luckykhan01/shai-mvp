import React from "react";
import type { Event } from "@/shared/types";

type Props = { data: Event[]; minutes?: number };

export default function AlertsOverTime({ data, minutes = 10 }: Props) {
  const now = Date.now();
  const bins = Array.from({ length: minutes }, (_, i) => {
    const start = now - (minutes - i) * 60_000;
    const end = start + 60_000;
    const count = data.filter(
      (e) => e.score >= 10 && new Date(e.timestamp).getTime() >= start && new Date(e.timestamp).getTime() < end
    ).length;
    return { x: i, y: count };
  });

  const W = 560, H = 160, P = 24;
  const maxY = Math.max(1, ...bins.map(b => b.y));
  const toX = (i: number) => P + (i/(minutes-1))*(W-2*P);
  const toY = (y: number) => H - P - (y/maxY)*(H-2*P);

  const path = bins.map((b,i) => `${i===0?"M":"L"} ${toX(i)} ${toY(b.y)}`).join(" ");

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="muted" style={{ marginBottom: 6 }}>Alerts over time (last {minutes} min)</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Alerts over time">
        <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke="#cbd5e1" />
        <line x1={P} y1={P} x2={P} y2={H-P} stroke="#cbd5e1" />
        <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={2} />
        {bins.map((b,i)=>(
          <circle key={i} cx={toX(i)} cy={toY(b.y)} r={3} fill="#0ea5e9" />
        ))}
        <text x={P+4} y={P+12} fontSize="12" fill="#64748b">max: {maxY}</text>
      </svg>
    </div>
  );
}
