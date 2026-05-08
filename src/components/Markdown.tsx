// Minimal, dependency-free Markdown renderer for the article content.
// Handles: ## headings, **bold**, *italic*, `code`, lists, paragraphs, > quotes.
import React from 'react';

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

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }

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
  flushPara(); flushList();

  return <div className="prose-tech">{blocks}</div>;
}
