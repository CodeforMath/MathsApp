import { Suspense, lazy } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Box, BookOpen, ClipboardList, FileQuestion, Home as HomeIcon, LineChart, Shapes } from 'lucide-react';
import { ToastProvider } from './components/Toast.jsx';
import BackupMenu from './components/BackupMenu.jsx';
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

function TopBar() {
  return (
    <header className="no-print shrink-0">
      <div className="flex h-14 items-center gap-3 bg-white px-4">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 font-serif text-lg text-white italic shadow-sm shadow-brand-500/40">
            ∫
          </div>
          <span className="text-xl font-black tracking-tight text-brand-500">MathsApp</span>
        </NavLink>
        <span className="hidden text-sm text-slate-500 sm:inline">· Công cụ dạy học Toán</span>
        <BackupMenu />
      </div>
      <nav className="flex h-12 items-stretch gap-1 overflow-x-auto bg-black px-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `relative flex shrink-0 items-center gap-2 px-3 text-xs font-bold tracking-wide whitespace-nowrap uppercase transition lg:px-4 ${
                isActive
                  ? 'text-brand-400 after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-brand-400'
                  : 'text-slate-300 hover:text-white'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            <span className={end ? 'sr-only' : ''}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
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
        <div className="flex h-screen flex-col overflow-hidden bg-white">
          <TopBar />
          <main className="page-bg min-h-0 flex-1 overflow-auto">{routes}</main>
        </div>
      )}
    </ToastProvider>
  );
}
