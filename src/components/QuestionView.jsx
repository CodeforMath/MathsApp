import { MathText } from './MathText.jsx';
import { LETTERS, SUBS, levelOf, typeOf } from '../lib/quiz.js';

/** Hiển thị một câu hỏi (có thể kèm đáp án). */
export default function QuestionView({ q, num, showAnswer = false, showExplanation = false, compact = false, meta = false }) {
  const lv = levelOf(q.level);
  return (
    <div className="avoid-break">
      {meta && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{typeOf(q.type).label}</span>
          <span className={`rounded px-1.5 py-0.5 font-medium ${lv.color}`}>{lv.label}</span>
          {q.topic && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">{q.topic}</span>}
          {q.grade && <span className="text-slate-400">Lớp {q.grade}</span>}
        </div>
      )}
      <div className="flex gap-1.5">
        {num != null && <span className="shrink-0 font-bold whitespace-nowrap">Câu {num}.</span>}
        <MathText className="min-w-0 flex-1">{q.content}</MathText>
      </div>
      {q.type === 'mcq' && (
        <div className={`mt-1 grid gap-x-6 gap-y-1 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'}`}>
          {(q.options || []).map((o, i) => (
            <div
              key={i}
              className={`flex gap-1.5 rounded px-1 ${showAnswer && i === q.answer ? 'bg-emerald-100 font-medium text-emerald-900' : ''}`}
            >
              <span className="font-bold">{LETTERS[i]}.</span>
              <MathText inline>{o}</MathText>
            </div>
          ))}
        </div>
      )}
      {q.type === 'tf' && (
        <div className="mt-1 space-y-1">
          {(q.statements || []).map((s, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="font-semibold">{SUBS[i]})</span>
              <MathText inline className="flex-1">
                {s}
              </MathText>
              {showAnswer && (
                <span className={`ml-2 shrink-0 text-xs font-bold ${q.truth[i] ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {q.truth[i] ? 'Đúng' : 'Sai'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {q.type === 'short' && showAnswer && (
        <div className="mt-1 text-sm">
          Đáp án: <b className="text-emerald-700">{q.answer}</b>
        </div>
      )}
      {showExplanation && q.explanation && (
        <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-sm">
          <span className="font-semibold text-slate-600">Lời giải. </span>
          <MathText inline>{q.explanation}</MathText>
        </div>
      )}
    </div>
  );
}
