import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onCitationClick?: (citationText: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onCitationClick }) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Helper to format inline text: bold, italic, inline code, and citations
  const renderInlineText = (text: string): React.ReactNode => {
    // Regex matches inline code `code`, bold **text**, italic *text*, or citation [Page X] / [Section X]
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[(?:Page|Section|Under|Paragraph|Clause|Table|Exhibit|Note)[^\]]+\])/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Inline code
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold text
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic text
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Citation chip e.g. [Section 2.1] or [Page 3]
      if (part.startsWith('[') && part.endsWith(']')) {
        const citationLabel = part.slice(1, -1);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onCitationClick?.(citationLabel)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded transition-colors shadow-xs cursor-pointer"
            title={`Source citation: ${citationLabel}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {citationLabel}
          </button>
        );
      }

      return part;
    });
  };

  // Parse markdown into blocks
  const renderBlocks = () => {
    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code Block: ```language
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'text';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        const codeContent = codeLines.join('\n');
        const codeId = `code_${i}_${codeContent.substring(0, 10)}`;

        blocks.push(
          <div key={`code-block-${i}`} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 text-sm shadow-sm">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400 font-mono">
              <span className="uppercase tracking-wider font-semibold">{lang}</span>
              <button
                onClick={() => handleCopyCode(codeContent, codeId)}
                className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
                title="Copy code"
              >
                {copiedCodeId === codeId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
        continue;
      }

      // Markdown Table: lines starting with |
      if (line.trim().startsWith('|') && line.includes('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parseRow = (rowStr: string) => {
            const cells = rowStr
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim());
            return cells;
          };

          const headerCells = parseRow(tableLines[0]);
          // Check if second row is separator |---|---|
          const isSeparator = tableLines[1]?.includes('---');
          const bodyRows = tableLines.slice(isSeparator ? 2 : 1).map(parseRow);

          blocks.push(
            <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200 shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {headerCells.map((header, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2 font-semibold text-slate-800 text-xs tracking-wider uppercase">
                        {renderInlineText(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-slate-700 text-sm align-top">
                          {renderInlineText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Headings (#, ##, ###, ####)
      if (line.startsWith('# ')) {
        blocks.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2">
            {renderInlineText(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-2">
            {renderInlineText(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push(
          <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-900 mt-3 mb-1">
            {renderInlineText(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('#### ')) {
        blocks.push(
          <h4 key={`h4-${i}`} className="text-sm font-semibold text-slate-800 mt-2.5 mb-1">
            {renderInlineText(line.slice(5))}
          </h4>
        );
        i++;
        continue;
      }

      // Blockquotes (> Quote)
      if (line.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        blocks.push(
          <blockquote
            key={`quote-${i}`}
            className="my-2.5 pl-3.5 py-1 border-l-3 border-indigo-500 bg-indigo-50/50 rounded-r text-slate-700 italic text-sm"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="my-0.5">
                {renderInlineText(ql)}
              </p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Lists (Unordered - or *, Ordered 1.)
      const isUnordered = /^(\s*)([-*•])\s+(.*)/.test(line);
      const isOrdered = /^(\s*)(\d+)\.\s+(.*)/.test(line);

      if (isUnordered || isOrdered) {
        const listItems: { text: string; indent: number; type: 'ul' | 'ol'; num?: string }[] = [];

        while (i < lines.length) {
          const curLine = lines[i];
          const unMatch = curLine.match(/^(\s*)([-*•])\s+(.*)/);
          const ordMatch = curLine.match(/^(\s*)(\d+)\.\s+(.*)/);

          if (unMatch) {
            listItems.push({
              text: unMatch[3],
              indent: Math.floor(unMatch[1].length / 2),
              type: 'ul',
            });
            i++;
          } else if (ordMatch) {
            listItems.push({
              text: ordMatch[3],
              indent: Math.floor(ordMatch[1].length / 2),
              type: 'ol',
              num: ordMatch[2],
            });
            i++;
          } else if (curLine.trim() === '') {
            // Check next line to see if list continues
            if (i + 1 < lines.length && /^(\s*)([-*•]|\d+\.)\s+/.test(lines[i + 1])) {
              i++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        blocks.push(
          <div key={`list-${i}`} className="my-2 space-y-1.5">
            {listItems.map((item, lIdx) => (
              <div
                key={lIdx}
                className="flex items-start gap-2 text-slate-700 text-sm"
                style={{ marginLeft: `${item.indent * 1.25}rem` }}
              >
                {item.type === 'ol' ? (
                  <span className="font-semibold text-indigo-600 min-w-[1.25rem] text-xs pt-0.5">
                    {item.num}.
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                )}
                <div className="flex-1 leading-relaxed">{renderInlineText(item.text)}</div>
              </div>
            ))}
          </div>
        );
        continue;
      }

      // Empty line
      if (!line.trim()) {
        i++;
        continue;
      }

      // Regular Paragraph
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('>') &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('|') &&
        !/^(\s*)([-*•]|\d+\.)\s+/.test(lines[i])
      ) {
        pLines.push(lines[i]);
        i++;
      }

      if (pLines.length > 0) {
        blocks.push(
          <p key={`p-${i}`} className="my-2 text-slate-700 text-sm leading-relaxed">
            {renderInlineText(pLines.join(' '))}
          </p>
        );
      }
    }

    return blocks;
  };

  return <div className="space-y-1 text-slate-800">{renderBlocks()}</div>;
};
