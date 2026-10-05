import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathViewProps {
  text: string;
  className?: string;
  inline?: boolean;
}

export const MathView: React.FC<MathViewProps> = ({ text, className = '', inline = false }) => {
  const renderedContent = useMemo(() => {
    if (!text) return '';

    // Split text by $$...$$ and $...$
    // Use regex to find $...$ or $$...$$
    // Regex matches $$...$$ first, then $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    const parts = text.split(mathRegex);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-1 block text-center" />;
        } catch {
          return <code key={index} className="text-red-500">{part}</code>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block" />;
        } catch {
          return <code key={index} className="text-red-500">{part}</code>;
        }
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }, [text]);

  return <span className={`math-content ${inline ? 'inline' : 'block'} ${className}`}>{renderedContent}</span>;
};
