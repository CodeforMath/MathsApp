/*
 * Khảo sát hàm số y = f(x) bằng kết hợp đạo hàm ký hiệu (mathjs) và phương pháp số:
 *  – tìm tập xác định, điểm tới hạn (y' = 0 hoặc không xác định), điểm gián đoạn
 *  – giới hạn một phía, giới hạn tại vô cực, tiệm cận đứng / ngang / xiên
 *  – dựng dữ liệu bảng biến thiên (nodes + intervals) và mã tkz-tab
 */
import { all, create } from 'mathjs';
import { intervalTex, niceNumber } from './format.js';

export const math = create(all);

const fin = Number.isFinite;

export function normalizeInput(s) {
  return (s || '')
    .trim()
    .replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, '')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/\bln\s*\(/g, 'log(')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-');
}

function toReal(v) {
  if (typeof v === 'number') return v;
  if (v && typeof v.re === 'number') return Math.abs(v.im) < 1e-12 ? v.re : NaN;
  if (typeof v === 'boolean') return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}

export function compileFn(node) {
  const code = node.compile();
  const scope = { x: 0 };
  return (x) => {
    scope.x = x;
    try {
      return toReal(code.evaluate(scope));
    } catch {
      return NaN;
    }
  };
}

const numDeriv = (g, h = 1e-6) => (x) => (g(x + h) - g(x - h)) / (2 * h);

/** Phân tích chuỗi thành cây biểu thức, kiểm tra chỉ chứa biến x. */
export function parseFunction(input) {
  const expr = normalizeInput(input);
  if (!expr) throw new Error('Hãy nhập biểu thức hàm số.');
  let node;
  try {
    node = math.parse(expr);
  } catch (e) {
    throw new Error('Biểu thức không hợp lệ: ' + e.message);
  }
  const bad = new Set();
  node.traverse((n, _path, parent) => {
    if (n.isSymbolNode && !(parent && parent.isFunctionNode && parent.fn === n)) {
      if (n.name !== 'x' && !(n.name in math)) bad.add(n.name);
    }
  });
  if (bad.size) throw new Error(`Biến không hợp lệ: ${[...bad].join(', ')} (chỉ dùng biến x)`);
  return node;
}

export function texOf(node) {
  let t;
  try {
    t = node.toTex({ parenthesis: 'auto', implicit: 'hide' });
  } catch {
    return node.toString();
  }
  // bỏ dấu nhân thừa: 3\cdot{ x}^{2} → 3{ x}^{2}
  return t
    .replace(/\\cdot(?=\s*\{?\s*x\b)/g, '')
    .replace(/\\cdot(?=\s*(\\left\(|\\sqrt|\\mathrm|\\sin|\\cos|\\tan|\\log|\\ln|\{?\s*e\b))/g, '');
}

/** Đạo hàm trình bày “đẹp”: hàm hữu tỉ P/Q → (P'Q − PQ')/Q². */
export function derivativeTex(node, dNode) {
  try {
    const r = math.rationalize(node, {}, true);
    if (r.denominator) {
      const P = r.numerator.toString();
      const Q = r.denominator.toString();
      const dP = math.derivative(P, 'x').toString();
      const dQ = math.derivative(Q, 'x').toString();
      const num = math.rationalize(`(${dP})*(${Q}) - (${P})*(${dQ})`);
      return `\\frac{${texOf(num)}}{\\left(${texOf(math.parse(Q))}\\right)^{2}}`;
    }
    return texOf(math.simplify(dNode));
  } catch {
    try {
      return texOf(math.simplify(dNode));
    } catch {
      return texOf(dNode);
    }
  }
}

/* ---------- Giới hạn bằng ngoại suy số ---------- */

function extrapolate(vals) {
  const n = vals.length;
  const v4 = vals[n - 1];
  const d4 = vals[n - 1] - vals[n - 2];
  const d3 = vals[n - 2] - vals[n - 3];
  if (Math.abs(d4) < 1e-12) return { finite: true, value: v4 };
  const converging = Math.abs(d4) < 0.5 * Math.abs(d3);
  if (!converging) return { finite: false, sign: Math.sign(v4) || Math.sign(d4) };
  let r = d3 !== 0 ? d4 / d3 : 0;
  if (r < 0 || r > 0.9) r = 0;
  return { finite: true, value: v4 + (d4 * r) / (1 - r) };
}

function limitFrom(samples) {
  // samples: dãy giá trị tiến dần đến điểm cần tính giới hạn
  const last = samples[samples.length - 1];
  if (samples.every((v) => Number.isNaN(v))) return { defined: false };
  if (last === Infinity || last === -Infinity) return { defined: true, value: last };
  const good = samples.filter(fin);
  if (good.length < 3) {
    if (fin(last)) return { defined: true, value: snapSimple(last) };
    return { defined: false };
  }
  if (Math.abs(good[good.length - 1]) > 1e5) return { defined: true, value: Math.sign(good[good.length - 1]) * Infinity };
  const ex = extrapolate(good);
  if (!ex.finite) {
    // chỉ coi là ±∞ khi |giá trị| tăng đều và cùng dấu; ngược lại: dao động, không có giới hạn
    const tail = good.slice(-3);
    const monotone = tail.every((v, k) => k === 0 || (Math.abs(v) > Math.abs(tail[k - 1]) && Math.sign(v) === Math.sign(tail[0])));
    if (!monotone) return { defined: true, value: NaN };
    return { defined: true, value: ex.sign * Infinity };
  }
  return { defined: true, value: snapSimple(ex.value) };
}

/** Làm tròn giá trị giới hạn về số nguyên / phân số đơn giản nếu rất gần. */
function snapSimple(v) {
  if (Math.abs(v) < 1e-6) return 0;
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) < 1e-6 * Math.max(1, Math.abs(v))) return p / q;
  }
  return v;
}

export function sideLimit(f, c, side) {
  const ds = [1e-2, 1e-4, 1e-6, 1e-8];
  return limitFrom(ds.map((d) => f(c + side * d)));
}

export function limitAtInf(f, side) {
  const X = [1e2, 1e4, 1e6, 1e8];
  return limitFrom(X.map((x) => f(side * x)));
}

/* ---------- Tìm nghiệm / biên ---------- */

function bisectSign(g, a, b) {
  let ga = g(a);
  for (let k = 0; k < 64; k++) {
    const m = (a + b) / 2;
    const gm = g(m);
    if (gm === 0) return m;
    if (!fin(gm)) return m;
    if (Math.sign(gm) === Math.sign(ga)) {
      a = m;
      ga = gm;
    } else b = m;
  }
  return (a + b) / 2;
}

function bisectBoundary(g, inside, outside) {
  for (let k = 0; k < 64; k++) {
    const m = (inside + outside) / 2;
    if (fin(g(m))) inside = m;
    else outside = m;
  }
  return (inside + outside) / 2;
}

function signNear(g, c, side) {
  for (const d of [1e-5, 1e-4, 1e-3]) {
    const v = g(c + side * d);
    if (fin(v) && v !== 0) return Math.sign(v);
  }
  return 0;
}

const close = (u, v) => Math.abs(u - v) < 1e-5 * (1 + Math.abs(v));

/* ---------- Khảo sát chính ---------- */

/**
 * @param {string} input biểu thức
 * @param {{range?: [number, number]}} opts nếu có range: chỉ xét trên đoạn [a; b]
 */
export function analyzeFunction(input, opts = {}) {
  const node = parseFunction(input);
  const f = compileFn(node);

  let dNode = null;
  let d2Node = null;
  try {
    dNode = math.derivative(node, 'x');
  } catch {
    dNode = null;
  }
  try {
    if (dNode) d2Node = math.derivative(dNode, 'x');
  } catch {
    d2Node = null;
  }
  const df = dNode ? compileFn(dNode) : numDeriv(f);
  const d2f = d2Node ? compileFn(d2Node) : numDeriv(df, 1e-4);

  const range = opts.range;
  const A = range ? range[0] : -40;
  const B = range ? range[1] : 40;
  if (!(B > A)) throw new Error('Khoảng xét không hợp lệ (cần a < b).');
  const N = 40000;
  const xs = new Float64Array(N + 1);
  const F = new Float64Array(N + 1);
  const D = new Float64Array(N + 1);
  const D2 = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const x = (A * (N - i) + B * i) / N;
    xs[i] = x;
    F[i] = f(x);
    D[i] = df(x);
    D2[i] = d2f(x);
  }
  if (!F.some(fin)) throw new Error('Không tìm thấy điểm nào hàm số xác định trong khoảng xét.');

  // 1) Thu thập ứng viên
  const cands = [];
  for (let i = 0; i < N; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    const fa = fin(F[i]);
    const fb = fin(F[i + 1]);
    if (fa !== fb) cands.push(fa ? bisectBoundary(f, a, b) : bisectBoundary(f, b, a));
    if (fa && fb && F[i] * F[i + 1] < 0) cands.push(bisectSign(f, a, b));
    if (fin(D[i]) && fin(D[i + 1]) && D[i] * D[i + 1] < 0) cands.push(bisectSign(df, a, b));
    if (D[i] === 0) cands.push(a);
    if (fin(D2[i]) && fin(D2[i + 1]) && D2[i] * D2[i + 1] < 0) {
      const c = bisectSign(d2f, a, b);
      if (Math.abs(df(c)) < 1e-6) cands.push(c);
    }
    if (D2[i] === 0 && Math.abs(D[i]) < 1e-9) cands.push(a);
    // f xác định nhưng f' không xác định (ví dụ |x| tại 0 nằm đúng lưới)
    if (fa && !fin(D[i]) && i > 0 && fin(D[i - 1]) && fin(D[i + 1])) cands.push(a);
  }

  const margin = range ? 1e-9 : 1;
  const snapped = cands
    .map((c) => niceNumber(c, 1e-9).value)
    .filter((c) => c > A + margin && c < B - margin)
    .sort((p, q) => p - q);
  const uniq = [];
  for (const c of snapped) if (!uniq.length || Math.abs(c - uniq[uniq.length - 1]) > 1e-6) uniq.push(c);

  // 2) Phân loại
  const keyNodes = [];
  for (const c of uniq) {
    const nd = classifyPoint(f, df, c);
    if (nd) keyNodes.push(nd);
  }

  const warnings = [];
  if (keyNodes.length > 14) {
    warnings.push(
      `Có ${keyNodes.length} điểm đặc biệt (hàm tuần hoàn?). Hãy nhập “Xét trên đoạn” để bảng biến thiên gọn hơn.`,
    );
  }

  // 3) Dựng danh sách nút
  const nodes = [];
  const probeDefined = (xsList) => xsList.some((x) => fin(f(x)));
  if (range) {
    nodes.push(endNode(f, df, A, 1));
  } else {
    const first = keyNodes.length ? keyNodes[0].x : 0;
    if (probeDefined([first - 0.5, first - 1, first - 3, first - 10, first - 30])) {
      nodes.push({ x: -Infinity, kind: 'inf', right: limitAtInf(f, -1) });
    }
  }
  nodes.push(...keyNodes);
  if (range) {
    nodes.push(endNode(f, df, B, -1));
  } else {
    const last = keyNodes.length ? keyNodes[keyNodes.length - 1].x : 0;
    if (probeDefined([last + 0.5, last + 1, last + 3, last + 10, last + 30])) {
      nodes.push({ x: Infinity, kind: 'inf', left: limitAtInf(f, 1) });
    }
  }
  if (nodes.length < 2) throw new Error('Không đủ dữ liệu để lập bảng biến thiên.');

  // 4) Thông tin từng khoảng
  const intervals = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i].x;
    const b = nodes[i + 1].x;
    let pts;
    if (fin(a) && fin(b)) pts = [1, 2, 3, 4, 5, 6, 7].map((k) => a + ((b - a) * k) / 8);
    else if (fin(a)) pts = [0.3, 1, 3, 10, 30].map((d) => a + d);
    else if (fin(b)) pts = [0.3, 1, 3, 10, 30].map((d) => b - d);
    else pts = [-30, -10, -3, -1, 0.3, 1, 3, 10, 30];
    const defCount = pts.filter((x) => fin(f(x))).length;
    const defined = defCount * 2 >= pts.length;
    let pos = 0;
    let neg = 0;
    for (const x of pts) {
      if (!fin(f(x))) continue;
      const d = df(x);
      if (d > 1e-12) pos++;
      else if (d < -1e-12) neg++;
    }
    const sign = !defined ? null : pos === 0 && neg === 0 ? '0' : pos >= neg ? '+' : '-';
    intervals.push({ defined, sign });
  }
  nodes.forEach((n, i) => {
    if (i > 0 && !intervals[i - 1].defined) n.left = null;
    if (i < nodes.length - 1 && !intervals[i].defined) n.right = null;
    if (i === 0) n.left = null;
    if (i === nodes.length - 1) n.right = null;
  });

  // 5) Định dạng TeX
  for (const n of nodes) {
    n.tex = niceNumber(n.x, 1e-9).tex;
    for (const side of ['left', 'right']) {
      if (n[side] && n[side].defined) n[side].tex = niceNumber(n[side].value, 1e-9).tex;
    }
  }

  const result = {
    input,
    node,
    f,
    df,
    tex: texOf(node),
    dTex: dNode ? derivativeTex(node, dNode) : null,
    nodes,
    intervals,
    range: range || null,
    warnings,
  };
  Object.assign(result, summarize(result, f));
  return result;
}

function classifyPoint(f, df, c) {
  const fc = f(c);
  const L = sideLimit(f, c, -1);
  const R = sideLimit(f, c, 1);
  if (!L.defined && !R.defined) return null;
  const fdef = fin(fc);
  const contL = L.defined && fdef && fin(L.value) && close(L.value, fc);
  const contR = R.defined && fdef && fin(R.value) && close(R.value, fc);
  const dc = df(c);
  const stationary = fin(dc) && Math.abs(dc) < 1e-6;

  if (contL && contR) {
    const sl = signNear(df, c, -1);
    const sr = signNear(df, c, 1);
    const nonDiff = !fin(dc);
    if (sl !== sr || stationary || nonDiff) {
      const v = { defined: true, value: fc };
      return {
        x: c,
        kind: stationary ? 'zero' : 'nd',
        dmark: stationary ? '0' : '||',
        bar: false,
        left: v,
        right: { ...v },
      };
    }
    return null;
  }
  if (fdef && ((contL && !R.defined) || (contR && !L.defined))) {
    const v = { defined: true, value: fc };
    return {
      x: c,
      kind: 'end',
      dmark: stationary ? '0' : fin(dc) ? '' : '||',
      bar: false,
      left: contL ? v : null,
      right: contR ? { ...v } : null,
    };
  }
  const infinite = (L.defined && !fin(L.value)) || (R.defined && !fin(R.value));
  return {
    x: c,
    kind: infinite ? 'asym' : 'hole',
    dmark: '||',
    bar: true,
    left: L.defined ? L : null,
    right: R.defined ? R : null,
  };
}

function endNode(f, df, x, side) {
  const fx = f(x);
  const dx = df(x);
  let v;
  let bar = false;
  if (fin(fx)) v = { defined: true, value: fx };
  else {
    v = sideLimit(f, x, side);
    bar = true;
  }
  const stationary = fin(dx) && Math.abs(dx) < 1e-6;
  const node = { x, kind: 'end', dmark: bar ? '||' : stationary ? '0' : '', bar, closed: !bar };
  if (side === 1) node.right = v;
  else node.left = v;
  return node;
}

/* ---------- Kết luận ---------- */

function summarize(res, f) {
  const { nodes, intervals } = res;

  // Tập xác định
  const pieces = [];
  let cur = null;
  for (let i = 0; i < intervals.length; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (!intervals[i].defined) {
      cur = null;
      continue;
    }
    const aClosed = a.kind !== 'inf' && !a.bar && a.right && fin(f(a.x));
    if (!cur || a.bar) {
      cur = { a, aClosed, b: null, bClosed: false };
      pieces.push(cur);
    }
    cur.b = b;
    cur.bClosed = b.kind !== 'inf' && !b.bar && b.left && fin(f(b.x));
    if (b.bar) cur = null;
  }
  let domainTex;
  const allInf = pieces.length && pieces[0].a.kind === 'inf' && pieces[pieces.length - 1].b.kind === 'inf';
  const onlyPoints =
    allInf &&
    pieces.every((p, k) => k === 0 || (pieces[k - 1].b === p.a && p.a.left && p.a.right));
  if (pieces.length === 1 && allInf) domainTex = '\\mathbb{R}';
  else if (onlyPoints && !res.range) {
    domainTex = `\\mathbb{R} \\setminus \\left\\{${pieces
      .slice(1)
      .map((p) => p.a.tex)
      .join('; ')}\\right\\}`;
  } else {
    domainTex = pieces
      .map((p) => intervalTex(p.a.tex, p.b.tex, p.aClosed, p.bClosed))
      .join(' \\cup ');
  }

  // Đơn điệu (gộp các khoảng cùng dấu nối qua điểm liên tục)
  const inc = [];
  const dec = [];
  let run = null;
  for (let i = 0; i < intervals.length; i++) {
    const s = intervals[i].sign;
    if (!intervals[i].defined || s === '0') {
      run = null;
      continue;
    }
    if (run && run.sign === s && !nodes[i].bar) run.b = nodes[i + 1];
    else {
      run = { sign: s, a: nodes[i], b: nodes[i + 1] };
      (s === '+' ? inc : dec).push(run);
    }
  }
  const fmt = (r) => intervalTex(r.a.tex, r.b.tex);

  // Cực trị
  const extrema = [];
  for (let i = 1; i < nodes.length - 1; i++) {
    const n = nodes[i];
    if (n.bar || !n.left || !n.right) continue;
    const l = intervals[i - 1];
    const r = intervals[i];
    if (!l.defined || !r.defined) continue;
    if (l.sign === '+' && r.sign === '-') extrema.push({ type: 'max', x: n.x, y: n.left.value, xTex: n.tex, yTex: n.left.tex });
    if (l.sign === '-' && r.sign === '+') extrema.push({ type: 'min', x: n.x, y: n.left.value, xTex: n.tex, yTex: n.left.tex });
  }

  // Tiệm cận
  const vertical = nodes.filter((n) => n.kind === 'asym' && ((n.left && !fin(n.left.value)) || (n.right && !fin(n.right.value)))).map((n) => ({ x: n.x, tex: n.tex }));
  const horizontal = [];
  const oblique = [];
  if (!res.range) {
    for (const [side, n] of [
      [-1, nodes[0]],
      [1, nodes[nodes.length - 1]],
    ]) {
      if (n.kind !== 'inf') continue;
      const lim = side === -1 ? n.right : n.left;
      if (!lim || !lim.defined) continue;
      if (fin(lim.value)) {
        if (!horizontal.some((h) => Math.abs(h.y - lim.value) < 1e-9)) horizontal.push({ y: lim.value, tex: lim.tex });
      } else {
        const a = limitAtInf((x) => f(x) / x, side);
        if (a.defined && fin(a.value) && Math.abs(a.value) > 1e-9) {
          const av = a.value;
          const b = limitAtInf((x) => f(x) - av * x, side);
          // bỏ qua trường hợp đồ thị trùng hẳn với đường thẳng (ví dụ |x|)
          const isLine = b.defined && [1e2, 1e3].every((X) => Math.abs(f(side * X) - (av * side * X + b.value)) < 1e-9);
          if (!isLine && b.defined && fin(b.value) && !oblique.some((o) => Math.abs(o.a - av) < 1e-9 && Math.abs(o.b - b.value) < 1e-9)) {
            const aT = niceNumber(av).tex;
            const bv = b.value;
            const bT = niceNumber(Math.abs(bv)).tex;
            const lin = `${aT === '1' ? '' : aT === '-1' ? '-' : aT}x`;
            oblique.push({ a: av, b: bv, tex: bv === 0 ? lin : `${lin} ${bv < 0 ? '-' : '+'} ${bT}` });
          }
        }
      }
    }
  }

  const zeros = nodes.filter((n) => n.kind === 'zero' || (n.kind === 'end' && n.dmark === '0'));
  const nds = nodes.filter((n) => n.kind === 'nd');

  return {
    domainTex,
    incTex: inc.map(fmt),
    decTex: dec.map(fmt),
    extrema,
    asymptotes: { vertical, horizontal, oblique },
    zerosTex: zeros.map((n) => n.tex),
    ndTex: nds.map((n) => n.tex),
  };
}

/* ---------- Bố cục bảng biến thiên ---------- */

/** Tính vị trí (top/mid/bottom) cho từng giá trị trong dòng y. */
export function layoutTable(nodes, intervals) {
  const levelFor = (sign, end) => {
    if (sign === '0') return 'mid';
    if (sign === '+') return end === 'start' ? 'bottom' : 'top';
    return end === 'start' ? 'top' : 'bottom';
  };
  const fix = (lv, v) => (v === Infinity ? 'top' : v === -Infinity ? 'bottom' : lv);
  return nodes.map((n, i) => {
    const li = i > 0 ? intervals[i - 1] : null;
    const ri = i < intervals.length ? intervals[i] : null;
    const leftLv = n.left && li && li.defined ? fix(levelFor(li.sign, 'end'), n.left.value) : null;
    const rightLv = n.right && ri && ri.defined ? fix(levelFor(ri.sign, 'start'), n.right.value) : null;
    if (!n.bar && n.left && n.right) {
      const lv = leftLv && rightLv ? (leftLv === rightLv ? leftLv : 'mid') : leftLv || rightLv || 'mid';
      return { single: true, level: lv, tex: n.left.tex };
    }
    return {
      single: !n.bar,
      left: n.left && leftLv ? { level: leftLv, tex: n.left.tex } : null,
      right: n.right && rightLv ? { level: rightLv, tex: n.right.tex } : null,
      level: leftLv || rightLv || 'mid',
      tex: (n.left || n.right)?.tex,
    };
  });
}

/** Sinh mã LaTeX tkz-tab. */
export function toTkzTab(res) {
  const { nodes, intervals } = res;
  const lay = layoutTable(nodes, intervals);
  const xs = nodes.map((n) => `$${n.tex}$`).join(' , ');
  const line = [];
  nodes.forEach((n, i) => {
    if (i === 0 || i === nodes.length - 1) line.push(n.bar ? 'd' : n.dmark === '0' ? 'z' : n.dmark === '||' ? 'd' : '');
    else line.push(n.dmark === '0' ? 'z' : n.dmark === '||' ? 'd' : 't');
    if (i < intervals.length) line.push(intervals[i].defined ? (intervals[i].sign === '0' ? '0' : intervals[i].sign) : 'h');
  });
  const sym = (lv) => (lv === 'top' ? '+' : lv === 'bottom' ? '-' : 'R');
  const vars = [];
  const imas = [];
  nodes.forEach((n, i) => {
    const L = lay[i];
    const hatchAfter = i < intervals.length && !intervals[i].defined;
    const H = hatchAfter ? 'H' : '';
    if (L.single || (!n.bar && (L.left || L.right) && !(L.left && L.right))) {
      const lv = L.level;
      if (lv === 'mid') {
        vars.push('R/');
        imas.push({ i: i + 1, tex: L.tex });
      } else vars.push(`${sym(lv)}${H}/ $${L.tex}$`);
    } else {
      const l = L.left;
      const r = L.right;
      if (l && r) vars.push(`${sym(l.level)}D${sym(r.level)}${H}/ $${l.tex}$ / $${r.tex}$`);
      else if (l) vars.push(`${sym(l.level)}D${H}/ $${l.tex}$`);
      else if (r) vars.push(`D${sym(r.level)}${H}/ $${r.tex}$`);
      else vars.push('R/');
    }
  });
  let out = '\\begin{tikzpicture}\n';
  out += `\\tkzTabInit[nocadre=false,lgt=1.2,espcl=2.6,deltacl=0.6]{$x$ /0.8, $y'$ /0.8, $y$ /2.2}{${xs}}\n`;
  out += `\\tkzTabLine{${line.join(', ')}}\n`;
  out += `\\tkzTabVar{${vars.join(', ')}}\n`;
  for (const m of imas) out += `\\tkzTabIma{${m.i - 1}}{${m.i + 1}}{${m.i}}{$${m.tex}$}\n`;
  out += '\\end{tikzpicture}';
  return out;
}
