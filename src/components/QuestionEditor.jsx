import { useState } from 'react';
import Modal from './Modal.jsx';
import QuestionView from './QuestionView.jsx';
import { LETTERS, LEVELS, SUBS, TYPES, emptyQuestion } from '../lib/quiz.js';

export default function QuestionEditor({ initial, topics = [], onSave, onClose }) {
  const [q, setQ] = useState(() => {
    const base = emptyQuestion(initial?.type || 'mcq');
    return { ...base, ...initial, options: initial?.options || base.options, statements: initial?.statements || base.statements, truth: initial?.truth || base.truth };
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setQ((x) => ({ ...x, [k]: v }));
  const setArr = (k, i, v) => setQ((x) => ({ ...x, [k]: x[k].map((o, j) => (j === i ? v : o)) }));

  const changeType = (type) => {
    setQ((x) => ({ ...x, type, answer: type === 'short' ? (typeof x.answer === 'string' ? x.answer : '') : type === 'mcq' ? (typeof x.answer === 'number' ? x.answer : 0) : null }));
  };

  const clean = () => {
    const out = { type: q.type, topic: q.topic.trim(), grade: Number(q.grade) || null, level: q.level, content: q.content, explanation: q.explanation };
    if (q.type === 'mcq') Object.assign(out, { options: q.options, answer: q.answer });
    if (q.type === 'tf') Object.assign(out, { statements: q.statements, truth: q.truth });
    if (q.type === 'short') Object.assign(out, { answer: String(q.answer ?? '').trim() });
    return out;
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(clean());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      wide
      title={initial?.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !q.content.trim()}>
            {saving ? 'Đang lưu…' : 'Lưu câu hỏi'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="col-span-2">
              <label className="label">Dạng câu hỏi</label>
              <select className="input" value={q.type} onChange={(e) => changeType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mức độ</label>
              <select className="input" value={q.level} onChange={(e) => set('level', e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Lớp</label>
              <input className="input" type="number" min="1" max="12" value={q.grade ?? ''} onChange={(e) => set('grade', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Chủ đề</label>
            <input className="input" list="topic-list" value={q.topic} onChange={(e) => set('topic', e.target.value)} placeholder="Ví dụ: Ứng dụng đạo hàm" />
            <datalist id="topic-list">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Nội dung (Markdown, công thức trong $…$)</label>
            <textarea className="input min-h-28 font-mono text-[13px]" value={q.content} onChange={(e) => set('content', e.target.value)} />
          </div>

          {q.type === 'mcq' && (
            <div className="space-y-1.5">
              <label className="label">Phương án (chọn đáp án đúng)</label>
              {q.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className={`flex w-12 shrink-0 cursor-pointer items-center gap-1 text-sm font-bold ${q.answer === i ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <input type="radio" name="ans" checked={q.answer === i} onChange={() => set('answer', i)} />
                    {LETTERS[i]}
                  </label>
                  <input className="input font-mono text-[13px]" value={o} onChange={(e) => setArr('options', i, e.target.value)} />
                </div>
              ))}
            </div>
          )}

          {q.type === 'tf' && (
            <div className="space-y-1.5">
              <label className="label">Mệnh đề (đánh dấu mệnh đề đúng)</label>
              {q.statements.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 font-semibold text-slate-500">{SUBS[i]})</span>
                  <input className="input font-mono text-[13px]" value={s} onChange={(e) => setArr('statements', i, e.target.value)} />
                  <button
                    type="button"
                    className={`w-14 shrink-0 rounded-md px-2 py-1 text-xs font-bold ${q.truth[i] ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                    onClick={() => setArr('truth', i, !q.truth[i])}
                  >
                    {q.truth[i] ? 'Đúng' : 'Sai'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {q.type === 'short' && (
            <div>
              <label className="label">Đáp án (số hoặc chuỗi ngắn)</label>
              <input className="input w-48 font-mono" value={q.answer ?? ''} onChange={(e) => set('answer', e.target.value)} placeholder="ví dụ: 2,5" />
            </div>
          )}

          <div>
            <label className="label">Lời giải</label>
            <textarea className="input min-h-20 font-mono text-[13px]" value={q.explanation} onChange={(e) => set('explanation', e.target.value)} />
          </div>
        </div>
        <div>
          <div className="label">Xem trước</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <QuestionView q={q} num={1} showAnswer showExplanation meta />
          </div>
        </div>
      </div>
    </Modal>
  );
}
