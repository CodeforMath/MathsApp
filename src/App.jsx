import { Suspense, lazy } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Box, BookOpen, ClipboardList, FileQuestion, Home as HomeIcon, LineChart, Shapes } from 'lucide-react';
import { ToastProvider } from './components/Toast.jsx';
import Home from './pages/Home.jsx';
const Geometry2D = lazy(() => import('./pages/Geometry2D.jsx'));
const Geometry3D = lazy(() => import('./pages/Geometry3D.jsx'));
const FunctionStudy = lazy(() => import('./pages/FunctionStudy.jsx'));
const Lectures = lazy(() => import('./pages/Lectures.jsx'));
const LectureView = lazy(() => import('./pages/LectureView.jsx'));
const QuestionBank = lazy(() => import('./pages/QuestionBank.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const ExamEditor = lazy(() => import('./pages/ExamEditor.jsx'));
const ExamPrint = lazy(() => import('./pages/ExamPrint.jsx'));
const ExamTake = lazy(() => import('./pages/ExamTake.jsx'));

const NAV = [
  { to: '/', label: 'Trang chủ', icon: HomeIcon, end: true },
  { to: '/hinh-phang', label: 'Hình phẳng', icon: Shapes },
  { to: '/hinh-khong-gian', label: 'Hình không gian', icon: Box },
  { to: '/ham-so', label: 'Khảo sát hàm số', icon: LineChart },
  { to: '/bai-giang', label: 'Bài giảng', icon: BookOpen },
  { to: '/cau-hoi', label: 'Ngân hàng câu hỏi', icon: FileQuestion },
  { to: '/de-thi', label: 'Đề kiểm tra', icon: ClipboardList },
];

function Sidebar() {
  return (
    <aside className="no-print flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white lg:w-56">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-3 lg:px-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 font-serif text-xl text-white italic">
          ∫
        </div>
        <div className="hidden lg:block">
          <div className="text-sm leading-tight font-bold text-slate-800">MathsApp</div>
          <div className="text-[11px] text-slate-500">Công cụ dạy học Toán</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const bare = /\/(in|trinh-chieu|lam-bai)$/.test(pathname);

  const routes = (
    <Suspense fallback={<div className="p-8 text-slate-400">Đang tải…</div>}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/hinh-phang" element={<Geometry2D />} />
      <Route path="/hinh-khong-gian" element={<Geometry3D />} />
      <Route path="/ham-so" element={<FunctionStudy />} />
      <Route path="/bai-giang" element={<Lectures />} />
      <Route path="/bai-giang/:id" element={<Lectures />} />
      <Route path="/bai-giang/:id/in" element={<LectureView mode="print" />} />
      <Route path="/bai-giang/:id/trinh-chieu" element={<LectureView mode="slides" />} />
      <Route path="/cau-hoi" element={<QuestionBank />} />
      <Route path="/de-thi" element={<Exams />} />
      <Route path="/de-thi/:id" element={<ExamEditor />} />
      <Route path="/de-thi/:id/in" element={<ExamPrint />} />
      <Route path="/de-thi/:id/lam-bai" element={<ExamTake />} />
      <Route path="*" element={<div className="p-10 text-slate-500">Không tìm thấy trang.</div>} />
    </Routes>
    </Suspense>
  );

  return (
    <ToastProvider>
      {bare ? (
        routes
      ) : (
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-auto">{routes}</main>
        </div>
      )}
    </ToastProvider>
  );
}
