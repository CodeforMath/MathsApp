import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ImagePlus, Play, Plus, Trash2 } from 'lucide-react';
import { analyzeFunction, compileFn, parseFunction, texOf, toTkzTab } from '../lib/analysis.js';
import { niceNumber } from '../lib/format.js';
import VariationTable from '../components/VariationTable.jsx';
import FunctionGraph, { COLORS, fmtNum } from '../components/FunctionGraph.jsx';
import { MathText, Tex } from '../components/MathText.jsx';
import { api } from '../lib/api.js';
import { copyText, downloadDataUrl, downloadText, htmlToPngDataUrl, serializeSvg, svgToPngDataUrl } from '../lib/exporters.js';
import { useToast } from '../components/Toast.jsx';

const EXAMPLES = [
  'x^3 - 3x + 2',
  '-x^3 + 3x^2 - 1',
  'x^4 - 2x^2 + 3',
  '-x^4/4 + 2x^2',
  '(2x + 1)/(x - 1)',
  '(x^2 - 2x + 2)/(x - 1)',
  'x/(x^2 + 1)',
  'x*e^(-x)',
  'ln(x)/x',
  'sqrt(4 - x^2)',
];

function buildSolution(r) {
  const L = [];
  L.push(`**1. Tập xác định:** $D = ${r.domainTex}$.`);
  if (r.dTex) {
    let s = `**2. Đạo hàm:** $y' = ${r.dTex}$.`;
    if (r.zerosTex.length) {
      s +=
        r.zerosTex.length === 1
          ? ` $y' = 0 \\Leftrightarrow x = ${r.zerosTex[0]}$.`
          : ` $y' = 0 \\Leftrightarrow ${r.zerosTex.map((t) => `x = ${t}`).join('$ hoặc $')}$.`;
    } else s += " Phương trình $y' = 0$ vô nghiệm trên khoảng xét.";
    if (r.ndTex.length) s += ` $y'$ không xác định tại $x = ${r.ndTex.join('; ')}$.`;
    L.push(s);
  }
  const lims = [];
  const first = r.nodes[0];
  const last = r.nodes[r.nodes.length - 1];
  if (first.kind === 'inf' && first.right) lims.push(`\\lim\\limits_{x \\to -\\infty} y = ${first.right.tex}`);
  if (last.kind === 'inf' && last.left) lims.push(`\\lim\\limits_{x \\to +\\infty} y = ${last.left.tex}`);
  for (const n of r.nodes) {
    if (!n.bar || n.kind === 'end') continue;
    if (n.left) lims.push(`\\lim\\limits_{x \\to ${n.tex}^-} y = ${n.left.tex}`);
    if (n.right) lims.push(`\\lim\\limits_{x \\to ${n.tex}^+} y = ${n.right.tex}`);
  }
  if (!r.range) {
    let s = '**3. Giới hạn và tiệm cận:** ';
    s += lims.length ? lims.map((l) => `$${l}$`).join('; ') + '.' : '';
    const { vertical, horizontal, oblique } = r.asymptotes;
    const asy = [];
    vertical.forEach((v) => asy.push(`đường thẳng $x = ${v.tex}$ là tiệm cận đứng`));
    horizontal.forEach((h) => asy.push(`đường thẳng $y = ${h.tex}$ là tiệm cận ngang`));
    oblique.forEach((o) => asy.push(`đường thẳng $y = ${o.tex}$ là tiệm cận xiên`));
    s += asy.length ? ` Suy ra ${asy.join('; ')} của đồ thị hàm số.` : ' Đồ thị hàm số không có tiệm cận.';
    L.push(s);
  }
  L.push(`**${r.range ? 3 : 4}. Bảng biến thiên:** (xem bảng bên dưới)`);
  const k = [];
  if (r.incTex.length) k.push(`Hàm số đồng biến trên ${r.incTex.map((t) => `$${t}$`).join(' và ')}`);
  if (r.decTex.length) k.push(`nghịch biến trên ${r.decTex.map((t) => `$${t}$`).join(' và ')}`);
  let concl = `**${r.range ? 4 : 5}. Kết luận:** ${k.join('; ')}.`;
  const mx = r.extrema.filter((e) => e.type === 'max');
  const mn = r.extrema.filter((e) => e.type === 'min');
  mx.forEach((e) => (concl += ` Hàm số đạt cực đại tại $x = ${e.xTex}$, $y_{\\text{CĐ}} = ${e.yTex}$.`));
  mn.forEach((e) => (concl += ` Hàm số đạt cực tiểu tại $x = ${e.xTex}$, $y_{\\text{CT}} = ${e.yTex}$.`));
  if (!r.extrema.length) concl += ' Hàm số không có cực trị.';
  L.push(concl);

  if (r.range) {
    const vals = [];
    for (const n of r.nodes) {
      for (const side of ['left', 'right']) {
        const v = n[side];
        if (v && v.defined) vals.push({ v: v.value, tex: v.tex, x: n.tex, attained: !n.bar });
      }
    }
    if (vals.length && vals.every((v) => Number.isFinite(v.v))) {
      const max = vals.reduce((a, b) => (b.v > a.v ? b : a));
      const min = vals.reduce((a, b) => (b.v < a.v ? b : a));
      const rng = `\\left[${niceNumber(r.range[0]).tex}; ${niceNumber(r.range[1]).tex}\\right]`;
      let s = '**GTLN – GTNN:** ';
      s += max.attained ? `$\\max\\limits_{${rng}} y = ${max.tex}$ tại $x = ${max.x}$; ` : 'Hàm số không đạt GTLN; ';
      s += min.attained ? `$\\min\\limits_{${rng}} y = ${min.tex}$ tại $x = ${min.x}$.` : 'hàm số không đạt GTNN.';
      L.push(s);
    }
  }
  // phân số dạng hiển thị lớn cho dễ đọc
  return L.join('\n\n').replace(/\\frac/g, '\\dfrac');
}

export default function FunctionStudy() {
  const toast = useToast();
  const [input, setInput] = useState('x^3 - 3x + 2');
  const [useRange, setUseRange] = useState(false);
  const [ra, setRa] = useState('-1');
  const [rb, setRb] = useState('2');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState([]); // đồ thị phụ: [{text}]
  const tableRef = useRef(null);
  const graphRef = useRef(null);

  const run = (text = input) => {
    setBusy(true);
    setError('');
    setTimeout(() => {
      try {
        const opts = {};
        if (useRange) {
          const a = parseFloat(String(ra).replace(',', '.'));
          const b = parseFloat(String(rb).replace(',', '.'));
          if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Đoạn xét không hợp lệ.');
          opts.range = [a, b];
        }
        setResult(analyzeFunction(text, opts));
      } catch (e) {
        setError(e.message);
        setResult(null);
      } finally {
        setBusy(false);
      }
    }, 10);
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const functions = useMemo(() => {
    const list = [];
    if (result) {
      const f = result.f;
      const [a, b] = result.range || [-Infinity, Infinity];
      list.push({ f: result.range ? (x) => (x < a || x > b ? NaN : f(x)) : f, color: COLORS[0] });
    }
    extra.forEach((e, i) => {
      try {
        list.push({ f: compileFn(parseFunction(e.text)), color: COLORS[(i + 1) % COLORS.length] });
      } catch {
        /* bỏ qua biểu thức lỗi */
      }
    });
    return list;
  }, [result, extra]);

  const marks = useMemo(() => {
    if (!result) return null;
    const { asymptotes, extrema } = result;
    return {
      vLines: asymptotes.vertical.map((v) => v.x),
      hLines: asymptotes.horizontal.map((h) => h.y),
      lines: asymptotes.oblique.map((o) => ({ a: o.a, b: o.b })),
      points: extrema.map((e) => ({
        x: e.x,
        y: e.y,
        label: `${e.type === 'max' ? 'CĐ' : 'CT'} (${fmtNum(e.x)}; ${fmtNum(e.y)})`,
        below: e.type === 'min',
        color: e.type === 'max' ? '#dc2626' : '#16a34a',
      })),
    };
  }, [result]);

  const fitHint = useMemo(() => {
    if (!result) return null;
    const xs = [0];
    const ys = [];
    for (const n of result.nodes) {
      if (Number.isFinite(n.x)) xs.push(n.x);
      for (const s of ['left', 'right']) if (n[s] && Number.isFinite(n[s].value)) ys.push(n[s].value);
    }
    if (result.range) xs.push(...result.range);
    const y0 = result.f(0);
    if (Number.isFinite(y0)) ys.push(y0);
    ys.push(0);
    return { xs, ys };
  }, [result]);

  const solution = useMemo(() => (result ? buildSolution(result) : ''), [result]);

  const tablePng = () => htmlToPngDataUrl(tableRef.current, 3);
  const graphPng = () => svgToPngDataUrl(graphRef.current.svg(), 2);

  const saveToLibrary = async (getPng, name) => {
    try {
      const dataUrl = await getPng();
      await api.images.saveDataUrl(dataUrl, name);
      toast('Đã lưu vào thư viện hình (dùng được trong Bài giảng)');
    } catch (e) {
      toast('Lỗi: ' + e.message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <h1 className="text-xl font-bold text-slate-800">Khảo sát hàm số – Bảng biến thiên – Đồ thị</h1>

      <div className="card mt-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label className="label">Hàm số y = f(x)</label>
            <input
              className="input font-mono"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              placeholder="Ví dụ: (2x+1)/(x-1)"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" checked={useRange} onChange={(e) => setUseRange(e.target.checked)} />
            Xét trên đoạn
          </label>
          {useRange && (
            <div className="flex items-center gap-1 pb-0.5">
              <span className="text-slate-500">[</span>
              <input className="input w-16 text-center" value={ra} onChange={(e) => setRa(e.target.value)} />
              <span className="text-slate-500">;</span>
              <input className="input w-16 text-center" value={rb} onChange={(e) => setRb(e.target.value)} />
              <span className="text-slate-500">]</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => run()} disabled={busy}>
            <Play size={16} /> {busy ? 'Đang tính…' : 'Khảo sát'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
              onClick={() => {
                setInput(ex);
                run(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Cú pháp: <code>x^2</code>, <code>sqrt(x)</code>, <code>cbrt(x)</code>, <code>ln(x)</code> hoặc <code>log(x)</code> (logarit tự nhiên),{' '}
          <code>log(x, 2)</code>, <code>e^x</code>, <code>abs(x)</code>, <code>sin(x)</code>, <code>pi</code>. Có thể viết <code>2x</code> thay cho{' '}
          <code>2*x</code>.
        </p>
        {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </div>

      {result && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="card p-4">
              <div className="mb-2 text-lg">
                <Tex>{`y = ${texOf(result.node)}`}</Tex>
              </div>
              {result.warnings.map((w) => (
                <div key={w} className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {w}
                </div>
              ))}
              <MathText>{solution}</MathText>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn btn-sm"
                  onClick={async () => {
                    await copyText(`**Khảo sát hàm số** $y = ${texOf(result.node)}$\n\n${solution}`);
                    toast('Đã sao chép lời giải (Markdown + LaTeX)');
                  }}
                >
                  <Copy size={14} /> Sao chép lời giải
                </button>
              </div>
            </div>

            <div className="card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="mr-auto font-semibold text-slate-700">Bảng biến thiên</h2>
                <button
                  className="btn btn-sm"
                  onClick={async () => {
                    await copyText(toTkzTab(result));
                    toast('Đã sao chép mã tkz-tab');
                  }}
                >
                  <Copy size={14} /> tkz-tab
                </button>
                <button className="btn btn-sm" onClick={async () => downloadDataUrl(await tablePng(), 'bang-bien-thien.png')}>
                  <Download size={14} /> PNG
                </button>
                <button className="btn btn-sm" onClick={() => saveToLibrary(tablePng, `BBT y = ${input}`)}>
                  <ImagePlus size={14} /> Lưu thư viện
                </button>
              </div>
              <div className="overflow-x-auto">
                <VariationTable ref={tableRef} result={result} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
                <h2 className="mr-auto font-semibold text-slate-700">Đồ thị</h2>
                <button className="btn btn-sm" onClick={async () => downloadDataUrl(await graphPng(), 'do-thi.png')}>
                  <Download size={14} /> PNG
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => downloadText(serializeSvg(graphRef.current.svg()), 'do-thi.svg', 'image/svg+xml')}
                >
                  <Download size={14} /> SVG
                </button>
                <button className="btn btn-sm" onClick={() => saveToLibrary(graphPng, `Đồ thị y = ${input}`)}>
                  <ImagePlus size={14} /> Lưu thư viện
                </button>
              </div>
              <FunctionGraph ref={graphRef} functions={functions} marks={marks} fitHint={fitHint} />
              <div className="border-t border-slate-100 p-3 text-xs text-slate-500">
                Kéo để di chuyển, cuộn chuột để phóng to/thu nhỏ. Đường nét đứt: tiệm cận.
              </div>
            </div>

            <div className="card p-4">
              <div className="mb-2 flex items-center">
                <h2 className="mr-auto font-semibold text-slate-700">Vẽ thêm đồ thị trên cùng hệ trục</h2>
                <button className="btn btn-sm" onClick={() => setExtra((l) => [...l, { id: Math.random(), text: '' }])}>
                  <Plus size={14} /> Thêm
                </button>
              </div>
              <div className="flex items-center gap-2 py-1 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: COLORS[0] }} />
                <span className="font-mono text-slate-600">y = {input}</span>
              </div>
              {extra.map((e, i) => (
                <div key={e.id} className="flex items-center gap-2 py-1">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[(i + 1) % COLORS.length] }} />
                  <input
                    className="input font-mono"
                    placeholder="ví dụ: x - 1"
                    value={e.text}
                    onChange={(ev) => setExtra((l) => l.map((x) => (x.id === e.id ? { ...x, text: ev.target.value } : x)))}
                  />
                  <button className="btn btn-sm btn-danger" onClick={() => setExtra((l) => l.filter((x) => x.id !== e.id))}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
