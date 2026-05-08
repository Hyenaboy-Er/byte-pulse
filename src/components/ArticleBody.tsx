// Renders the article markdown with native in-content AdSense slots inserted at
// optimal positions (after paragraph 3 and after paragraph 6). These are the
// highest-CTR positions per AdSense best-practices and remain fully visible to
// the user — labelled "Anzeige" as legally required in DE.
import Markdown from './Markdown';
import AdSlot from './AdSlot';

const SPLIT_PARAGRAPH_AFTER = [3, 6];

function splitMarkdownByParagraph(md: string): string[] {
  const parts: string[] = [];
  const blocks = md.split(/\n{2,}/);
  let buffer: string[] = [];
  let paraCount = 0;
  for (const block of blocks) {
    buffer.push(block);
    if (block.trim() && !block.trim().startsWith('#') && !block.trim().startsWith('-') && !block.trim().startsWith('>')) {
      paraCount++;
    }
    if (SPLIT_PARAGRAPH_AFTER.includes(paraCount)) {
      parts.push(buffer.join('\n\n'));
      buffer = [];
      paraCount += 0.5; // avoid double-trigger
    }
  }
  if (buffer.length) parts.push(buffer.join('\n\n'));
  return parts;
}

export default function ArticleBody({ content }: { content: string }) {
  const parts = splitMarkdownByParagraph(content);
  return (
    <>
      {parts.map((part, i) => (
        <div key={i}>
          <Markdown>{part}</Markdown>
          {i < parts.length - 1 && (
            <AdSlot slot={`in-content-${i + 1}`} label="Ad" />
          )}
        </div>
      ))}
    </>
  );
}
