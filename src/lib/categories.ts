export type Category = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
};

export const CATEGORIES: Category[] = [
  { slug: 'ai',       name: 'AI',         description: 'Artificial intelligence, LLMs, new models, AI tools.',         emoji: '🤖', color: '#a855f7' },
  { slug: 'gaming',   name: 'Gaming',     description: 'Game releases, reviews, hardware, streaming.',                 emoji: '🎮', color: '#22c55e' },
  { slug: 'hardware', name: 'Hardware',   description: 'CPUs, GPUs, chips, boards — anything that computes.',           emoji: '⚙️', color: '#f59e0b' },
  { slug: 'mobile',   name: 'Mobile',     description: 'Smartphones, wearables, iOS and Android.',                     emoji: '📱', color: '#06b6d4' },
  { slug: 'software', name: 'Software',   description: 'Apps, OSes, dev tools, updates.',                              emoji: '💾', color: '#3b82f6' },
  { slug: 'security', name: 'Security',   description: 'Cybersecurity, privacy, hacks and leaks.',                     emoji: '🛡️', color: '#ef4444' },
  { slug: 'crypto',   name: 'Crypto',     description: 'Blockchain, Bitcoin, NFTs, DeFi.',                             emoji: '₿',  color: '#eab308' },
  { slug: 'science',  name: 'Science',    description: 'Research, space, quantum, biotech.',                           emoji: '🔬', color: '#14b8a6' },
  { slug: 'ev',       name: 'EV & Auto',  description: 'Electric vehicles, autonomous driving, mobility.',             emoji: '🚗', color: '#f97316' },
  { slug: 'web',      name: 'Web & Apps', description: 'Web services, new apps, streaming, social.',                   emoji: '🌐', color: '#ec4899' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
