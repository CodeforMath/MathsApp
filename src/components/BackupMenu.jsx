import { useRef } from 'react';
import { DatabaseBackup, Upload } from 'lucide-react';
import { api } from '../lib/api.js';
import { downloadText } from '../lib/exporters.js';
import { useToast } from './Toast.jsx';

/** Sao lưu toàn bộ dữ liệu (lưu trong trình duyệt) ra file JSON và khôi phục lại. */
export default function BackupMenu() {
  const toast = useToast();
  const fileRef = useRef(null);

  const backup = async () => {
    try {
      const data = await api.exportAll();
      const day = new Date().toISOString().slice(0, 10);
      downloadText(JSON.stringify(data), `mathsapp-sao-luu-${day}.json`, 'application/json');
      toast('Đã tải file sao lưu');
    } catch (e) {
      toast('Lỗi sao lưu: ' + e.message, 'error');
    }
  };

  const restore = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      if (!window.confirm('Khôi phục sẽ gộp dữ liệu trong file vào máy này (mục trùng sẽ bị ghi đè). Tiếp tục?')) return;
      const n = await api.importAll(data);
      toast(`Đã khôi phục ${n} mục. Đang tải lại…`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast('Lỗi khôi phục: ' + e.message, 'error');
    } finally {
      fileRef.current.value = '';
    }
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      <button className="btn btn-sm" onClick={backup} title="Tải toàn bộ bài giảng, câu hỏi, đề và ảnh về một file">
        <DatabaseBackup size={14} /> <span className="hidden sm:inline">Sao lưu</span>
      </button>
      <button className="btn btn-sm btn-dark" onClick={() => fileRef.current.click()} title="Nạp dữ liệu từ file sao lưu">
        <Upload size={14} /> <span className="hidden sm:inline">Khôi phục</span>
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files[0] && restore(e.target.files[0])} />
    </div>
  );
}
