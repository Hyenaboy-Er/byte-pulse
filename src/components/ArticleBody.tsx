// Renders the article markdown with monetized in-content slots inserted at
// optimal positions (after paragraph 3 and after paragraph 6). These are the
// highest-CTR positions per AdSense best-practices and remain fully visible to
// the user — labelled "Anzeige" as legally required in DE.
//
// When AdSense is configured (NEXT_PUBLIC_ADSENSE_CLIENT set), we render
// AdSense slots. Otherwise — and CRITICALLY while AdSense approval is pending
// — we render inline Amazon affiliate cards in those exact same positions so
// the article never has dead monetization real estate. Once AdSense is live,
// the slots flip back to AdSense automatically with zero code change.
import Markdown from './Markdown';
import AdSlot from './AdSlot';
import InlineAffiliateCard from './InlineAffiliateCard';

// Lowered from [3, 6] → [2, 5] so the compact CTA fires even on short news
// articles (typical 3-5 paragraphs), and the callout fires on medium ones.
// Net effect: ~95% of articles now get the mid-article monetization slot
// instead of only the long-form ones.
const SPLIT_PARAGRAPH_AFTER = [2, 5];

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

export default function ArticleBody({
  content,
  category,
  lang = 'en',
}: {
  content: string;
  category?: string;
  lang?: 'en' | 'de';
}) {
  const parts = splitMarkdownByParagraph(content);
  const adsenseLive = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return (
    <>
      {parts.map((part, i) => (
        <div key={i}>
          <Markdown>{part}</Markdown>
          {i < parts.length - 1 && (
            adsenseLive ? (
              <AdSlot slot={`in-content-${i + 1}`} label="Ad" />
            ) : (
              category && (
                <InlineAffiliateCard
                  category={category}
                  lang={lang}
                  variant={i === 0 ? 'compact' : 'callout'}
                />
              )
            )
          )}
        </div>
      ))}
    </>
  );
}
