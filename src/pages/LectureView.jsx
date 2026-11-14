import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Maximize, Printer } from 'lucide-react';
import { api } from '../lib/api.js';
import { MathText } from '../components/MathText.jsx';

function Slides({ doc }) {
  const slides = doc.content.split(/^\s*---\s*$/m).map((s) => s.trim()).filter(Boolean);
  const [i, setI] = useState(0);
  const go = useCallback((d) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) go(1);
      if (['ArrowLeft', 'PageUp'].includes(e.key)) go(-1);
      if (e.key === 'Home') setI(0);
      if (e.key === 'End') setI(slides.length - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, slides.length]);

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8" onClick={() => go(1)}>
        <div className="aspect-video max-h-full w-full max-w-[min(100%,calc((100vh-6rem)*16/9))] overflow-auto rounded-xl bg-white p-[4%] shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <MathText className="text-[clamp(16px,2.2vw,30px)]">{slides[i] || ''}</MathText>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 pb-4 text-slate-300">
        <button className="rounded-full p-2 hover:bg-slate-800" onClick={() => go(-1)}>
          <ChevronLeft />
        </button>
        <span className="min-w-20 text-center text-sm">
          {i + 1} / {slides.length}
        </span>
        <button className="rounded-full p-2 hover:bg-slate-800" onClick={() => go(1)}>
          <ChevronRight />
        </button>
        <button className="rounded-full p-2 hover:bg-slate-800" title="Toàn màn hình" onClick={() => document.documentElement.requestFullscreen?.()}>
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}

export default function LectureView({ mode }) {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.lectures.get(id).then(setDoc).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="p-10 text-rose-600">{err}</div>;
  if (!doc) return <div className="p-10 text-slate-500">Đang tải…</div>;
  if (mode === 'slides') return <Slides doc={doc} />;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center gap-2 px-2">
        <span className="mr-auto text-sm text-slate-500">Xem trước bản in — chọn “Lưu dưới dạng PDF” trong hộp thoại in để xuất PDF.</span>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> In
        </button>
      </div>
      <div className="print-page mx-auto max-w-[210mm] bg-white p-[18mm] font-serif text-[17px] shadow">
        <MathText>{doc.content.replace(/^\s*---\s*$/gm, '')}</MathText>
      </div>
    </div>
  );
}
