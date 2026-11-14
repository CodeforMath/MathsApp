import { forwardRef } from 'react';
import { Tex } from './MathText.jsx';
import { layoutTable } from '../lib/analysis.js';

const LABEL_W = 56;
const PAD_X = 46;
const H_X = 42;
const H_D = 40;
const H_Y = 128;

/** Bảng biến thiên kiểu SGK Việt Nam (HTML + SVG để giữ được công thức KaTeX). */
const VariationTable = forwardRef(function VariationTable({ result, colW: colWProp, yLabel = 'y', dLabel = "y'" }, ref) {
  const { nodes, intervals } = result;
  const colW = colWProp || (nodes.length >= 6 ? 80 : nodes.length === 5 ? 90 : 108);
  const lay = layoutTable(nodes, intervals);
  const n = nodes.length;
  const W = LABEL_W + 2 * PAD_X + (n - 1) * colW;
  const H = H_X + H_D + H_Y;
  const nx = (i) => LABEL_W + PAD_X + i * colW;
  const yTop = H_X + H_D;
  const levelY = (lv) => (lv === 'top' ? yTop + 20 : lv === 'bottom' ? H - 20 : yTop + H_Y / 2);

  const labels = [];
  const lines = [];

  // Dòng x
  nodes.forEach((nd, i) => {
    labels.push({ key: `x${i}`, x: nx(i), y: H_X / 2, tex: nd.tex });
  });

  // Dòng y'
  intervals.forEach((iv, i) => {
    const mx = (nx(i) + nx(i + 1)) / 2;
    if (iv.defined) labels.push({ key: `s${i}`, x: mx, y: H_X + H_D / 2, tex: iv.sign === '0' ? '0' : iv.sign, big: true });
  });
  nodes.forEach((nd, i) => {
    if (nd.dmark === '0') labels.push({ key: `z${i}`, x: nx(i), y: H_X + H_D / 2, tex: '0' });
    if (nd.dmark === '||' || nd.bar) {
      lines.push({ key: `db${i}a`, x1: nx(i) - 2, y1: H_X, x2: nx(i) - 2, y2: H_X + H_D });
      lines.push({ key: `db${i}b`, x1: nx(i) + 2, y1: H_X, x2: nx(i) + 2, y2: H_X + H_D });
    }
    if (nd.bar) {
      lines.push({ key: `yb${i}a`, x1: nx(i) - 2, y1: yTop, x2: nx(i) - 2, y2: H });
      lines.push({ key: `yb${i}b`, x1: nx(i) + 2, y1: yTop, x2: nx(i) + 2, y2: H });
    }
  });

  // Dòng y – giá trị
  const anchor = []; // vị trí (x,y) điểm đầu/cuối mũi tên cho mỗi nút
  nodes.forEach((nd, i) => {
    const L = lay[i];
    const a = { left: null, right: null };
    if (L.single) {
      if (L.tex !== undefined) {
        const y = levelY(L.level);
        labels.push({ key: `v${i}`, x: nx(i), y, tex: L.tex });
        a.left = { x: nx(i) - 24, y, lv: L.level };
        a.right = { x: nx(i) + 24, y, lv: L.level };
      }
    } else {
      if (L.left) {
        const y = levelY(L.left.level);
        labels.push({ key: `vl${i}`, x: nx(i) - 8, y, tex: L.left.tex, align: 'right' });
        a.left = { x: nx(i) - 40, y, lv: L.left.level };
      }
      if (L.right) {
        const y = levelY(L.right.level);
        labels.push({ key: `vr${i}`, x: nx(i) + 8, y, tex: L.right.tex, align: 'left' });
        a.right = { x: nx(i) + 40, y, lv: L.right.level };
      }
    }
    anchor.push(a);
  });

  const arrows = [];
  const hatches = [];
  intervals.forEach((iv, i) => {
    if (!iv.defined) {
      hatches.push({ key: `h${i}`, x: nx(i) + 4, w: nx(i + 1) - nx(i) - 8 });
      return;
    }
    const s = anchor[i].right;
    const e = anchor[i + 1].left;
    if (!s || !e) return;
    const off = (p, toward) => {
      if (p.lv === 'top') return p.y + 13;
      if (p.lv === 'bottom') return p.y - 13;
      return toward === 'up' ? p.y - 6 : toward === 'down' ? p.y + 6 : p.y;
    };
    const dir = iv.sign === '+' ? 'up' : iv.sign === '-' ? 'down' : 'flat';
    arrows.push({ key: `a${i}`, x1: s.x, y1: off(s, dir), x2: e.x, y2: off(e, dir === 'up' ? 'down' : dir === 'down' ? 'up' : 'flat') });
  });

  return (
    <div ref={ref} className="relative inline-block bg-white p-2" style={{ width: W + 16, height: H + 16 }}>
      <svg width={W} height={H} className="absolute top-2 left-2" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="vt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#0f172a" />
          </marker>
          <pattern id="vt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#0f172a" />
        <line x1={LABEL_W} y1="0" x2={LABEL_W} y2={H} stroke="#0f172a" />
        <line x1="0" y1={H_X} x2={W} y2={H_X} stroke="#0f172a" />
        <line x1="0" y1={yTop} x2={W} y2={yTop} stroke="#0f172a" />
        {hatches.map((h) => (
          <rect key={h.key} x={h.x} y={H_X + 1} width={h.w} height={H - H_X - 2} fill="url(#vt-hatch)" />
        ))}
        {lines.map((l) => (
          <line key={l.key} {...l} stroke="#0f172a" strokeWidth="1.1" />
        ))}
        {arrows.map((a) => (
          <line key={a.key} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#0f172a" strokeWidth="1.3" markerEnd="url(#vt-arrow)" />
        ))}
      </svg>
      <div className="absolute top-2 left-2" style={{ width: W, height: H }}>
        <Cell x={LABEL_W / 2} y={H_X / 2} tex="x" />
        <Cell x={LABEL_W / 2} y={H_X + H_D / 2} tex={dLabel} />
        <Cell x={LABEL_W / 2} y={yTop + H_Y / 2} tex={yLabel} />
        {labels.map((l) => (
          <Cell key={l.key} {...l} />
        ))}
      </div>
    </div>
  );
});

function Cell({ x, y, tex, align = 'center', big }) {
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div
      className="absolute whitespace-nowrap"
      style={{ left: x, top: y, transform: `translate(${tx}, -50%)`, fontSize: big ? 18 : 15, lineHeight: 1 }}
    >
      <Tex>{tex}</Tex>
    </div>
  );
}

export default VariationTable;
