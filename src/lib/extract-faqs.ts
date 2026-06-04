// FAQ extraction — parses an article body (markdown or HTML-ish) for
// a "Frequently Asked Questions" section and returns Q&A pairs that
// can be emitted as schema.org FAQPage JSON-LD.
//
// WHY (Serhat 2026-06-04): the 7 evergreens all include a FAQ block
// per the writer's mandatory skeleton. Emitting FAQPage JSON-LD makes
// Google show FAQ rich-snippets in search results — typically a
// 30-40% CTR boost on top of existing ranking. Zero risk: schema
// already supported, just wasn't generated.
//
// Parse strategy: we look for an H2 whose text matches "Frequently
// Asked Questions" / "FAQ" / "FAQs", then walk forward until the next
// H2 boundary, extracting question/answer pairs at the H3 level OR
// "**Q:** … **A:** …" pattern OR bolded question + following paragraph.

export interface FaqPair {
  q: string;
  a: string;
}

const FAQ_HEADING = /^#{2,3}\s*(?:frequently\s+asked\s+questions|faq[s]?)\s*$/im;

/**
 * Split a markdown body into the FAQ section and the rest.
 * Returns { faqMd: '', rest: full } if no FAQ section detected.
 */
function isolateFaqSection(md: string): { faqMd: string; rest: string } {
  const lines = md.split('\n');
  let faqStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (FAQ_HEADING.test(lines[i])) {
      faqStart = i + 1;
      break;
    }
  }
  if (faqStart < 0) return { faqMd: '', rest: md };

  // Walk forward until next H2 (## ) — the FAQ section ends there.
  let faqEnd = lines.length;
  for (let i = faqStart; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      faqEnd = i;
      break;
    }
  }
  return {
    faqMd: lines.slice(faqStart, faqEnd).join('\n').trim(),
    rest: lines.slice(0, faqStart - 1).concat(lines.slice(faqEnd)).join('\n'),
  };
}

/**
 * From an isolated FAQ section in markdown, pull out Q&A pairs.
 */
function parsePairs(faqMd: string): FaqPair[] {
  if (!faqMd.trim()) return [];

  const pairs: FaqPair[] = [];

  // Pattern 1 — H3 questions:
  //   ### Some question?
  //   Answer paragraph(s)…
  const h3Re = /^###\s+(.+)$/gm;
  const matches = Array.from(faqMd.matchAll(h3Re));
  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const q = matches[i][1].trim();
      const startIdx = matches[i].index! + matches[i][0].length;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index! : faqMd.length;
      const a = faqMd.slice(startIdx, endIdx).trim();
      if (q && a) pairs.push({ q: cleanQ(q), a: cleanA(a) });
    }
    return pairs;
  }

  // Pattern 2 — bold Q + paragraph:
  //   **Some question?**
  //   Answer line
  const boldQRe = /^\*\*([^*\n][^*\n]*?\?)\*\*\s*$/gm;
  const boldMatches = Array.from(faqMd.matchAll(boldQRe));
  if (boldMatches.length >= 2) {
    for (let i = 0; i < boldMatches.length; i++) {
      const q = boldMatches[i][1].trim();
      const startIdx = boldMatches[i].index! + boldMatches[i][0].length;
      const endIdx = i + 1 < boldMatches.length ? boldMatches[i + 1].index! : faqMd.length;
      const a = faqMd.slice(startIdx, endIdx).trim();
      if (q && a) pairs.push({ q: cleanQ(q), a: cleanA(a) });
    }
    return pairs;
  }

  // Pattern 3 — Q: / A: convention:
  //   **Q:** Some question
  //   **A:** Answer
  const qaRe = /\*\*Q:\*\*\s*(.+?)\n+\*\*A:\*\*\s*([\s\S]+?)(?=\n+\*\*Q:\*\*|\n*$)/g;
  for (const m of faqMd.matchAll(qaRe)) {
    const q = m[1].trim();
    const a = m[2].trim();
    if (q && a) pairs.push({ q: cleanQ(q), a: cleanA(a) });
  }

  return pairs;
}

function cleanQ(s: string): string {
  return s
    .replace(/^[#*\s]+/, '')
    .replace(/^Q[:.]?\s*/i, '')
    .trim()
    .slice(0, 220);
}

function cleanA(s: string): string {
  return s
    .replace(/^[*\s]+/, '')
    .replace(/^A[:.]?\s*/i, '')
    // Strip markdown links → just visible text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip emphasis
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_+/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

/**
 * Public: extract FAQ pairs from an article body. Returns [] if no
 * FAQ section detected or parsed; the caller should conditionally
 * emit FAQPage JSON-LD only when this is non-empty.
 */
export function extractFaqs(body: string): FaqPair[] {
  if (!body || body.length < 200) return [];
  const { faqMd } = isolateFaqSection(body);
  if (!faqMd) return [];
  // Cap at 10 — Google's FAQPage spec allows more but rich-snippets
  // typically only render the first ~4-6, and large schema blobs
  // get truncated by validators.
  return parsePairs(faqMd).slice(0, 10);
}
