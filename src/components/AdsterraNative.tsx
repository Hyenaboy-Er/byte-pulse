// Adsterra Native Banner — DISABLED 2026-05-12.
//
// User reported Chrome on smartphone flagging the site as showing spam ads
// (Adsterra's network profitablecpmratenetwork.com is on multiple anti-spam
// blocklists and Google Safe Browsing). That damages our SEO + AdSense
// approval chance + scares users away. Adsterra is not worth the risk for a
// young site — we'll rely on Amazon affiliates (working) and AdSense (after
// approval Day 7-10) instead.
//
// Component returns null so we don't have to touch every page that imports
// it. Leaving the file in place keeps git history clean and lets us flip a
// single flag if we ever want to re-enable.

export default function AdsterraNative() {
  return null;
}
