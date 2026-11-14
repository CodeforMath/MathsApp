import { useCallback, useEffect, useRef, useState } from 'react';
import JXG from 'jsxgraph';
import 'jsxgraph-css';
import {
  Circle,
  CircleDot,
  Copy,
  Crosshair,
  Download,
  Eraser,
  GitCommitHorizontal,
  ImagePlus,
  Minus,
  MousePointer2,
  MoveUpRight,
  Pentagon,
  Plus,
  RotateCcw,
  Slash,
  SquareDashedBottom,
  Trash2,
  Triangle,
  Type,
  Undo2,
} from 'lucide-react';
import { copyText, downloadDataUrl, downloadText, serializeSvg, svgToPngDataUrl } from '../lib/exporters.js';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

const C_POINT = JXG.OBJECT_CLASS_POINT;
const C_LINE = JXG.OBJECT_CLASS_LINE;
const C_CIRCLE = JXG.OBJECT_CLASS_CIRCLE;

// Kiểu mặc định: nhãn vẽ bằng SVG để xuất ảnh được
JXG.Options.text.display = 'internal';
JXG.Options.text.fontSize = 16;
JXG.Options.point = {
  ...JXG.Options.point,
  size: 2.5,
  strokeColor: '#1e3a8a',
  fillColor: '#2563eb',
  highlightFillColor: '#f59e0b',
  highlightStrokeColor: '#d97706',
};
JXG.Options.point.label = { ...JXG.Options.point.label, fontSize: 17, offset: [8, 10], strokeColor: '#0f172a' };
for (const k of ['line', 'segment', 'circle']) {
  JXG.Options[k] = { ...JXG.Options[k], strokeColor: '#0f172a', strokeWidth: 1.6, highlightStrokeColor: '#6366f1' };
}
JXG.Options.polygon = {
  ...JXG.Options.polygon,
  fillColor: '#3b82f6',
  fillOpacity: 0.07,
  highlightFillOpacity: 0.12,
  borders: { ...JXG.Options.polygon.borders, strokeColor: '#0f172a', strokeWidth: 1.6 },
  vertices: { ...JXG.Options.polygon.vertices },
};

const TOOLS = [
  { id: 'move', label: 'Chọn / kéo', icon: MousePointer2, help: 'Kéo các điểm tự do để thay đổi hình. Shift + kéo để dịch khung, cuộn chuột để phóng to.' },
  { id: 'point', label: 'Điểm', icon: CircleDot, help: 'Bấm vào chỗ trống để tạo điểm, bấm lên đường thẳng/đường tròn để tạo điểm thuộc đường đó.' },
  { id: 'segment', label: 'Đoạn thẳng', icon: Minus, need: 2, help: 'Chọn 2 điểm.' },
  { id: 'line', label: 'Đường thẳng', icon: Slash, need: 2, help: 'Chọn 2 điểm.' },
  { id: 'ray', label: 'Tia', icon: MoveUpRight, need: 2, help: 'Chọn gốc rồi một điểm trên tia.' },
  { id: 'polygon', label: 'Đa giác', icon: Pentagon, help: 'Chọn lần lượt các đỉnh, bấm lại đỉnh đầu tiên để khép kín.' },
  { id: 'circle', label: 'Đường tròn (tâm, điểm)', icon: Circle, need: 2, help: 'Chọn tâm rồi một điểm thuộc đường tròn.' },
  { id: 'circle3', label: 'Đường tròn qua 3 điểm', icon: Circle, need: 3, help: 'Chọn 3 điểm.' },
  { id: 'midpoint', label: 'Trung điểm', icon: GitCommitHorizontal, need: 2, help: 'Chọn 2 điểm hoặc bấm vào một đoạn thẳng.' },
  { id: 'altitude', label: 'Hạ đường vuông góc', icon: SquareDashedBottom, help: 'Chọn một điểm rồi chọn đường thẳng/đoạn thẳng: dựng chân đường vuông góc và ký hiệu góc vuông.' },
  { id: 'perpendicular', label: 'Đường vuông góc', icon: Plus, help: 'Chọn một đường thẳng và một điểm.' },
  { id: 'parallel', label: 'Đường song song', icon: Slash, help: 'Chọn một đường thẳng và một điểm.' },
  { id: 'bisector', label: 'Phân giác góc', icon: Triangle, need: 3, help: 'Chọn 3 điểm A, B, C — phân giác góc ABC.' },
  { id: 'angle', label: 'Đánh dấu / đo góc', icon: Triangle, need: 3, help: 'Chọn 3 điểm A, B, C — đánh dấu góc ABC (đỉnh ở giữa).' },
  { id: 'intersect', label: 'Giao điểm', icon: Crosshair, help: 'Chọn 2 đường (thẳng/tròn).' },
  { id: 'text', label: 'Chữ', icon: Type, help: 'Bấm vào vị trí cần ghi chữ.' },
  { id: 'delete', label: 'Xoá đối tượng', icon: Eraser, help: 'Bấm vào đối tượng cần xoá (các đối tượng phụ thuộc cũng bị xoá).' },
];

const TEMPLATES = [
  { id: 'triangle', label: 'Tam giác ABC' },
  { id: 'right', label: 'Tam giác vuông tại A' },
  { id: 'circum', label: 'Đường tròn ngoại tiếp' },
  { id: 'incircle', label: 'Đường tròn nội tiếp' },
  { id: 'altitudes', label: 'Ba đường cao, trực tâm H' },
  { id: 'medians', label: 'Ba trung tuyến, trọng tâm G' },
  { id: 'square', label: 'Hình vuông' },
  { id: 'rect', label: 'Hình chữ nhật' },
  { id: 'parallelogram', label: 'Hình bình hành' },
  { id: 'rhombus', label: 'Hình thoi' },
  { id: 'trapezoid', label: 'Hình thang' },
  { id: 'tangent', label: 'Đường tròn + tiếp tuyến' },
];

const NAME_SEQ = 'ABCDEFGHIKLMNOPQRSTUVXYZ'.split('');

export default function Geometry2D() {
  const toast = useToast();
  const boxId = useRef('jxg-' + Math.random().toString(36).slice(2));
  const boardRef = useRef(null);
  const extrasRef = useRef({ axes: [], grid: null });
  const [tool, setTool] = useState('move');
  const toolRef = useRef('move');
  const selRef = useRef([]);
  const historyRef = useRef([]);
  const [showAxes, setShowAxes] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const snapRef = useRef(true);
  const [showMeasure, setShowMeasure] = useState(true);
  const measureRef = useRef(true);
  const [, force] = useState(0);

  const board = () => boardRef.current;

  /* ---------- tiện ích ---------- */
  const nextName = useCallback(() => {
    const used = new Set(
      board()
        .objectsList.filter((o) => o.elementClass === C_POINT)
        .map((o) => o.name),
    );
    for (let round = 0; ; round++) {
      for (const c of NAME_SEQ) {
        const n = round === 0 ? c : `${c}_${round}`;
        if (!used.has(n)) return n;
      }
    }
  }, []);

  const record = (els) => {
    const list = els.filter(Boolean);
    if (list.length) historyRef.current.push(list);
    force((x) => x + 1);
  };

  const mkPoint = (x, y, attrs = {}) =>
    board().create('point', [x, y], {
      name: nextName(),
      snapToGrid: snapRef.current,
      snapSizeX: 0.5,
      snapSizeY: 0.5,
      ...attrs,
    });

  const angleLabel = (A, B, C, ang) => {
    const pos = () => {
      const bx = B.X();
      const by = B.Y();
      let ux = A.X() - bx;
      let uy = A.Y() - by;
      let vx = C.X() - bx;
      let vy = C.Y() - by;
      const lu = Math.hypot(ux, uy) || 1;
      const lv = Math.hypot(vx, vy) || 1;
      ux /= lu;
      uy /= lu;
      vx /= lv;
      vy /= lv;
      let sx = ux + vx;
      let sy = uy + vy;
      const ls = Math.hypot(sx, sy) || 1;
      sx /= ls;
      sy /= ls;
      return [bx + sx * 1.15, by + sy * 1.15];
    };
    return board().create(
      'text',
      [() => pos()[0], () => pos()[1], () => `${(Math.round(((ang.Value() * 180) / Math.PI) * 10) / 10).toString().replace('.', ',')}°`],
      { fontSize: 13, anchorX: 'middle', anchorY: 'middle', strokeColor: '#b45309', visible: () => measureRef.current, fixed: true },
    );
  };

  const markAngle = (A, B, C, withMeasure = true) => {
    const ang = board().create('nonreflexangle', [A, B, C], {
      radius: 0.6,
      name: '',
      withLabel: false,
      fillColor: '#f59e0b',
      fillOpacity: 0.15,
      strokeColor: '#d97706',
      strokeWidth: 1.2,
    });
    const txt = withMeasure ? angleLabel(A, B, C, ang) : null;
    return [ang, txt];
  };

  const rightMark = (P, H, Q) =>
    board().create('nonreflexangle', [P, H, Q], {
      radius: 0.35,
      name: '',
      withLabel: false,
      fillOpacity: 0,
      strokeColor: '#0f172a',
      strokeWidth: 1,
      orthoType: 'square',
    });

  /* ---------- khởi tạo bảng vẽ ---------- */
  const initBoard = useCallback(() => {
    if (boardRef.current) JXG.JSXGraph.freeBoard(boardRef.current);
    const b = JXG.JSXGraph.initBoard(boxId.current, {
      boundingbox: [-8, 6, 8, -6],
      keepAspectRatio: true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: true, needShift: true },
      zoom: { wheel: true, needShift: false, min: 0.2, max: 20 },
    });
    boardRef.current = b;
    const axisAttr = { strokeColor: '#334155', ticks: { strokeColor: '#cbd5e1', label: { fontSize: 11, strokeColor: '#64748b' } } };
    extrasRef.current.axes = [
      b.create('axis', [[0, 0], [1, 0]], { ...axisAttr, name: 'x', withLabel: true, label: { position: 'rt', offset: [-12, 12], fontSize: 15 } }),
      b.create('axis', [[0, 0], [0, 1]], { ...axisAttr, name: 'y', withLabel: true, label: { position: 'rt', offset: [8, -6], fontSize: 15 } }),
    ];
    extrasRef.current.grid = b.create('grid', [], { majorStep: 1, minorElements: 0, strokeColor: '#e2e8f0', strokeOpacity: 1 });
    extrasRef.current.axes.forEach((a) => a.setAttribute({ visible: false }));
    historyRef.current = [];
    selRef.current = [];

    b.on('down', (e) => handleDown(e));
    force((x) => x + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initBoard();
    const el = document.getElementById(boxId.current);
    const ro = new ResizeObserver(([e]) => {
      const b = boardRef.current;
      const { width, height } = e.contentRect;
      if (b && width > 0 && height > 0) b.resizeContainer(width, height, true, true);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (boardRef.current) JXG.JSXGraph.freeBoard(boardRef.current);
      boardRef.current = null;
    };
  }, [initBoard]);

  useEffect(() => {
    extrasRef.current.axes.forEach((a) => a.setAttribute({ visible: showAxes }));
    board()?.update();
  }, [showAxes]);
  useEffect(() => {
    extrasRef.current.grid?.setAttribute({ visible: showGrid });
    board()?.update();
  }, [showGrid]);
  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);
  useEffect(() => {
    measureRef.current = showMeasure;
    board()?.fullUpdate();
  }, [showMeasure]);

  const clearSelection = () => {
    selRef.current.forEach((o) => {
      if (o.elementClass === C_POINT) o.setAttribute({ strokeColor: '#1e3a8a', fillColor: '#2563eb', size: 2.5 });
      else o.setAttribute({ strokeColor: '#0f172a' });
    });
    selRef.current = [];
  };

  const highlight = (o) => {
    if (o.elementClass === C_POINT) o.setAttribute({ strokeColor: '#d97706', fillColor: '#f59e0b', size: 4 });
    else o.setAttribute({ strokeColor: '#f59e0b' });
  };

  const chooseTool = (id) => {
    clearSelection();
    toolRef.current = id;
    setTool(id);
  };

  /* ---------- xử lý bấm chuột ---------- */
  function handleDown(e) {
    const mode = toolRef.current;
    const b = board();
    if (mode === 'move' || !b) return;
    const under = b.getAllObjectsUnderMouse(e).filter((o) => o.visPropCalc?.visible !== false && o.elType !== 'axis' && o.elType !== 'ticks' && o.elType !== 'grid');
    const [x, y] = b.getUsrCoordsOfMouse(e);
    const pt = under.find((o) => o.elementClass === C_POINT);
    const path = under.find((o) => o.elementClass === C_LINE || o.elementClass === C_CIRCLE);
    const created = [];

    const pickPoint = () => {
      if (pt) return pt;
      const p = mkPoint(x, y);
      created.push(p);
      return p;
    };

    if (mode === 'delete') {
      const target = pt || path || under.find((o) => o.elType === 'text' || o.elType === 'polygon' || o.elType === 'nonreflexangle');
      if (target) {
        b.removeObject(target);
        historyRef.current = historyRef.current.map((g) => g.filter((o) => b.objects[o.id])).filter((g) => g.length);
      }
      return;
    }
    if (mode === 'point') {
      const p = path ? b.create('glider', [x, y, path], { name: nextName() }) : mkPoint(x, y);
      record([p]);
      return;
    }
    if (mode === 'text') {
      const s = window.prompt('Nội dung chữ:');
      if (s) record([b.create('text', [x, y, s], { fontSize: 16 })]);
      return;
    }

    const sel = selRef.current;

    if (mode === 'intersect') {
      if (!path) return;
      sel.push(path);
      highlight(path);
      if (sel.length === 2) {
        const [o1, o2] = sel;
        clearSelection();
        const res = [b.create('intersection', [o1, o2, 0], { name: nextName() })];
        if (o1.elementClass === C_CIRCLE || o2.elementClass === C_CIRCLE) res.push(b.create('intersection', [o1, o2, 1], { name: nextName() }));
        record(res);
      }
      return;
    }

    if (mode === 'perpendicular' || mode === 'parallel' || mode === 'altitude') {
      const line = sel.find((o) => o.elementClass === C_LINE);
      const point = sel.find((o) => o.elementClass === C_POINT);
      if (!line && path && path.elementClass === C_LINE && !pt) {
        sel.push(path);
        highlight(path);
      } else if (!point) {
        const p = pickPoint();
        sel.push(p);
        highlight(p);
      }
      const L = sel.find((o) => o.elementClass === C_LINE);
      const P = sel.find((o) => o.elementClass === C_POINT);
      if (L && P) {
        clearSelection();
        if (mode === 'perpendicular') created.push(b.create('perpendicular', [L, P], { strokeColor: '#0f172a' }));
        else if (mode === 'parallel') created.push(b.create('parallel', [L, P], { strokeColor: '#0f172a' }));
        else {
          const H = b.create('perpendicularpoint', [P, L], { name: nextName() });
          const seg = b.create('segment', [P, H], { dash: 0 });
          const other = L.point1 !== H ? L.point1 : L.point2;
          created.push(H, seg, rightMark(P, H, other));
        }
        record(created);
      } else if (created.length) record(created);
      return;
    }

    if (mode === 'midpoint' && !pt && sel.length === 0 && path && path.elementClass === C_LINE) {
      record([b.create('midpoint', [path], { name: nextName() })]);
      return;
    }

    // các công cụ chọn điểm
    const p = pickPoint();
    if (mode === 'polygon') {
      if (sel.length >= 3 && p === sel[0]) {
        const pts = [...sel];
        clearSelection();
        record([...created, b.create('polygon', pts, { withLabel: false })]);
        return;
      }
      if (!sel.includes(p)) {
        sel.push(p);
        highlight(p);
      }
      if (created.length) record(created);
      return;
    }
    if (sel.includes(p)) return;
    sel.push(p);
    highlight(p);
    const tdef = TOOLS.find((t) => t.id === mode);
    if (sel.length < (tdef.need || 2)) {
      if (created.length) record(created);
      return;
    }
    const [A, B, C] = sel;
    clearSelection();
    switch (mode) {
      case 'segment':
        created.push(b.create('segment', [A, B]));
        break;
      case 'line':
        created.push(b.create('line', [A, B]));
        break;
      case 'ray':
        created.push(b.create('line', [A, B], { straightFirst: false, straightLast: true }));
        break;
      case 'circle':
        created.push(b.create('circle', [A, B]));
        break;
      case 'circle3':
        created.push(b.create('circumcircle', [A, B, C], { center: { name: nextName(), visible: true, withLabel: true } }));
        break;
      case 'midpoint':
        created.push(b.create('midpoint', [A, B], { name: nextName() }));
        break;
      case 'bisector':
        created.push(b.create('bisector', [A, B, C], { strokeColor: '#0f172a', dash: 2 }));
        created.push(...markAngle(A, B, C, false));
        break;
      case 'angle':
        created.push(...markAngle(A, B, C, true));
        break;
      default:
        break;
    }
    record(created);
  }

  /* ---------- mẫu hình ---------- */
  const insertTemplate = (id) => {
    const b = board();
    const P = (x, y, name, attrs = {}) => b.create('point', [x, y], { name, snapToGrid: snapRef.current, snapSizeX: 0.5, snapSizeY: 0.5, ...attrs });
    const D = (fx, fy, name) => b.create('point', [fx, fy], { name, fixed: true, fillColor: '#64748b', strokeColor: '#334155' });
    const poly = (pts) => b.create('polygon', pts, { withLabel: false });
    const els = [];
    const tri = () => {
      const A = P(-3, -2, 'A');
      const B = P(4, -2, 'B');
      const C = P(0.5, 3.5, 'C');
      els.push(A, B, C, poly([A, B, C]));
      return [A, B, C, els[3]];
    };
    switch (id) {
      case 'triangle':
        tri();
        break;
      case 'right': {
        const A = P(-3, -2, 'A');
        const B = P(3, -2, 'B');
        const perp = b.create('perpendicular', [b.create('line', [A, B], { visible: false }), A], { visible: false });
        const C = b.create('glider', [-3, 3, perp], { name: 'C' });
        els.push(A, B, C, poly([A, B, C]), rightMark(B, A, C));
        break;
      }
      case 'circum': {
        const [A, B, C] = tri();
        const O = b.create('circumcenter', [A, B, C], { name: 'O' });
        els.push(O, b.create('circle', [O, A]));
        break;
      }
      case 'incircle': {
        const [A, B, C] = tri();
        const I = b.create('incenter', [A, B, C], { name: 'I' });
        els.push(I, b.create('incircle', [A, B, C], { center: { visible: false } }));
        break;
      }
      case 'altitudes': {
        const [A, B, C, pg] = tri();
        const [ab, bc, ca] = pg.borders;
        const sides = [
          [A, bc, 'D', B],
          [B, ca, 'E', C],
          [C, ab, 'F', A],
        ];
        for (const [V, side, nm, other] of sides) {
          const H = b.create('perpendicularpoint', [V, side], { name: nm });
          els.push(H, b.create('segment', [V, H]), rightMark(V, H, other));
        }
        // H = A + B + C − 2O (O là tâm đường tròn ngoại tiếp)
        const O = b.create('circumcenter', [A, B, C], { visible: false, withLabel: false });
        els.push(O, D(() => A.X() + B.X() + C.X() - 2 * O.X(), () => A.Y() + B.Y() + C.Y() - 2 * O.Y(), 'H'));
        break;
      }
      case 'medians': {
        const [A, B, C] = tri();
        const M = b.create('midpoint', [B, C], { name: 'M' });
        const N = b.create('midpoint', [C, A], { name: 'N' });
        const Pp = b.create('midpoint', [A, B], { name: 'P' });
        els.push(M, N, Pp, b.create('segment', [A, M]), b.create('segment', [B, N]), b.create('segment', [C, Pp]));
        els.push(D(() => (A.X() + B.X() + C.X()) / 3, () => (A.Y() + B.Y() + C.Y()) / 3, 'G'));
        break;
      }
      case 'square': {
        const A = P(-2, -2, 'A');
        const B = P(2, -2, 'B');
        const C = D(() => B.X() - (B.Y() - A.Y()), () => B.Y() + (B.X() - A.X()), 'C');
        const Dd = D(() => A.X() - (B.Y() - A.Y()), () => A.Y() + (B.X() - A.X()), 'D');
        els.push(A, B, C, Dd, poly([A, B, C, Dd]));
        break;
      }
      case 'rect': {
        const A = P(-3, -2, 'A');
        const B = P(3, -2, 'B');
        const perp = b.create('perpendicular', [b.create('line', [A, B], { visible: false }), B], { visible: false });
        const C = b.create('glider', [3, 2, perp], { name: 'C' });
        const Dd = D(() => A.X() + C.X() - B.X(), () => A.Y() + C.Y() - B.Y(), 'D');
        els.push(A, B, C, Dd, poly([A, B, C, Dd]));
        break;
      }
      case 'parallelogram': {
        const A = P(-4, -2, 'A');
        const B = P(2, -2, 'B');
        const Dd = P(-2, 2, 'D');
        const C = D(() => B.X() + Dd.X() - A.X(), () => B.Y() + Dd.Y() - A.Y(), 'C');
        els.push(A, B, C, Dd, poly([A, B, C, Dd]));
        break;
      }
      case 'rhombus': {
        const A = P(-3, -1, 'A');
        const B = P(1, -2.5, 'B');
        const circ = b.create('circle', [A, B], { visible: false });
        const Dd = b.create('glider', [-1, 2.5, circ], { name: 'D' });
        const C = D(() => B.X() + Dd.X() - A.X(), () => B.Y() + Dd.Y() - A.Y(), 'C');
        els.push(A, B, C, Dd, poly([A, B, C, Dd]), b.create('segment', [A, C], { dash: 2 }), b.create('segment', [B, Dd], { dash: 2 }));
        break;
      }
      case 'trapezoid': {
        const A = P(-4, -2, 'A');
        const B = P(4, -2, 'B');
        const Dd = P(-2, 2, 'D');
        const par = b.create('parallel', [b.create('line', [A, B], { visible: false }), Dd], { visible: false });
        const C = b.create('glider', [2, 2, par], { name: 'C' });
        els.push(A, B, C, Dd, poly([A, B, C, Dd]));
        break;
      }
      case 'tangent': {
        const O = P(0, 0, 'O');
        const R = P(3, 0, 'R', { visible: false, withLabel: false });
        const circ = b.create('circle', [O, R]);
        const A = b.create('glider', [2, 2.2, circ], { name: 'A' });
        els.push(O, R, circ, A, b.create('tangent', [A]), b.create('segment', [O, A]));
        break;
      }
      default:
        break;
    }
    record(els);
  };

  /* ---------- thao tác chung ---------- */
  const undo = () => {
    const g = historyRef.current.pop();
    if (!g) return;
    const b = board();
    [...g].reverse().forEach((o) => {
      if (b.objects[o.id]) b.removeObject(o);
    });
    force((x) => x + 1);
  };

  const svgEl = () => board().renderer.svgRoot;
  const exportSvgText = () => {
    clearSelection();
    const el = svgEl();
    const txt = serializeSvg(el);
    return txt.replace(/<text /g, '<text font-family="Times New Roman, serif" font-style="italic" ');
  };
  const pngData = async () => {
    const txt = exportSvgText();
    const div = document.createElement('div');
    div.innerHTML = txt.replace(/^<\?xml[^>]*>\s*/, '');
    const svg = div.querySelector('svg');
    const rect = svgEl().getBoundingClientRect();
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    div.style.position = 'fixed';
    div.style.left = '-10000px';
    document.body.appendChild(div);
    try {
      return await svgToPngDataUrl(svg, 2);
    } finally {
      div.remove();
    }
  };

  const tikz = () => {
    const b = board();
    const [x0, y0, x1, y1] = b.getBoundingBox();
    const f = (v) => (Math.round(v * 100) / 100).toString();
    const P = (x, y) => `(${f(x)},${f(y)})`;
    const vis = (o) => o.visPropCalc?.visible !== false && o.visProp?.visible !== false;
    let s = '\\begin{tikzpicture}[line join=round, line cap=round, scale=0.8]\n';
    s += `  \\clip ${P(x0, y1)} rectangle ${P(x1, y0)};\n`;
    if (showGrid) s += `  \\draw[gray!25, very thin] ${P(Math.floor(x0), Math.floor(y1))} grid ${P(Math.ceil(x1), Math.ceil(y0))};\n`;
    if (showAxes) s += `  \\draw[->] ${P(x0, 0)} -- ${P(x1, 0)} node[below left] {$x$};\n  \\draw[->] ${P(0, y1)} -- ${P(0, y0)} node[below left] {$y$};\n`;
    for (const o of b.objectsList) {
      if (!vis(o) || ['axis', 'ticks', 'grid'].includes(o.elType)) continue;
      if (o.elType === 'polygon') {
        s += `  \\fill[blue!8] ${o.vertices.slice(0, -1).map((v) => P(v.X(), v.Y())).join(' -- ')} -- cycle;\n`;
      }
    }
    for (const o of b.objectsList) {
      if (!vis(o) || ['axis', 'ticks', 'grid'].includes(o.elType)) continue;
      const dash = o.visProp.dash ? '[dashed]' : '';
      if (o.elementClass === C_LINE) {
        const a = [o.point1.X(), o.point1.Y()];
        const c = [o.point2.X(), o.point2.Y()];
        const d = [c[0] - a[0], c[1] - a[1]];
        const L = 100 / (Math.hypot(...d) || 1);
        const sf = o.visProp.straightfirst;
        const sl = o.visProp.straightlast;
        const p1 = sf ? [a[0] - d[0] * L, a[1] - d[1] * L] : a;
        const p2 = sl ? [c[0] + d[0] * L, c[1] + d[1] * L] : c;
        s += `  \\draw${dash} ${P(...p1)} -- ${P(...p2)};\n`;
      } else if (o.elementClass === C_CIRCLE) {
        s += `  \\draw${dash} ${P(o.center.X(), o.center.Y())} circle (${f(o.Radius())});\n`;
      } else if (o.elType === 'nonreflexangle' || o.elType === 'angle') {
        const [A, B, C] = [o.point2, o.point1, o.point3];
        const a1 = (Math.atan2(A.Y() - B.Y(), A.X() - B.X()) * 180) / Math.PI;
        let a2 = (Math.atan2(C.Y() - B.Y(), C.X() - B.X()) * 180) / Math.PI;
        let start = a1;
        if ((((a2 - a1) % 360) + 360) % 360 > 180) [start, a2] = [a2, a1];
        let end = a2;
        while (end < start) end += 360;
        const r = f(o.visProp.radius === 'auto' ? 0.5 : o.visProp.radius || 0.5);
        if (Math.abs(end - start - 90) < 0.5) {
          s += `  \\draw ${P(B.X(), B.Y())} ++(${f(start)}:${r}) -- ++(${f(end)}:${r}) -- ++(${f(start + 180)}:${r});\n`;
        } else {
          s += `  \\draw[orange] ${P(B.X(), B.Y())} ++(${f(start)}:${r}) arc (${f(start)}:${f(end)}:${r});\n`;
        }
      }
    }
    for (const o of b.objectsList) {
      if (!vis(o)) continue;
      if (o.elementClass === C_POINT && o.elType !== 'text') {
        s += `  \\fill ${P(o.X(), o.Y())} circle (1.5pt);\n`;
        if (o.name && o.visProp.withlabel !== false) s += `  \\node[above right] at ${P(o.X(), o.Y())} {$${o.name}$};\n`;
      } else if (o.elType === 'text' && o.htmlStr && !o.htmlStr.includes('°')) {
        s += `  \\node at ${P(o.X(), o.Y())} {${o.htmlStr}};\n`;
      }
    }
    s += '\\end{tikzpicture}';
    return s;
  };

  const currentTool = TOOLS.find((t) => t.id === tool);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="no-print w-full shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-3 lg:w-60 lg:border-r lg:border-b-0">
        <div className="label px-2">Công cụ</div>
        <div className="grid grid-cols-2 gap-0.5 lg:grid-cols-1">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tool-btn ${tool === id ? 'active' : ''}`} onClick={() => chooseTool(id)}>
              <Icon size={16} className="shrink-0" /> {label}
            </button>
          ))}
        </div>
        <div className="label mt-4 px-2">Mẫu hình</div>
        <div className="grid grid-cols-2 gap-0.5 lg:grid-cols-1">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="tool-btn" onClick={() => insertTemplate(t.id)}>
              <Plus size={14} className="shrink-0 text-slate-400" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="no-print flex flex-wrap items-center gap-2 border-b border-slate-100 p-2">
            <button className="btn btn-sm" onClick={undo} title="Hoàn tác">
              <Undo2 size={14} /> Hoàn tác
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (window.confirm('Xoá toàn bộ hình vẽ?')) initBoard();
                setShowAxes(false);
                setShowGrid(true);
              }}
            >
              <Trash2 size={14} /> Xoá hết
            </button>
            <button className="btn btn-sm" onClick={() => board().setBoundingBox([-8, 6, 8, -6], true)}>
              <RotateCcw size={14} /> Khung mặc định
            </button>
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Lưới
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={showAxes} onChange={(e) => setShowAxes(e.target.checked)} /> Trục toạ độ
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Bắt điểm lưới
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-600">
              <input type="checkbox" checked={showMeasure} onChange={(e) => setShowMeasure(e.target.checked)} /> Số đo góc
            </label>
            <span className="ml-auto" />
            <button className="btn btn-sm" onClick={async () => downloadDataUrl(await pngData(), 'hinh-phang.png')}>
              <Download size={14} /> PNG
            </button>
            <button className="btn btn-sm" onClick={() => downloadText(exportSvgText(), 'hinh-phang.svg', 'image/svg+xml')}>
              <Download size={14} /> SVG
            </button>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await copyText(tikz());
                toast('Đã sao chép mã TikZ');
              }}
            >
              <Copy size={14} /> TikZ
            </button>
            <button
              className="btn btn-sm"
              onClick={async () => {
                try {
                  await api.images.saveDataUrl(await pngData(), 'Hình phẳng');
                  toast('Đã lưu vào thư viện hình');
                } catch (e) {
                  toast('Lỗi: ' + e.message, 'error');
                }
              }}
            >
              <ImagePlus size={14} /> Lưu thư viện
            </button>
          </div>
          <div className="no-print bg-indigo-50/60 px-3 py-1.5 text-xs text-indigo-800">
            <b>{currentTool.label}:</b> {currentTool.help}
          </div>
          <div id={boxId.current} className="jxgbox min-h-120 w-full flex-1" style={{ background: '#fff' }} />
        </div>
      </div>
    </div>
  );
}
