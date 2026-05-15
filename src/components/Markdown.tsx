// Minimal, dependency-free Markdown renderer for the article content.
// Handles: ## headings, **bold**, *italic*, `code`, lists, paragraphs,
// > quotes, and GFM pipe tables (added 2026-05-15 — the comparison agent
// emits spec tables and they were rendering as raw "| a | b |" text).
import React from 'react';

function splitRow(row: string): string[] {
  // "| a | b | c |" → ["a","b","c"]  (tolerate missing outer pipes)
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

// A separator row is the |---|:--:|---| line right under the header.
function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const push = (n: React.ReactNode) => out.push(<React.Fragment key={key++}>{n}</React.Fragment>);
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > i) push(text.slice(i, m.index));
    if (m[1]) push(<strong>{m[2]}</strong>);
    else if (m[3]) push(<em>{m[4]}</em>);
    else if (m[5]) push(<code>{m[6]}</code>);
    else if (m[7]) push(<a href={m[9]} target="_blank" rel="noopener noreferrer">{m[8]}</a>);
    i = m.index + m[0].length;
  }
  if (i < text.length) push(text.slice(i));
  return out;
}

export default function Markdown({ children }: { children: string }) {
  const lines = children.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let buf: string[] = [];
  let listBuf: string[] | null = null;
  let tableBuf: string[] | null = null;

  const flushTable = () => {
    if (!tableBuf) return;
    // Valid GFM table needs a header + separator line at index 1. If that's
    // missing, it wasn't really a table — render the lines as a paragraph
    // so we never silently drop content.
    if (tableBuf.length < 2 || !isTableSeparator(tableBuf[1])) {
      const text = tableBuf.join(' ');
      blocks.push(<p key={blocks.length}>{inline(text)}</p>);
      tableBuf = null;
      return;
    }
    const header = splitRow(tableBuf[0]);
    const bodyRows = tableBuf.slice(2).map(splitRow); // row 1 is the separator
    blocks.push(
      <div key={blocks.length} className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {header.map((h, i) => (
                <th
                  key={i}
                  className="text-left font-semibold px-3 py-2 border-b border-white/15 text-white/90"
                >
                  {inline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((cells, r) => (
              <tr key={r} className="border-b border-white/5">
                {cells.map((c, ci) => (
                  <td key={ci} className="px-3 py-2 align-top text-white/75">
                    {inline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuf = null;
  };

  const flushPara = () => {
    if (buf.length) {
      blocks.push(<p key={blocks.length}>{inline(buf.join(' '))}</p>);
      buf = [];
    }
  };
  const flushList = () => {
    if (listBuf) {
      blocks.push(
        <ul key={blocks.length}>
          {listBuf.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ul>
      );
      listBuf = null;
    }
  };

  // A table row: starts with "|" and has at least two cells. We also
  // accept the separator line. Anything else closes an open table.
  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l) || isTableSeparator(l);

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); flushTable(); continue; }

    if (isTableRow(line)) {
      flushPara(); flushList();
      tableBuf = tableBuf ?? [];
      tableBuf.push(line);
      continue;
    }
    // Non-table line ends any table in progress.
    if (tableBuf) flushTable();

    if (line.startsWith('## ')) {
      flushPara(); flushList();
      blocks.push(<h2 key={blocks.length}>{inline(line.slice(3))}</h2>);
    } else if (line.startsWith('### ')) {
      flushPara(); flushList();
      blocks.push(<h3 key={blocks.length}>{inline(line.slice(4))}</h3>);
    } else if (line.startsWith('# ')) {
      flushPara(); flushList();
      blocks.push(<h2 key={blocks.length}>{inline(line.slice(2))}</h2>);
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      listBuf = listBuf ?? [];
      listBuf.push(line.replace(/^[-*]\s+/, ''));
    } else if (line.startsWith('> ')) {
      flushPara(); flushList();
      blocks.push(<blockquote key={blocks.length}>{inline(line.slice(2))}</blockquote>);
    } else {
      flushList();
      buf.push(line);
    }
  }
  flushPara(); flushList(); flushTable();

  return <div className="prose-tech">{blocks}</div>;
}
