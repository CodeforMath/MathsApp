import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, PlayCircle, Plus, Printer, Save, Shuffle, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { LEVELS, POINTS, TYPES, fmtScore, levelOf, typeOf } from '../lib/quiz.js';
import QuestionView from '../components/QuestionView.jsx';
import { useQuestionFilter } from './QuestionBank.jsx';
import { useToast } from '../components/Toast.jsx';

export default function ExamEditor() {
  const { id } = useParams();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [bank, setBank] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [randN, setRandN] = useState(5);
  const { filtered, bar } = useQuestionFilter(bank);

  useEffect(() => {
    api.exams.get(id).then(setExam);
    api.questions.list().then(setBank);
  }, [id]);

  const byId = useMemo(() => Object.fromEntries(bank.map((q) => [q.id, q])), [bank]);
  if (!exam) return <div className="p-8 text-slate-500">Đang tải…</div>;

  const set = (patch) => {
    setExam((e) => ({ ...e, ...patch }));
    setDirty(true);
  };
  const ids = exam.questionIds || [];
  const selected = ids.map((x) => byId[x]).filter(Boolean);
  const has = new Set(ids);

  const add = (qid) => !has.has(qid) && set({ questionIds: [...ids, qid] });
  const removeQ = (qid) => set({ questionIds: ids.filter((x) => x !== qid) });
  const move = (i, d) => {
    const a = [...ids];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set({ questionIds: a });
  };
  const addRandom = () => {
    const pool = filtered.filter((q) => !has.has(q.id));
    const pick = [...pool].sort(() => Math.random() - 0.5).slice(0, Number(randN) || 0);
    if (!pick.length) return toast('Không còn câu phù hợp bộ lọc', 'error');
    set({ questionIds: [...ids, ...pick.map((q) => q.id)] });
    toast(`Đã thêm ngẫu nhiên ${pick.length} câu`);
  };

  const save = async () => {
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...data } = exam;
      await api.exams.update(exam.id, data);
      setDirty(false);
      toast('Đã lưu đề');
    } catch (e) {
      toast('Lỗi: ' + e.message, 'error');
    }
  };

  const openAfterSave = async (path) => {
    if (dirty) await save();
    window.open(path, '_blank');
  };

  const counts = TYPES.map((t) => ({ ...t, n: selected.filter((q) => q.type === t.id).length }));
  const total = counts.reduce((s, c) => s + c.n * POINTS[c.id], 0);
  const levelCounts = LEVELS.map((l) => ({ ...l, n: selected.filter((q) => q.level === l.id).length }));

  // Hiển thị theo thứ tự phần (I, II, III) như khi in
  const ordered = TYPES.flatMap((t) => selected.filter((q) => q.type === t.id));

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/de-thi" className="btn btn-sm">
          <ArrowLeft size={14} />
        </Link>
        <input
          className="mr-auto min-w-64 flex-1 rounded-md border border-transparent px-2 py-1 text-xl font-bold text-slate-800 outline-none hover:border-slate-200 focus:border-brand-400"
          value={exam.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <button className="btn btn-primary" onClick={save} disabled={!dirty}>
          <Save size={16} /> {dirty ? 'Lưu' : 'Đã lưu'}
        </button>
        <button className="btn" onClick={() => openAfterSave(`/de-thi/${exam.id}/in`)}>
          <Printer size={16} /> In đề
        </button>
        <button className="btn" onClick={() => openAfterSave(`/de-thi/${exam.id}/lam-bai`)}>
          <PlayCircle size={16} /> Làm bài
        </button>
      </div>

      <div className="card mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['school', 'Trường / Sở'],
          ['department', 'Tổ chuyên môn'],
          ['examName', 'Kỳ kiểm tra'],
          ['subject', 'Môn'],
        ].map(([k, l]) => (
          <div key={k}>
            <label className="label">{l}</label>
            <input className="input" value={exam[k] || ''} onChange={(e) => set({ [k]: e.target.value })} />
          </div>
        ))}
        <div>
          <label className="label">Thời gian (phút)</label>
          <input className="input" type="number" value={exam.duration} onChange={(e) => set({ duration: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Số mã đề</label>
          <input className="input" type="number" min="1" max="24" value={exam.versions} onChange={(e) => set({ versions: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Mã đề đầu tiên</label>
          <input className="input" type="number" value={exam.firstCode} onChange={(e) => set({ firstCode: Number(e.target.value) })} />
        </div>
        <div className="flex flex-col justify-end gap-1 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={exam.shuffleQuestions !== false} onChange={(e) => set({ shuffleQuestions: e.target.checked })} /> Trộn thứ tự câu
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={exam.shuffleOptions !== false} onChange={(e) => set({ shuffleOptions: e.target.checked })} /> Trộn phương án A–D
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card flex max-h-[75vh] flex-col">
          <div className="border-b border-slate-100 p-3">
            <h2 className="mb-2 font-semibold text-slate-700">Ngân hàng câu hỏi</h2>
            {bar}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Lấy ngẫu nhiên</span>
              <input className="input w-16" type="number" min="1" value={randN} onChange={(e) => setRandN(e.target.value)} />
              <span className="text-slate-500">câu theo bộ lọc</span>
              <button className="btn btn-sm" onClick={addRandom}>
                <Shuffle size={14} /> Thêm
              </button>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {filtered.map((q) => (
              <div key={q.id} className={`flex gap-2 rounded-lg border p-3 ${has.has(q.id) ? 'border-emerald-200 bg-emerald-50/40 opacity-60' : 'border-slate-200'}`}>
                <div className="min-w-0 flex-1 text-sm">
                  <QuestionView q={q} meta />
                </div>
                <button className="btn btn-sm h-fit" disabled={has.has(q.id)} onClick={() => add(q.id)}>
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex max-h-[75vh] flex-col">
          <div className="border-b border-slate-100 p-3">
            <h2 className="font-semibold text-slate-700">Đề đã chọn ({selected.length} câu)</h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {counts.map((c) => (
                <span key={c.id}>
                  {c.short}: <b className="text-slate-700">{c.n}</b> × {fmtScore(POINTS[c.id])}đ
                </span>
              ))}
              <span>
                Tổng điểm tối đa: <b className="text-brand-700">{fmtScore(total)}</b>
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {levelCounts.map((l) => (
                <span key={l.id} className={`rounded px-1.5 py-0.5 text-[11px] ${l.color}`}>
                  {l.label}: {l.n}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {!selected.length && <div className="p-6 text-center text-sm text-slate-400">Bấm + ở danh sách bên trái để thêm câu hỏi.</div>}
            {ordered.map((q) => {
              const i = ids.indexOf(q.id);
              return (
                <div key={q.id} className="flex gap-2 rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="mb-1 flex gap-1 text-[11px]">
                      <span className="rounded bg-slate-100 px-1.5">{typeOf(q.type).short}</span>
                      <span className={`rounded px-1.5 ${levelOf(q.level).color}`}>{levelOf(q.level).label}</span>
                    </div>
                    <QuestionView q={q} showAnswer />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn btn-sm" onClick={() => move(i, -1)}>
                      <ArrowUp size={12} />
                    </button>
                    <button className="btn btn-sm" onClick={() => move(i, 1)}>
                      <ArrowDown size={12} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeQ(q.id)}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
