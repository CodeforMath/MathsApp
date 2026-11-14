import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';

const katexOptions = { throwOnError: false, strict: 'ignore' };

/** Hiển thị Markdown + công thức LaTeX ($...$, $$...$$). */
export const MathText = memo(function MathText({ children, inline = false, className = '' }) {
  return (
    <div className={`math-content ${inline ? 'math-inline inline' : ''} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[[rehypeKatex, katexOptions]]}>
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
