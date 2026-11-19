import { useState } from 'react';
import type { ResultRow } from '../lib/types';
import { fmtNum } from '../lib/format';

/** Thang trục "đẹp": 0, bước tròn */
function niceMax(v: number): { max: number; step: number } {
  if (v <= 0) return { max: 1, step: 1 };
  const raw = v / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(v / step) * step, step };
}

/** Biểu đồ cột một chuỗi — tiêu đề biểu đồ đã nói rõ đại lượng nên không cần chú giải */
export function BarChart({ rows, unit }: { rows: ResultRow[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 300;
  const pad = { l: 48, r: 12, t: 24, b: 56 };
  const { max, step } = niceMax(Math.max(...rows.map((r) => r.value), 0));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const band = iw / Math.max(rows.length, 1);
  const bw = Math.min(40, band * 0.6);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const r = 4;

  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Biểu đồ cột, đơn vị ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e3e7ee" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#646d7c">{fmtNum(t, 1)}</text>
          </g>
        ))}
        {rows.map((row, i) => {
          const cx = pad.l + band * i + band / 2;
          const top = y(row.value);
          const h = pad.t + ih - top;
          const x = cx - bw / 2;
          const rr = Math.min(r, h);
          const path = h > 0
            ? `M${x},${pad.t + ih} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + bw - rr} Q${x + bw},${top} ${x + bw},${top + rr} V${pad.t + ih} Z`
            : '';
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
              {path && <path d={path} fill={hover === null || hover === i ? '#1b2a4a' : '#8593ad'} />}
              <text x={cx} y={top - 6} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#1a1f2b">{fmtNum(row.value, 2)}</text>
              <foreignObject x={pad.l + band * i + 2} y={pad.t + ih + 6} width={band - 4} height={pad.b - 6}>
                <div style={{ fontSize: 11.5, lineHeight: 1.25, textAlign: 'center', color: '#3c4555', overflowWrap: 'anywhere' }}>{row.label}</div>
              </foreignObject>
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#c5cdd8" strokeWidth={1} />
        <text x={pad.l} y={12} fontSize="12" fill="#646d7c">{unit}</text>
      </svg>
      {hover !== null && rows[hover] && (
        <div className="tip" style={{ left: `${((pad.l + band * hover + band / 2) / W) * 100}%`, top: `${(y(rows[hover].value) / H) * 100}%` }}>
          {rows[hover].label}: <b>{fmtNum(rows[hover].value, 2)}</b> {unit}
          {rows[hover].note ? ` · ${rows[hover].note}` : ''}
        </div>
      )}
    </div>
  );
}

/** Tỷ lệ giá trị/tổng cho từng chỉ báo — mỗi chỉ báo có mẫu số riêng, hiển thị rõ n */
export function ProportionChart({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="prop">
      {rows.map((r, i) => {
        const pct = r.total ? (r.value / r.total) * 100 : 0;
        return (
          <div className="prop-row" key={i} title={`${r.label}: ${r.value}/${r.total ?? '?'} (${fmtNum(pct, 1)}%)`}>
            <div className="pr-top">
              <span>{r.label}</span>
              <span className="pr-val">{fmtNum(pct, 1)}% <span className="muted small">({fmtNum(r.value)}/{fmtNum(r.total ?? 0)})</span></span>
            </div>
            <div className="prop-track" role="presentation"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function DataTable({ rows, unit, proportion }: { rows: ResultRow[]; unit: string; proportion?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            <th>Chỉ báo / nhóm</th>
            <th className="num">Giá trị ({unit})</th>
            {proportion && <th className="num">Tổng (n)</th>}
            {proportion && <th className="num">Tỷ lệ</th>}
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.label}</td>
              <td className="num">{fmtNum(r.value, 2)}</td>
              {proportion && <td className="num">{r.total != null ? fmtNum(r.total) : '—'}</td>}
              {proportion && <td className="num">{r.total ? `${fmtNum((r.value / r.total) * 100, 1)}%` : '—'}</td>}
              <td>{r.note || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
