/*
 * Mô hình hình không gian dạng đa diện lồi (mặt cong được xấp xỉ bằng nhiều mặt nhỏ).
 * Cạnh khuất được xác định theo hướng nhìn: cạnh “sắc” khuất khi cả hai mặt kề đều quay lưng,
 * cạnh “trơn” (trên mặt cong) chỉ vẽ khi là đường viền (một mặt quay ra, một mặt quay vào).
 */

const { sin, cos, PI, sqrt } = Math;

/* ---------- Vector ---------- */
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => sqrt(dot(a, a));
const avg = (pts) => mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);

function newell(pts) {
  const n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

const ekey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/* ---------- Các hình có sẵn ---------- */

function regularPolygon(n, r, names, z = 0, phase = -PI / 2 - PI / n) {
  const V = {};
  names.forEach((nm, i) => {
    const t = phase + (2 * PI * i) / n;
    V[nm] = [r * cos(t), r * sin(t), z];
  });
  return V;
}

function pyramid(base, apexName, apex) {
  const names = Object.keys(base);
  const faces = [names.slice()];
  names.forEach((nm, i) => faces.push([apexName, nm, names[(i + 1) % names.length]]));
  return { vertices: { ...base, [apexName]: apex }, faces };
}

function prism(base, top) {
  const b = Object.keys(base);
  const t = Object.keys(top);
  const faces = [b.slice(), t.slice()];
  b.forEach((_, i) => {
    const j = (i + 1) % b.length;
    faces.push([b[i], b[j], t[j], t[i]]);
  });
  return { vertices: { ...base, ...top }, faces };
}

const RING = 72;

export const PRESETS = [
  {
    id: 'chop-tu-giac-deu',
    name: 'Hình chóp tứ giác đều S.ABCD',
    params: { a: 4, h: 4 },
    build: ({ a, h }) => {
      const base = {
        A: [-a / 2, a / 2, 0],
        B: [-a / 2, -a / 2, 0],
        C: [a / 2, -a / 2, 0],
        D: [a / 2, a / 2, 0],
      };
      return pyramid(base, 'S', [0, 0, h]);
    },
    extras: { points: [{ name: 'O', type: 'intersect', args: 'A, C, B, D' }], segments: ['SO', 'AC', 'BD'] },
  },
  {
    id: 'chop-sa-vuong',
    name: 'Chóp S.ABCD, đáy hình vuông, SA ⊥ (ABCD)',
    params: { a: 4, h: 4.5 },
    build: ({ a, h }) => {
      const base = { A: [0, a, 0], B: [0, 0, 0], C: [a, 0, 0], D: [a, a, 0] };
      return pyramid(base, 'S', [0, a, h]);
    },
    extras: { segments: ['AC', 'BD'], rights: ['SAB', 'SAD'] },
  },
  {
    id: 'chop-sa-vuong-chu-nhat',
    name: 'Chóp S.ABCD, đáy hình chữ nhật, SA ⊥ (ABCD)',
    params: { a: 5, b: 3, h: 4 },
    build: ({ a, b, h }) => {
      const base = { A: [0, b, 0], B: [0, 0, 0], C: [a, 0, 0], D: [a, b, 0] };
      return pyramid(base, 'S', [0, b, h]);
    },
    extras: { segments: ['AC'], rights: ['SAB', 'SAD'] },
  },
  {
    id: 'chop-tam-giac-deu',
    name: 'Hình chóp tam giác đều S.ABC',
    params: { a: 4.5, h: 4.5 },
    build: ({ a, h }) => {
      const r = a / sqrt(3);
      const base = regularPolygon(3, r, ['A', 'B', 'C'], 0, PI * 0.95);
      return pyramid(base, 'S', [0, 0, h]);
    },
    extras: {
      points: [
        { name: 'M', type: 'mid', args: 'B, C' },
        { name: 'G', type: 'centroid', args: 'A, B, C' },
      ],
      segments: ['SG', 'AM', 'SM'],
    },
  },
  {
    id: 'chop-tam-giac-sa-vuong',
    name: 'Chóp S.ABC, SA ⊥ (ABC), đáy tam giác vuông tại B',
    params: { a: 3, b: 4, h: 4 },
    build: ({ a, b, h }) => {
      const base = { A: [0, a, 0], B: [0, 0, 0], C: [b, 0, 0] };
      return pyramid(base, 'S', [0, a, h]);
    },
    extras: { rights: ['ABC', 'SAB', 'SAC'] },
  },
  {
    id: 'chop-luc-giac-deu',
    name: 'Hình chóp lục giác đều S.ABCDEF',
    params: { a: 2.5, h: 5 },
    build: ({ a, h }) => {
      const base = regularPolygon(6, a, ['A', 'B', 'C', 'D', 'E', 'F'], 0, (5 * PI) / 6);
      return pyramid(base, 'S', [0, 0, h]);
    },
    extras: { points: [{ name: 'O', type: 'centroid', args: 'A, B, C, D, E, F' }], segments: ['SO', 'AD', 'BE', 'CF'] },
  },
  {
    id: 'tu-dien-deu',
    name: 'Tứ diện đều ABCD',
    params: { a: 5 },
    build: ({ a }) => {
      const r = a / sqrt(3);
      const base = regularPolygon(3, r, ['B', 'C', 'D'], 0, PI * 0.95);
      return pyramid(base, 'A', [0, 0, a * sqrt(2 / 3)]);
    },
    extras: { points: [{ name: 'G', type: 'centroid', args: 'B, C, D' }], segments: ['AG'] },
  },
  {
    id: 'lap-phuong',
    name: "Hình lập phương ABCD.A'B'C'D'",
    params: { a: 4 },
    build: ({ a }) =>
      prism(
        { A: [0, a, 0], B: [0, 0, 0], C: [a, 0, 0], D: [a, a, 0] },
        { "A'": [0, a, a], "B'": [0, 0, a], "C'": [a, 0, a], "D'": [a, a, a] },
      ),
    extras: { segments: ["AC'"] },
  },
  {
    id: 'hop-chu-nhat',
    name: "Hình hộp chữ nhật ABCD.A'B'C'D'",
    params: { a: 5, b: 3, c: 3.5 },
    build: ({ a, b, c }) =>
      prism(
        { A: [0, b, 0], B: [0, 0, 0], C: [a, 0, 0], D: [a, b, 0] },
        { "A'": [0, b, c], "B'": [0, 0, c], "C'": [a, 0, c], "D'": [a, b, c] },
      ),
    extras: {},
  },
  {
    id: 'lang-tru-tam-giac-deu',
    name: "Lăng trụ tam giác đều ABC.A'B'C'",
    params: { a: 4, h: 4.5 },
    build: ({ a, h }) => {
      const r = a / sqrt(3);
      return prism(regularPolygon(3, r, ['A', 'B', 'C'], 0, PI * 0.95), regularPolygon(3, r, ["A'", "B'", "C'"], h, PI * 0.95));
    },
    extras: {},
  },
  {
    id: 'lang-tru-xien',
    name: "Lăng trụ xiên ABC.A'B'C'",
    params: { a: 4, h: 4, d: 1.5 },
    build: ({ a, h, d }) => {
      const base = { A: [0, 2, 0], B: [0, -1, 0], C: [a, 0, 0] };
      const top = { "A'": [d, 2, h], "B'": [d, -1, h], "C'": [a + d, 0, h] };
      return prism(base, top);
    },
    extras: { points: [{ name: 'H', type: 'projPlane', args: "A', A, B, C" }], segments: ["A'H"] },
  },
  {
    id: 'hinh-tru',
    name: 'Hình trụ',
    params: { r: 2.5, h: 5 },
    build: ({ r, h }) => {
      const V = {};
      const faces = [[], []];
      const smooth = new Set();
      for (let i = 0; i < RING; i++) {
        const t = -PI / 2 + (2 * PI * i) / RING;
        V[`_b${i}`] = [r * cos(t), r * sin(t), 0];
        V[`_t${i}`] = [r * cos(t), r * sin(t), h];
        faces[0].push(`_b${i}`);
        faces[1].push(`_t${i}`);
        const j = (i + 1) % RING;
        faces.push([`_b${i}`, `_b${j}`, `_t${j}`, `_t${i}`]);
        smooth.add(ekey(`_b${i}`, `_t${i}`));
      }
      return { vertices: V, faces, smooth, points: { O: [0, 0, 0], "O'": [0, 0, h] } };
    },
    extras: { segments: ["OO'"] },
  },
  {
    id: 'hinh-non',
    name: 'Hình nón',
    params: { r: 2.8, h: 5 },
    build: ({ r, h }) => {
      const V = { S: [0, 0, h] };
      const faces = [[]];
      const smooth = new Set();
      for (let i = 0; i < RING; i++) {
        const t = -PI / 2 + (2 * PI * i) / RING;
        const nm = i === 0 ? 'A' : `_b${i}`;
        V[nm] = [r * cos(t), r * sin(t), 0];
        faces[0].push(nm);
      }
      const names = faces[0];
      names.forEach((nm, i) => {
        faces.push(['S', nm, names[(i + 1) % RING]]);
        if (nm !== 'A') smooth.add(ekey('S', nm));
      });
      return { vertices: V, faces, smooth, points: { O: [0, 0, 0] } };
    },
    extras: { segments: ['SO', 'OA'], rights: ['SOA'] },
  },
  {
    id: 'hinh-cau',
    name: 'Hình cầu',
    params: { R: 3 },
    build: ({ R }) => {
      const m = 24;
      const n = 48;
      const V = { _np: [0, 0, R], _sp: [0, 0, -R] };
      const faces = [];
      const smooth = new Set();
      const nm = (j, i) => `_p${j}_${(i + n) % n}`;
      for (let j = 1; j < m; j++) {
        const phi = (PI * j) / m;
        for (let i = 0; i < n; i++) {
          const t = (2 * PI * i) / n;
          V[nm(j, i)] = [R * sin(phi) * cos(t), R * sin(phi) * sin(t), R * cos(phi)];
        }
      }
      for (let i = 0; i < n; i++) {
        faces.push(['_np', nm(1, i), nm(1, i + 1)]);
        faces.push(['_sp', nm(m - 1, i + 1), nm(m - 1, i)]);
        for (let j = 1; j < m - 1; j++) faces.push([nm(j, i), nm(j + 1, i), nm(j + 1, i + 1), nm(j, i + 1)]);
      }
      // mọi cạnh đều trơn, trừ đường xích đạo
      for (const f of faces) {
        for (let k = 0; k < f.length; k++) {
          const a = f[k];
          const b = f[(k + 1) % f.length];
          const eq = a.startsWith(`_p${m / 2}_`) && b.startsWith(`_p${m / 2}_`);
          if (!eq) smooth.add(ekey(a, b));
        }
      }
      return { vertices: V, faces, smooth, points: { O: [0, 0, 0] } };
    },
    extras: {},
  },
];

/* ---------- Dựng điểm phụ ---------- */

export const POINT_TYPES = [
  { id: 'mid', label: 'Trung điểm', hint: 'S, C  (hoặc SC)' },
  { id: 'ratio', label: 'Chia đoạn theo tỉ số', hint: 'S, C, 1/3  → điểm M với SM = 1/3·SC' },
  { id: 'centroid', label: 'Trọng tâm / tâm', hint: 'A, B, C  (hoặc ABCD)' },
  { id: 'intersect', label: 'Giao 2 đường thẳng', hint: 'A, C, B, D  → giao AC và BD' },
  { id: 'foot', label: 'Hình chiếu lên đường thẳng', hint: 'A, S, B  → chân đường vuông góc từ A xuống SB' },
  { id: 'projPlane', label: 'Hình chiếu lên mặt phẳng', hint: 'A, S, B, C  → hình chiếu của A lên (SBC)' },
  { id: 'coord', label: 'Theo toạ độ (x, y, z)', hint: '0, 0, 2' },
];

/** Tách chuỗi “SAB”, “S, A'” … thành danh sách tên điểm đã biết (khớp dài nhất). */
export function tokenize(str, names) {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const out = [];
  let i = 0;
  while (i < str.length) {
    if (/[\s,;.()]/.test(str[i])) {
      i++;
      continue;
    }
    const nm = sorted.find((n) => str.startsWith(n, i));
    if (!nm) throw new Error(`Không có điểm “${str.slice(i).match(/^\S[']*/)[0]}”`);
    out.push(nm);
    i += nm.length;
  }
  return out;
}

function parseNum(s) {
  const t = s.trim().replace(',', '.');
  if (/^-?\d*\.?\d+\s*\/\s*-?\d*\.?\d+$/.test(t)) {
    const [p, q] = t.split('/').map(Number);
    return p / q;
  }
  const v = Number(t);
  if (!Number.isFinite(v)) throw new Error(`“${s}” không phải số`);
  return v;
}

export function computePoint(def, P) {
  const names = Object.keys(P);
  const need = (arr, k) => {
    if (arr.length < k) throw new Error(`Cần ${k} điểm`);
    return arr.map((n) => P[n]);
  };
  switch (def.type) {
    case 'mid': {
      const [a, b] = need(tokenize(def.args, names), 2);
      return mul(add(a, b), 0.5);
    }
    case 'ratio': {
      const parts = def.args.split(/[,;]/);
      const k = parseNum(parts.pop());
      const [a, b] = need(tokenize(parts.join(' '), names), 2);
      return add(a, mul(sub(b, a), k));
    }
    case 'centroid': {
      const pts = tokenize(def.args, names).map((n) => P[n]);
      if (pts.length < 2) throw new Error('Cần ít nhất 2 điểm');
      return avg(pts);
    }
    case 'intersect': {
      const [a, b, c, d] = need(tokenize(def.args, names), 4);
      const u = sub(b, a);
      const v = sub(d, c);
      const w = sub(a, c);
      const A = dot(u, u);
      const B = dot(u, v);
      const C = dot(v, v);
      const D = dot(u, w);
      const E = dot(v, w);
      const den = A * C - B * B;
      if (Math.abs(den) < 1e-12) throw new Error('Hai đường thẳng song song');
      const s = (B * E - C * D) / den;
      const t = (A * E - B * D) / den;
      const p1 = add(a, mul(u, s));
      const p2 = add(c, mul(v, t));
      if (len(sub(p1, p2)) > 1e-6 * (1 + len(u) + len(v))) throw new Error('Hai đường thẳng không cắt nhau (chéo nhau)');
      return mul(add(p1, p2), 0.5);
    }
    case 'foot': {
      const [p, a, b] = need(tokenize(def.args, names), 3);
      const u = sub(b, a);
      return add(a, mul(u, dot(sub(p, a), u) / dot(u, u)));
    }
    case 'projPlane': {
      const [p, a, b, c] = need(tokenize(def.args, names), 4);
      const n = cross(sub(b, a), sub(c, a));
      return sub(p, mul(n, dot(sub(p, a), n) / dot(n, n)));
    }
    case 'coord': {
      const v = def.args.split(/[,;]/).map(parseNum);
      if (v.length !== 3) throw new Error('Cần 3 toạ độ x, y, z');
      return v;
    }
    default:
      throw new Error('Loại điểm không hợp lệ');
  }
}

/* ---------- Dựng cảnh ---------- */

export function makeView(azDeg, elDeg) {
  const a = (azDeg * PI) / 180;
  const e = (elDeg * PI) / 180;
  const ca = cos(a);
  const sa = sin(a);
  const ce = cos(e);
  const se = sin(e);
  return (p) => {
    const x1 = p[0] * ca - p[1] * sa;
    const y1 = p[0] * sa + p[1] * ca;
    return [x1, y1 * se + p[2] * ce, y1 * ce - p[2] * se];
  };
}

/**
 * Tính toàn bộ dữ liệu vẽ.
 * extras: { points: [{name,type,args}], segments: [str], fills: [str], rights: [str] }
 */
export function buildScene(solid, extras, view, size) {
  const { vertices, faces } = solid;
  const smooth = solid.smooth || new Set();
  const P = { ...vertices, ...(solid.points || {}) };
  const errors = [];
  const userPoints = [];
  for (const def of extras.points || []) {
    try {
      if (!def.name) throw new Error('Thiếu tên điểm');
      if (P[def.name]) throw new Error(`Điểm ${def.name} đã tồn tại`);
      P[def.name] = computePoint(def, P);
      userPoints.push(def.name);
    } catch (e) {
      errors.push(`${def.name || '?'}: ${e.message}`);
    }
  }

  const vnames = Object.keys(vertices);
  const center = avg(vnames.map((n) => vertices[n]));
  const radius = Math.max(...vnames.map((n) => len(sub(vertices[n], center))));

  // Mặt: pháp tuyến hướng ra ngoài + quay ra trước?
  const faceInfo = faces.map((f) => {
    const pts = f.map((n) => vertices[n]);
    let n = newell(pts);
    const c = avg(pts);
    if (dot(n, sub(c, center)) < 0) n = mul(n, -1);
    const nn = len(n) || 1;
    n = mul(n, 1 / nn);
    const vn = view(n);
    return { names: f, pts, n, front: vn[2] < -1e-9 };
  });

  // Cạnh của khối
  const edgeFaces = new Map();
  faceInfo.forEach((fi, idx) => {
    const f = fi.names;
    for (let i = 0; i < f.length; i++) {
      const k = ekey(f[i], f[(i + 1) % f.length]);
      if (!edgeFaces.has(k)) edgeFaces.set(k, []);
      edgeFaces.get(k).push(idx);
    }
  });

  const segs = []; // {a, b, hidden, user}
  for (const [k, fl] of edgeFaces) {
    const [a, b] = k.split('|');
    const fronts = fl.filter((i) => faceInfo[i].front).length;
    if (smooth.has(k)) {
      if (fronts === 1 && fl.length === 2) segs.push({ a, b, hidden: false });
    } else segs.push({ a, b, hidden: fronts === 0 });
  }

  // Điểm thuộc mặt?
  const tol = 1e-6 * (radius || 1);
  const onFace = (p, fi) => {
    if (Math.abs(dot(sub(p, fi.pts[0]), fi.n)) > tol * 10) return false;
    const m = fi.pts.length;
    for (let i = 0; i < m; i++) {
      const e = sub(fi.pts[(i + 1) % m], fi.pts[i]);
      if (dot(cross(e, sub(p, fi.pts[i])), fi.n) < -tol * 10) return false;
    }
    return true;
  };
  const segVisible = (p, q) => faceInfo.some((fi) => fi.front && onFace(p, fi) && onFace(q, fi));

  const allNames = Object.keys(P);
  for (const s of extras.segments || []) {
    try {
      const t = tokenize(s, allNames);
      if (t.length < 2) throw new Error('Cần 2 điểm');
      for (let i = 0; i + 1 < t.length; i++) {
        const a = t[i];
        const b = t[i + 1];
        if (edgeFaces.has(ekey(a, b))) continue;
        segs.push({ a, b, hidden: !segVisible(P[a], P[b]), user: true });
      }
    } catch (e) {
      errors.push(`Đoạn “${s}”: ${e.message}`);
    }
  }

  // Chiếu lên màn hình
  const projected = {};
  for (const n of allNames) projected[n] = view(P[n]);
  const pc = view(center);
  const scale = (Math.min(size.w, size.h) * 0.42) / (radius || 1);
  const scr = {};
  for (const n of allNames) {
    const p = projected[n];
    scr[n] = [size.w / 2 + (p[0] - pc[0]) * scale, size.h / 2 - (p[1] - pc[1]) * scale];
  }

  const fills = [];
  for (const s of extras.fills || []) {
    try {
      const t = tokenize(s, allNames);
      if (t.length < 3) throw new Error('Cần ít nhất 3 điểm');
      fills.push(t);
    } catch (e) {
      errors.push(`Mặt “${s}”: ${e.message}`);
    }
  }

  const rights = [];
  for (const s of extras.rights || []) {
    try {
      const t = tokenize(s, allNames);
      if (t.length !== 3) throw new Error('Cần đúng 3 điểm, ví dụ SAB (góc tại A)');
      const [p, q, r] = t.map((n) => P[n]);
      const k = 0.09 * radius;
      const u = sub(p, q);
      const v = sub(r, q);
      const a1 = add(q, mul(u, k / len(u)));
      const a3 = add(q, mul(v, k / len(v)));
      const a2 = add(a1, sub(a3, q));
      rights.push([a1, a2, a3].map((pt) => {
        const pp = view(pt);
        return [size.w / 2 + (pp[0] - pc[0]) * scale, size.h / 2 - (pp[1] - pc[1]) * scale];
      }));
    } catch (e) {
      errors.push(`Góc vuông “${s}”: ${e.message}`);
    }
  }

  // Nhãn
  const cx = size.w / 2;
  const cy = size.h / 2;
  const labelNames = allNames.filter((n) => !n.startsWith('_'));
  const labels = labelNames.map((n) => {
    const [x, y] = scr[n];
    let dx = x - cx;
    let dy = y - cy;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      dx = 0.7;
      dy = 0.7;
    } else {
      dx /= d;
      dy /= d;
    }
    return { name: n, x, y, lx: x + dx * 15, ly: y + dy * 15, dx, dy };
  });
  const dots = [...Object.keys(solid.points || {}), ...userPoints];

  return { segs, scr, labels, dots, fills, rights, errors };
}

/** Gộp các đoạn liên tiếp cùng kiểu thành đường gấp khúc (để nét đứt liền mạch). */
export function chainSegments(segs) {
  const groups = [[], []];
  segs.forEach((s) => groups[s.hidden ? 1 : 0].push(s));
  const out = [];
  groups.forEach((list, gi) => {
    const adj = new Map();
    list.forEach((s, i) => {
      for (const v of [s.a, s.b]) {
        if (!adj.has(v)) adj.set(v, []);
        adj.get(v).push(i);
      }
    });
    const used = new Array(list.length).fill(false);
    const extend = (path) => {
      for (;;) {
        const end = path[path.length - 1];
        const cand = (adj.get(end) || []).filter((i) => !used[i]);
        if (cand.length !== 1 || adj.get(end).length !== 2) return;
        const s = list[cand[0]];
        used[cand[0]] = true;
        path.push(s.a === end ? s.b : s.a);
      }
    };
    list.forEach((s, i) => {
      if (used[i]) return;
      used[i] = true;
      const path = [s.a, s.b];
      extend(path);
      path.reverse();
      extend(path);
      out.push({ path, hidden: gi === 1 });
    });
  });
  return out;
}

/** Xuất mã TikZ từ cảnh đã chiếu. */
export function toTikz(scene, size) {
  const k = 7 / Math.max(size.w, size.h); // ~7cm
  const f = (n) => (Math.round(n * 1000) / 1000).toString();
  const pt = ([x, y]) => `(${f(x * k)},${f((size.h - y) * k)})`;
  const chains = chainSegments(scene.segs);
  let s = '\\begin{tikzpicture}[line join=round, line cap=round, scale=1]\n';
  for (const fl of scene.fills) s += `  \\fill[blue!12] ${fl.map((n) => pt(scene.scr[n])).join(' -- ')} -- cycle;\n`;
  for (const c of chains) {
    s += `  \\draw${c.hidden ? '[dashed]' : ''} ${c.path.map((n) => pt(scene.scr[n])).join(' -- ')};\n`;
  }
  for (const r of scene.rights) s += `  \\draw[thin] ${r.map(pt).join(' -- ')};\n`;
  for (const n of scene.dots) s += `  \\fill ${pt(scene.scr[n])} circle (1.2pt);\n`;
  for (const l of scene.labels) {
    const ang = Math.atan2(-l.dy, l.dx) * (180 / Math.PI);
    const dirs = ['right', 'above right', 'above', 'above left', 'left', 'below left', 'below', 'below right'];
    const idx = ((Math.round(ang / 45) % 8) + 8) % 8;
    s += `  \\node[${dirs[idx]}] at ${pt(scene.scr[l.name])} {$${l.name}$};\n`;
  }
  s += '\\end{tikzpicture}';
  return s;
}
