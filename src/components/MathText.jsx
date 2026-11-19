import { memo, useEffect, useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import { IMAGE_SCHEME, api } from '../lib/api.js';

const katexOptions = { throwOnError: false, strict: 'ignore' };

// Cho phép ảnh trong thư viện (idb:<id>), các URL khác đi qua bộ lọc an toàn mặc định
const urlTransform = (url) => (url.startsWith(IMAGE_SCHEME) ? url : defaultUrlTransform(url));

/** Ảnh trong bài: nạp dữ liệu từ thư viện hình của trình duyệt khi src là idb:<id>. */
function MdImage({ src = '', alt, node: _node, ...rest }) {
  const id = src.startsWith(IMAGE_SCHEME) ? src.slice(IMAGE_SCHEME.length) : null;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api.images
      .get(id)
      .then((im) => alive && setData(im.dataUrl))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!id) return <img src={src} alt={alt} {...rest} />;
  if (missing) return <span className="text-sm text-rose-500 italic">[Không tìm thấy ảnh “{alt}” trong thư viện của trình duyệt này]</span>;
  return data ? <img src={data} alt={alt} {...rest} /> : null;
}

const components = { img: MdImage };

/** Hiển thị Markdown + công thức LaTeX ($...$, $$...$$). */
export const MathText = memo(function MathText({ children, inline = false, className = '' }) {
  return (
    <div className={`math-content ${inline ? 'math-inline inline' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, katexOptions]]}
        urlTransform={urlTransform}
        components={components}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  );
});

/** Hiển thị một biểu thức LaTeX thuần. */
export function Tex({ children, display = false, className = '' }) {
  const html = katex.renderToString(children || '', { ...katexOptions, displayMode: display });
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
