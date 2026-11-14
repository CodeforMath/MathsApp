import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';

export const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function fmtNum(v) {
  if (!Number.isFinite(v)) return '';
  const r = Math.round(v * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r).replace('.', ',');
}

/**
 * Đồ thị hàm số trên SVG: kéo để di chuyển, cuộn để phóng to/thu nhỏ.
 * functions: [{ f, color, label }]
 * marks: { points: [{x,y,label}], vLines: [x], hLines: [y], lines: [{a,b}] }
 */
const FunctionGraph = forwardRef(function FunctionGraph({ functions, marks, fitHint, height = 460 }, ref) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [width, setWidth] = useState(700);
  const [view, setView] = useState({ cx: 0, cy: 0, scale: 40 });
  const [hover, setHover] = useState(null);
  const drag = useRef(null);

  useImperativeHandle(ref, () => ({ svg: () => svgRef.current }), []);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(300, Math.floor(e.contentRect.width))));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!fitHint) {
      setView({ cx: 0, cy: 0, scale: width / 16 });
      return;
    }
    const xs = fitHint.xs.filter(Number.isFinite);
    const ys = fitHint.ys.filter(Number.isFinite);
    let x0 = xs.length ? Math.min(...xs) - 3 : -5;
    let x1 = xs.length ? Math.max(...xs) + 3 : 5;
    if (x1 - x0 < 8) {
      const m = (x0 + x1) / 2;
      x0 = m - 4;
      x1 = m + 4;
    }
    let scale = width / (x1 - x0);
    let cy = 0;
    if (ys.length) {
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      cy = (y0 + y1) / 2;
      const needH = (y1 - y0 + 4) * scale;
      if (needH > height) scale = Math.max(height / (y1 - y0 + 4), scale / 4);
      if (Math.abs(cy) * scale < height / 3 && y0 <= 0 && y1 >= 0) cy = (y0 + y1) / 2;
    }
    setView({ cx: (x0 + x1) / 2, cy, scale });
  }, [fitHint, width, height]);

  useEffect(() => {
    fit();
  }, [fit]);

  const { cx, cy, scale } = view;
  const W = width;
  const H = height;
  const toPx = (x) => W / 2 + (x - cx) * scale;
  const toPy = (y) => H / 2 - (y - cy) * scale;
  const xmin = cx - W / 2 / scale;
  const xmax = cx + W / 2 / scale;
  const ymin = cy - H / 2 / scale;
  const ymax = cy + H / 2 / scale;

  // Wheel zoom (cần passive: false)
  useEffect(() => {
    const el = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const k = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => {
        const wx = v.cx + (mx - W / 2) / v.scale;
        const wy = v.cy - (my - H / 2) / v.scale;
        const s = Math.min(5000, Math.max(2, v.scale * k));
        return { scale: s, cx: wx - (mx - W / 2) / s, cy: wy + (my - H / 2) / s };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [W, H]);

  const onDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, cx, cy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    if (drag.current) {
      const d = drag.current;
      setView((v) => ({ ...v, cx: d.cx - (e.clientX - d.x) / v.scale, cy: d.cy + (e.clientY - d.y) / v.scale }));
      setHover(null);
    } else if (functions[0]) {
      const x = cx + (mx - W / 2) / scale;
      const y = functions[0].f(x);
      setHover(Number.isFinite(y) ? { x, y } : null);
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  const zoom = (k) => setView((v) => ({ ...v, scale: Math.min(5000, Math.max(2, v.scale * k)) }));

  // Lưới và trục
  const step = niceStep(80 / scale);
  const gridX = [];
  for (let x = Math.ceil(xmin / step) * step; x <= xmax; x += step) gridX.push(+x.toFixed(10));
  const gridY = [];
  for (let y = Math.ceil(ymin / step) * step; y <= ymax; y += step) gridY.push(+y.toFixed(10));
  const minor = step / 5;
  const minorX = [];
  for (let x = Math.ceil(xmin / minor) * minor; x <= xmax; x += minor) minorX.push(x);
  const minorY = [];
  for (let y = Math.ceil(ymin / minor) * minor; y <= ymax; y += minor) minorY.push(y);

  const ax = Math.min(Math.max(toPy(0), 0), H); // vị trí trục Ox
  const ay = Math.min(Math.max(toPx(0), 0), W); // vị trí trục Oy

  const vLines = marks?.vLines || [];
  const paths = useMemo(
    () =>
      functions.map(({ f }) => {
        let d = '';
        let prev = null;
        const n = W * 2;
        for (let i = 0; i <= n; i++) {
          const x = xmin + ((xmax - xmin) * i) / n;
          const y = f(x);
          if (!Number.isFinite(y)) {
            prev = null;
            continue;
          }
          let py = toPy(y);
          const px = toPx(x);
          if (prev) {
            const crossAsym = vLines.some((a) => (prev.x - a) * (x - a) <= 0);
            const jump = Math.abs(py - prev.py) > H * 1.5 && (py < -H || py > 2 * H || prev.py < -H || prev.py > 2 * H);
            if (crossAsym || jump) prev = null;
          }
          py = Math.max(-H * 4, Math.min(H * 5, py));
          d += `${prev ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
          prev = { x, py };
        }
        return d;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [functions, cx, cy, scale, W, H, vLines.join(',')],
  );

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block cursor-grab touch-none bg-white active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => {
          onUp();
          setHover(null);
        }}
        fontFamily="Times New Roman, serif"
      >
        <defs>
          <marker id="fg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="#0f172a" />
          </marker>
          <clipPath id="fg-clip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>
        <rect width={W} height={H} fill="#fff" />
        <g stroke="#f1f5f9" strokeWidth="1">
          {minorX.map((x) => (
            <line key={'mx' + x} x1={toPx(x)} y1={0} x2={toPx(x)} y2={H} />
          ))}
          {minorY.map((y) => (
            <line key={'my' + y} x1={0} y1={toPy(y)} x2={W} y2={toPy(y)} />
          ))}
        </g>
        <g stroke="#e2e8f0" strokeWidth="1">
          {gridX.map((x) => (
            <line key={'gx' + x} x1={toPx(x)} y1={0} x2={toPx(x)} y2={H} />
          ))}
          {gridY.map((y) => (
            <line key={'gy' + y} x1={0} y1={toPy(y)} x2={W} y2={toPy(y)} />
          ))}
        </g>
        {/* trục */}
        <line x1={0} y1={ax} x2={W - 2} y2={ax} stroke="#0f172a" strokeWidth="1.2" markerEnd="url(#fg-arrow)" />
        <line x1={ay} y1={H} x2={ay} y2={2} stroke="#0f172a" strokeWidth="1.2" markerEnd="url(#fg-arrow)" />
        <text x={W - 12} y={ax - 8} fontSize="16" fontStyle="italic">
          x
        </text>
        <text x={ay + 8} y={14} fontSize="16" fontStyle="italic">
          y
        </text>
        <text x={ay - 12} y={ax + 16} fontSize="14" fontStyle="italic">
          O
        </text>
        <g fontSize="12" fill="#475569">
          {gridX
            .filter((x) => Math.abs(x) > 1e-9)
            .map((x) => (
              <g key={'tx' + x}>
                <line x1={toPx(x)} y1={ax - 3} x2={toPx(x)} y2={ax + 3} stroke="#0f172a" />
                <text x={toPx(x)} y={Math.min(ax + 16, H - 4)} textAnchor="middle">
                  {fmtNum(x)}
                </text>
              </g>
            ))}
          {gridY
            .filter((y) => Math.abs(y) > 1e-9)
            .map((y) => (
              <g key={'ty' + y}>
                <line x1={ay - 3} y1={toPy(y)} x2={ay + 3} y2={toPy(y)} stroke="#0f172a" />
                <text x={Math.max(ay - 6, 24)} y={toPy(y) + 4} textAnchor="end">
                  {fmtNum(y)}
                </text>
              </g>
            ))}
        </g>

        <g clipPath="url(#fg-clip)">
          {/* tiệm cận */}
          <g stroke="#64748b" strokeDasharray="6 4" strokeWidth="1.2">
            {vLines.map((x) => (
              <line key={'va' + x} x1={toPx(x)} y1={0} x2={toPx(x)} y2={H} />
            ))}
            {(marks?.hLines || []).map((y) => (
              <line key={'ha' + y} x1={0} y1={toPy(y)} x2={W} y2={toPy(y)} />
            ))}
            {(marks?.lines || []).map(({ a, b }) => (
              <line key={`la${a},${b}`} x1={0} y1={toPy(a * xmin + b)} x2={W} y2={toPy(a * xmax + b)} />
            ))}
          </g>
          {/* đồ thị */}
          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={functions[i].color} strokeWidth="2.2" strokeLinejoin="round" />
          ))}
          {/* điểm đặc biệt */}
          {(marks?.points || []).map((p, i) => (
            <g key={'pt' + i}>
              <line x1={toPx(p.x)} y1={toPy(p.y)} x2={toPx(p.x)} y2={ax} stroke="#94a3b8" strokeDasharray="3 3" />
              <line x1={toPx(p.x)} y1={toPy(p.y)} x2={ay} y2={toPy(p.y)} stroke="#94a3b8" strokeDasharray="3 3" />
              <circle cx={toPx(p.x)} cy={toPy(p.y)} r="3.5" fill={p.color || '#0f172a'} />
              {p.label && (
                <text x={toPx(p.x) + 6} y={toPy(p.y) + (p.below ? 16 : -8)} fontSize="13" fill="#0f172a">
                  {p.label}
                </text>
              )}
            </g>
          ))}
          {hover && (
            <g>
              <circle cx={toPx(hover.x)} cy={toPy(hover.y)} r="4" fill="none" stroke="#f59e0b" strokeWidth="2" />
            </g>
          )}
        </g>
      </svg>
      {hover && (
        <div className="no-print pointer-events-none absolute top-2 left-2 rounded bg-slate-800/80 px-2 py-0.5 font-mono text-xs text-white">
          x = {fmtNum(hover.x)}; y = {fmtNum(hover.y)}
        </div>
      )}
      <div className="no-print absolute top-2 right-2 flex flex-col gap-1">
        <button className="btn btn-sm" onClick={() => zoom(1.3)} title="Phóng to">
          <Plus size={14} />
        </button>
        <button className="btn btn-sm" onClick={() => zoom(1 / 1.3)} title="Thu nhỏ">
          <Minus size={14} />
        </button>
        <button className="btn btn-sm" onClick={fit} title="Vừa khung">
          <Maximize size={14} />
        </button>
      </div>
    </div>
  );
});

export default FunctionGraph;
