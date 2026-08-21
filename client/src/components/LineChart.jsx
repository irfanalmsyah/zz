import { Box, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from './EmptyState.jsx';

const PAD = { top: 16, right: 20, bottom: 28, left: 44 };
const HEIGHT = 320;
const SURFACE = '#ffffff';
const GRID = '#e1e0d9';
const AXIS_TEXT = '#898781';

function niceStep(span, targetCount) {
  const raw = span / targetCount || 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  if (residual >= 5) return 10 * magnitude;
  if (residual >= 2) return 5 * magnitude;
  if (residual >= 1) return 2 * magnitude;
  return magnitude;
}

function niceTicks(min, max, targetCount = 5) {
  if (min === max) {
    min -= 5;
    max += 5;
  }
  const step = niceStep(max - min, targetCount);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function integerXTicks(xMax, targetCount = 8) {
  if (xMax <= targetCount) return Array.from({ length: xMax }, (_, i) => i + 1);
  const step = Math.ceil(xMax / targetCount);
  const ticks = [];
  for (let v = 1; v <= xMax; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== xMax) ticks.push(xMax);
  return ticks;
}

// series: [{ id, name, color, points: [{ match_number, conservative }] }]
export default function LineChart({ series, yLabel = 'Rating' }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const xMax = Math.max(1, ...series.map((s) => s.points.length));
  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  const { yMin, yMax, yTicks } = useMemo(() => {
    const values = series.flatMap((s) => s.points.map((p) => p.conservative));
    if (values.length === 0) return { yMin: 0, yMax: 1, yTicks: [0, 1] };
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    return { yMin: ticks[0], yMax: ticks[ticks.length - 1], yTicks: ticks };
  }, [series]);

  const xScale = (x) => PAD.left + (xMax === 1 ? innerWidth / 2 : ((x - 1) / (xMax - 1)) * innerWidth);
  const yScale = (y) => PAD.top + (1 - (y - yMin) / (yMax - yMin || 1)) * innerHeight;

  const xTicks = integerXTicks(xMax);
  const showEndLabels = series.length > 0 && series.length <= 4;

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = innerWidth === 0 ? 0 : (px - PAD.left) / innerWidth;
    const xValue = Math.round(1 + ratio * (xMax - 1));
    setHover(Math.min(xMax, Math.max(1, xValue)));
  }

  if (series.length === 0) {
    return (
      <EmptyState
        title="No players selected"
        subtitle="Choose at least one player to plot their rating."
      />
    );
  }

  const hoverRows = hover
    ? series
        .filter((s) => s.points.length >= hover)
        .map((s) => ({ ...s, value: s.points[hover - 1].conservative }))
        .sort((a, b) => b.value - a.value)
    : [];

  const tooltipLeft = hover ? xScale(hover) : 0;
  const tooltipOnRight = tooltipLeft > width - 180;

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%' }}>
      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`${yLabel} by match count for ${series.map((s) => s.name).join(', ')}`}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={yScale(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT}>
              {t}
            </text>
          </g>
        ))}

        {xTicks.map((t) => (
          <text
            key={t}
            x={xScale(t)}
            y={HEIGHT - PAD.bottom + 18}
            textAnchor="middle"
            fontSize={11}
            fill={AXIS_TEXT}
          >
            {t}
          </text>
        ))}
        <text
          x={PAD.left + innerWidth / 2}
          y={HEIGHT - 2}
          textAnchor="middle"
          fontSize={11}
          fill={AXIS_TEXT}
        >
          Match count
        </text>

        {series.map((s) => {
          const path = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.match_number)} ${yScale(p.conservative)}`)
            .join(' ');
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.id}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {last && (
                <circle cx={xScale(last.match_number)} cy={yScale(last.conservative)} r={5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
              )}
              {last && showEndLabels && (
                <text
                  x={xScale(last.match_number) + 9}
                  y={yScale(last.conservative)}
                  dy="0.32em"
                  fontSize={11}
                  fontWeight={600}
                  fill="#5f5e6b"
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}

        {hover && (
          <line
            x1={xScale(hover)}
            x2={xScale(hover)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="#c3c2b7"
            strokeWidth={1}
          />
        )}
      </svg>

      {hover && hoverRows.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: PAD.top,
            left: tooltipOnRight ? undefined : Math.min(tooltipLeft + 12, width - 12),
            right: tooltipOnRight ? Math.max(width - tooltipLeft + 12, 12) : undefined,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            boxShadow: 3,
            p: 1.25,
            pointerEvents: 'none',
            minWidth: 140,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Match {hover}
          </Typography>
          {hoverRows.map((row) => (
            <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Box sx={{ width: 10, height: 2, bgcolor: row.color, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {row.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {row.value.toFixed(1)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
