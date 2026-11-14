import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ImagePlus, Plus, RotateCcw, X } from 'lucide-react';
import { POINT_TYPES, PRESETS, buildScene, chainSegments, makeView, toTikz } from '../lib/solid3d.js';
import { copyText, downloadDataUrl, downloadText, serializeSvg, svgToPngDataUrl } from '../lib/exporters.js';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';

const DEFAULT_VIEW = { az: -25, el: 18 };
const PARAM_LABEL = { a: 'a', b: 'b', c: 'c', h: 'Chiều cao h', r: 'Bán kính r', R: 'Bán kính R', d: 'Độ lệch d' };

function cloneExtras(e) {
  return {
    points: (e.points || []).map((p) => ({ ...p })),
    segments: [...(e.segments || [])],
    fills: [...(e.fills || [])],
    rights: [...(e.rights || [])],
  };
}

function TagList({ items, onRemove, color = 'bg-slate-100 text-slate-700' }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((s, i) => (
        <span key={s + i} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-serif text-sm italic ${color}`}>
          {s}
          <button className="text-slate-400 not-italic hover:text-rose-600" onClick={() => onRemove(i)}>
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddInput({ placeholder, onAdd }) {
  const [v, setV] = useState('');
  const submit = () => {
    if (v.trim()) onAdd(v.trim());
    setV('');
  };
  return (
    <div className="flex gap-1">
      <input className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      <button className="btn btn-sm" onClick={submit}>
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function Geometry3D() {
  const toast = useToast();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId);
  const [params, setParams] = useState(preset.params);
  const [extras, setExtras] = useState(() => cloneExtras(preset.extras));
  const [view, setView] = useState(DEFAULT_VIEW);
  const [showHidden, setShowHidden] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [newPt, setNewPt] = useState({ name: 'M', type: 'mid', args: '' });
  const [size, setSize] = useState({ w: 640, h: 520 });
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(320, Math.floor(e.contentRect.width)), h: 520 }));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const choosePreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    setPresetId(id);
    setParams(p.params);
    setExtras(cloneExtras(p.extras));
  };

  const solid = useMemo(() => preset.build(params), [preset, params]);
  const scene = useMemo(() => buildScene(solid, extras, makeView(view.az, view.el), size), [solid, extras, view, size]);
  const chains = useMemo(() => chainSegments(scene.segs), [scene]);

  const onDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, ...view };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setView({
      az: d.az - (e.clientX - d.x) * 0.5,
      el: Math.max(-89, Math.min(89, d.el + (e.clientY - d.y) * 0.4)),
    });
  };
  const onUp = () => (drag.current = null);

  const setList = (key, fn) => setExtras((e) => ({ ...e, [key]: fn(e[key]) }));

  const nextName = (also = []) => {
    const used = new Set([
      ...Object.keys(solid.vertices),
      ...Object.keys(solid.points || {}),
      ...extras.points.map((p) => p.name),
      ...also,
    ]);
    for (const c of 'MNPQKHIEFGJLORTUVXYZ') if (!used.has(c)) return c;
    for (let i = 1; ; i++) if (!used.has('M' + i)) return 'M' + i;
  };

  const addPoint = () => {
    const name = newPt.name.trim();
    if (!name || !newPt.args.trim()) return;
    setList('points', (l) => [...l, { ...newPt, name }]);
    setNewPt((p) => ({ ...p, name: nextName([name]), args: '' }));
  };

  const pngData = () => svgToPngDataUrl(svgRef.current, 2);
  const fileBase = preset.id;

  const describe = (p) => {
    const t = POINT_TYPES.find((x) => x.id === p.type);
    return `${p.name}: ${t ? t.label.toLowerCase() : p.type} (${p.args})`;
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="no-print w-full shrink-0 space-y-4 overflow-y-auto border-b border-slate-200 bg-white p-4 lg:w-80 lg:border-r lg:border-b-0">
        <div>
          <label className="label">Hình</label>
          <select className="input" value={presetId} onChange={(e) => choosePreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(params).map((k) => (
            <div key={k}>
              <label className="label normal-case">{PARAM_LABEL[k] || k}</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                className="input"
                value={params[k]}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > 0) setParams((p) => ({ ...p, [k]: v }));
                }}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="label">Góc nhìn</label>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-16">Xoay</span>
              <input type="range" min="-180" max="180" className="flex-1" value={((((view.az + 180) % 360) + 360) % 360) - 180} onChange={(e) => setView((v) => ({ ...v, az: +e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16">Nghiêng</span>
              <input type="range" min="-89" max="89" className="flex-1" value={view.el} onChange={(e) => setView((v) => ({ ...v, el: +e.target.value }))} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Nét khuất
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Tên điểm
            </label>
            <button className="btn btn-sm" onClick={() => setView(DEFAULT_VIEW)}>
              <RotateCcw size={12} /> Mặc định
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <label className="label">Dựng thêm điểm</label>
          <div className="flex gap-1">
            <input className="input w-14 font-serif italic" value={newPt.name} onChange={(e) => setNewPt((p) => ({ ...p, name: e.target.value }))} />
            <select className="input" value={newPt.type} onChange={(e) => setNewPt((p) => ({ ...p, type: e.target.value }))}>
              {POINT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-1 flex gap-1">
            <input
              className="input"
              placeholder={POINT_TYPES.find((t) => t.id === newPt.type).hint}
              value={newPt.args}
              onChange={(e) => setNewPt((p) => ({ ...p, args: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addPoint()}
            />
            <button className="btn btn-sm" onClick={addPoint}>
              <Plus size={14} />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Gợi ý: {POINT_TYPES.find((t) => t.id === newPt.type).hint}</p>
          <div className="mt-2 space-y-1">
            {extras.points.map((p, i) => (
              <div key={p.name + i} className="flex items-center justify-between rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-800">
                <span>{describe(p)}</span>
                <button className="text-brand-300 hover:text-rose-600" onClick={() => setList('points', (l) => l.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Nối đoạn thẳng</label>
          <AddInput placeholder="Ví dụ: SO, AM hoặc SAC" onAdd={(v) => setList('segments', (l) => [...l, ...v.split(/[,;]/).map((s) => s.trim()).filter(Boolean)])} />
          <TagList items={extras.segments} onRemove={(i) => setList('segments', (l) => l.filter((_, j) => j !== i))} />
        </div>
        <div>
          <label className="label">Tô mặt phẳng</label>
          <AddInput placeholder="Ví dụ: SBD" onAdd={(v) => setList('fills', (l) => [...l, v])} />
          <TagList items={extras.fills} color="bg-blue-100 text-blue-800" onRemove={(i) => setList('fills', (l) => l.filter((_, j) => j !== i))} />
        </div>
        <div>
          <label className="label">Ký hiệu góc vuông</label>
          <AddInput placeholder="Ví dụ: SAB (vuông tại A)" onAdd={(v) => setList('rights', (l) => [...l, v])} />
          <TagList items={extras.rights} onRemove={(i) => setList('rights', (l) => l.filter((_, j) => j !== i))} />
        </div>
        {scene.errors.length > 0 && (
          <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
            {scene.errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 p-4">
        <div className="card overflow-hidden">
          <div className="no-print flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
            <h1 className="mr-auto font-semibold text-slate-700">{preset.name}</h1>
            <button className="btn btn-sm" onClick={async () => downloadDataUrl(await pngData(), `${fileBase}.png`)}>
              <Download size={14} /> PNG
            </button>
            <button className="btn btn-sm" onClick={() => downloadText(serializeSvg(svgRef.current), `${fileBase}.svg`, 'image/svg+xml')}>
              <Download size={14} /> SVG
            </button>
            <button
              className="btn btn-sm"
              onClick={async () => {
                await copyText(toTikz({ ...scene, segs: showHidden ? scene.segs : scene.segs.filter((s) => !s.hidden) }, size));
                toast('Đã sao chép mã TikZ');
              }}
            >
              <Copy size={14} /> TikZ
            </button>
            <button
              className="btn btn-sm"
              onClick={async () => {
                try {
                  await api.images.saveDataUrl(await pngData(), preset.name);
                  toast('Đã lưu vào thư viện hình');
                } catch (e) {
                  toast('Lỗi: ' + e.message, 'error');
                }
              }}
            >
              <ImagePlus size={14} /> Lưu thư viện
            </button>
          </div>
          <div ref={wrapRef} className="w-full">
            <svg
              ref={svgRef}
              width={size.w}
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="block cursor-grab touch-none bg-white active:cursor-grabbing"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
            >
              <rect width={size.w} height={size.h} fill="#fff" />
              {scene.fills.map((f, i) => (
                <polygon key={'f' + i} points={f.map((n) => scene.scr[n].join(',')).join(' ')} fill="rgba(59,130,246,0.15)" stroke="none" />
              ))}
              {chains
                .filter((c) => showHidden || !c.hidden)
                .map((c, i) => (
                  <polyline
                    key={'c' + i}
                    points={c.path.map((n) => scene.scr[n].map((v) => v.toFixed(2)).join(',')).join(' ')}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={c.hidden ? 1.2 : 1.6}
                    strokeDasharray={c.hidden ? '6 4' : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              {scene.rights.map((r, i) => (
                <polyline key={'r' + i} points={r.map((p) => p.join(',')).join(' ')} fill="none" stroke="#0f172a" strokeWidth="1" />
              ))}
              {scene.dots.map((n) => (
                <circle key={'d' + n} cx={scene.scr[n][0]} cy={scene.scr[n][1]} r="2.6" fill="#0f172a" />
              ))}
              {showLabels &&
                scene.labels.map((l) => (
                  <text
                    key={'l' + l.name}
                    x={l.lx}
                    y={l.ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="Times New Roman, serif"
                    fontStyle="italic"
                    fontSize="18"
                    fill="#0f172a"
                  >
                    {l.name}
                  </text>
                ))}
            </svg>
          </div>
          <div className="no-print border-t border-slate-100 p-3 text-xs text-slate-500">
            Kéo chuột trên hình để xoay. Nét khuất được tự động vẽ bằng nét đứt theo góc nhìn.
          </div>
        </div>
      </div>
    </div>
  );
}
