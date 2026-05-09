export type Category = {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
};

export const CATEGORIES: Category[] = [
  { slug: 'ai',       name: 'AI',         description: 'Anything where artificial intelligence / ML / LLMs are the PRIMARY topic — new models (GPT, Claude, Gemini, Llama), AI features, AI startups, RAG, prompt engineering, AI safety. If a story is about an AI feature or model, this category — even if it ships inside an app or device.', emoji: '🤖', color: '#a855f7' },
  { slug: 'gaming',   name: 'Gaming',     description: 'Video game releases, reviews, gameplay, gaming hardware (consoles like PS5/Xbox/Switch, controllers), gaming services (Steam, PlayStation+, Game Pass), esports, game studios.', emoji: '🎮', color: '#22c55e' },
  { slug: 'hardware', name: 'Hardware',   description: 'PC/server hardware: CPUs, GPUs, chipsets, RAM, motherboards, SSDs, NICs, peripherals (keyboards/mice/docks), thermal solutions, benchmarks. NOT smartphones (use mobile). NOT consoles (use gaming).', emoji: '⚙️', color: '#f59e0b' },
  { slug: 'mobile',   name: 'Mobile',     description: 'Smartphones, tablets, wearables (smartwatches, fitness bands), iOS, Android, mobile carriers, mobile chips (Snapdragon, A-series). Includes phone-specific apps and accessories.', emoji: '📱', color: '#06b6d4' },
  { slug: 'software', name: 'Software',   description: 'Desktop OSes (Windows, macOS, Linux), developer tools, IDEs, programming languages, frameworks, version control, databases, build tools. NOT consumer web apps (use web). NOT AI tools (use ai).', emoji: '💾', color: '#3b82f6' },
  { slug: 'security', name: 'Security',   description: 'Cybersecurity: vulnerabilities, breaches, malware, ransomware, zero-days, security patches, privacy laws, encryption, authentication, infosec research.', emoji: '🛡️', color: '#ef4444' },
  { slug: 'crypto',   name: 'Crypto',     description: 'Cryptocurrencies, blockchain, Bitcoin, Ethereum, NFTs, DeFi, exchanges, crypto regulation, stablecoins, web3.', emoji: '₿',  color: '#eab308' },
  { slug: 'science',  name: 'Science',    description: 'Scientific research and discovery: space exploration (NASA, SpaceX, ESA), quantum computing, physics, biotech, climate science, chemistry. Basic research, not consumer products.', emoji: '🔬', color: '#14b8a6' },
  { slug: 'ev',       name: 'EV & Auto',  description: 'Electric vehicles (Tesla, Rivian, BYD, etc.), autonomous driving, charging infrastructure, battery tech for cars, mobility-as-a-service, automotive industry news.', emoji: '🚗', color: '#f97316' },
  { slug: 'web',      name: 'Web & Apps', description: 'Consumer web/mobile apps (Discord, WhatsApp, X, Instagram, YouTube), streaming services (Netflix, Spotify, Disney+), social networks, browsers, web standards. Use this if the story is about a CONSUMER web service rather than dev/OS software.', emoji: '🌐', color: '#ec4899' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
