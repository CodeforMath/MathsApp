import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { LETTERS, SUBS, buildVersion, fmtScore, maxScore, scoreQuestion, typeOf, versionCodes } from '../lib/quiz.js';
import { MathText } from '../components/MathText.jsx';

function Timer({ seconds, onEnd }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) onEnd();
  }, [left, onEnd]);
  const m = Math.max(0, Math.floor(left / 60));
  const s = Math.max(0, left % 60);
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${left < 300 ? 'text-rose-600' : 'text-slate-700'}`}>
      <Clock size={16} /> {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function Item({ q, num, resp, setResp, done }) {
  const pts = done ? scoreQuestion(q, resp) : null;
  const full = done && ((q.type === 'mcq' && pts > 0) || (q.type === 'short' && pts > 0) || (q.type === 'tf' && pts === 1));
  return (
    <div className={`card p-4 ${done ? (full ? 'border-emerald-300' : 'border-rose-300') : ''}`}>
      <div className="flex gap-1.5">
        <span className="shrink-0 font-bold">Câu {num}.</span>
        <MathText className="min-w-0 flex-1">{q.content}</MathText>
        {done && (
          <span className={`ml-2 flex shrink-0 items-start gap-1 text-sm font-semibold ${full ? 'text-emerald-600' : 'text-rose-600'}`}>
            {full ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {fmtScore(pts)}đ
          </span>
        )}
      </div>
      {q.type === 'mcq' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const chosen = resp === i;
            const correct = done && i === q.answer;
            const wrong = done && chosen && i !== q.answer;
            return (
              <button
                key={i}
                disabled={done}
                onClick={() => setResp(i)}
                className={`flex gap-2 rounded-lg border px-3 py-2 text-left transition ${
                  correct ? 'border-emerald-400 bg-emerald-50' : wrong ? 'border-rose-400 bg-rose-50' : chosen ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="font-bold">{LETTERS[i]}.</span>
                <MathText inline>{o}</MathText>
              </button>
            );
          })}
        </div>
      )}
      {q.type === 'tf' && (
        <div className="mt-2 space-y-1.5">
          {q.statements.map((s, i) => {
            const v = resp?.[i];
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="font-semibold">{SUBS[i]})</span>
                <MathText inline className="flex-1">
                  {s}
                </MathText>
                {[true, false].map((val) => {
                  const chosen = v === val;
                  const correct = done && q.truth[i] === val;
                  return (
                    <button
                      key={String(val)}
                      disabled={done}
                      onClick={() => setResp({ ...(resp || {}), [i]: val })}
                      className={`w-14 rounded-md border px-2 py-1 text-xs font-bold ${
                        done && correct ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : done && chosen ? 'border-rose-400 bg-rose-100 text-rose-700' : chosen ? 'border-indigo-500 bg-indigo-100 text-indigo-700' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {val ? 'Đúng' : 'Sai'}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      {q.type === 'short' && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-slate-500">Trả lời:</span>
          <input className="input w-40 font-mono" disabled={done} value={resp ?? ''} onChange={(e) => setResp(e.target.value)} />
          {done && (
            <span className="text-sm">
              Đáp án: <b className="text-emerald-700">{q.answer}</b>
            </span>
          )}
        </div>
      )}
      {done && q.explanation && (
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-sm">
          <span className="font-semibold text-slate-600">Lời giải. </span>
          <MathText inline>{q.explanation}</MathText>
        </div>
      )}
    </div>
  );
}

export default function ExamTake() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [bank, setBank] = useState(null);
  const [code, setCode] = useState(null);
  const [name, setName] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [resp, setResp] = useState({});

  useEffect(() => {
    api.exams.get(id).then((e) => {
      setExam(e);
      setCode(versionCodes(e)[0]);
    });
    api.questions.list().then((l) => setBank(Object.fromEntries(l.map((q) => [q.id, q]))));
  }, [id]);

  const version = useMemo(() => (exam && bank ? buildVersion(exam, bank, code) : null), [exam, bank, code]);

  if (!version) return <div className="p-10 text-slate-500">Đang tải…</div>;

  const max = maxScore(version);
  const score = done ? version.parts.reduce((s, p) => s + p.items.reduce((t, q) => t + scoreQuestion(q, resp[q.id]), 0), 0) : 0;
  const answered = version.parts.reduce((s, p) => s + p.items.filter((q) => resp[q.id] !== undefined && resp[q.id] !== '').length, 0);
  const total = version.parts.reduce((s, p) => s + p.items.length, 0);

  const submit = () => {
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!started) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-4">
        <div className="card w-full max-w-md p-6">
          <h1 className="text-lg font-bold text-slate-800">{exam.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} câu · {exam.duration} phút · điểm tối đa {fmtScore(max)}
          </p>
          <label className="label mt-4">Họ và tên</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label mt-3">Mã đề</label>
          <select className="input" value={code ?? ''} onChange={(e) => setCode(e.target.value || null)}>
            {versionCodes(exam).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="">Đề gốc</option>
          </select>
          <button className="btn btn-primary mt-5 w-full" disabled={!total} onClick={() => setStarted(true)}>
            Bắt đầu làm bài
          </button>
          {!total && <p className="mt-2 text-center text-sm text-rose-600">Đề chưa có câu hỏi.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-2">
          <div className="mr-auto min-w-0">
            <div className="truncate font-semibold text-slate-800">{exam.title}</div>
            <div className="text-xs text-slate-500">
              {name || 'Thí sinh'} · Mã đề {code || 'gốc'} · đã làm {answered}/{total}
            </div>
          </div>
          {!done && <Timer seconds={exam.duration * 60} onEnd={submit} />}
          {!done ? (
            <button
              className="btn btn-primary"
              onClick={() => (answered < total ? window.confirm(`Còn ${total - answered} câu chưa làm. Nộp bài?`) && submit() : submit())}
            >
              Nộp bài
            </button>
          ) : (
            <div className="text-right">
              <div className="text-xl font-bold text-indigo-700">
                {fmtScore(score)} / {fmtScore(max)}
              </div>
              {max !== 10 && <div className="text-xs text-slate-500">Quy về thang 10: {fmtScore((score / max) * 10)}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        {version.parts.map((p) => (
          <div key={p.type}>
            <h2 className="mb-2 font-bold text-slate-700">{typeOf(p.type).part}</h2>
            <div className="space-y-3">
              {p.items.map((q, i) => (
                <Item key={q.id} q={q} num={i + 1} resp={resp[q.id]} done={done} setResp={(v) => setResp((r) => ({ ...r, [q.id]: v }))} />
              ))}
            </div>
          </div>
        ))}
        {!done && (
          <button className="btn btn-primary w-full py-2" onClick={submit}>
            Nộp bài
          </button>
        )}
      </div>
    </div>
  );
}
