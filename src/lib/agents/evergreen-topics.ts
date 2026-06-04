// Evergreen topic queue — high-intent, low-news-decay tech explainers.
//
// WHY (Serhat 2026-06-04): news articles decay to ~0 traffic within
// 30-90 days. Evergreens like "Best CPUs for Gaming 2026" pull steady
// search-traffic for 12-18 months — they're the difference between a
// magazine that runs only on news velocity and one that builds a
// permanent SEO footprint. AdSense + affiliate revenue compound on
// these because:
//   1. Higher dwell time (3-5x news articles)
//   2. Buyer-intent keywords ("best", "vs", "explained") = higher CPM
//   3. Backlink magnetism (people link to "what is X" pages)
//
// Selection criteria:
//   - Search volume >= 5k/month (rough proxy by estimated competition)
//   - Tech-niche locked (no off-topic risk)
//   - 9+ min reading time defensible (= we can write 2000+ words of
//     real depth without padding)
//   - Either explainer ("what is X") OR comparison ("X vs Y") OR
//     listicle ("best X for Y")

export interface EvergreenTopic {
  /** Canonical slug for the article URL */
  slug: string;
  /** Working title — drafter may sharpen */
  title: string;
  /** Type drives the prompt template */
  kind: 'explainer' | 'comparison' | 'listicle' | 'buyer-guide';
  /** One of CATEGORY_SLUGS */
  category: string;
  /** Target audience persona — drafter uses this to frame depth */
  persona: string;
  /** 3-5 SEO keywords the article must rank for */
  keywords: string[];
  /** Brief drafter brief — what the article must cover */
  brief: string;
}

export const EVERGREEN_QUEUE: EvergreenTopic[] = [
  // Tier 1 — high-volume "what is" explainers
  {
    slug: 'what-is-an-npu-neural-processing-unit-explained',
    title: 'What Is an NPU? Neural Processing Units Explained',
    kind: 'explainer',
    category: 'ai',
    persona: 'developer / IT-buyer trying to understand on-device AI hardware',
    keywords: ['NPU', 'Neural Processing Unit', 'NPU vs GPU', 'on-device AI', 'AI accelerator'],
    brief: `Cover: definition, history (from DSP→ML accelerator evolution), how
NPUs differ from CPUs/GPUs/TPUs at silicon level, current NPU products
(Apple Neural Engine, Qualcomm Hexagon, Intel AI Boost, AMD Ryzen AI,
Google Tensor), TOPS as a metric and its limits, power efficiency math,
real-world use cases (Recall, transcription, image gen), what software
APIs developers use (CoreML, DirectML, OpenVINO, ONNX Runtime), the
2026 NPU race (Copilot+ PC certification, 40 TOPS bar), what's still
unclear (cross-vendor benchmark, dev portability), buying advice.`,
  },
  {
    slug: 'ai-chips-explained-gpu-vs-tpu-vs-npu-vs-asic',
    title: 'AI Chips Explained: GPU vs TPU vs NPU vs ASIC',
    kind: 'comparison',
    category: 'hardware',
    persona: 'CTO / hardware-buyer deciding between AI compute options',
    keywords: ['AI chip', 'GPU vs TPU', 'NPU vs ASIC', 'AI accelerator comparison', 'ML hardware'],
    brief: `Side-by-side comparison: GPU (Nvidia H100/H200, B200, AMD MI300X)
vs TPU (Google v5e/v5p/Trillium) vs NPU (Apple, Qualcomm, Intel, AMD)
vs custom ASIC (Cerebras WSE-3, Groq LPU, Tenstorrent). For each:
silicon architecture summary, TOPS / TFLOPS / memory bandwidth,
$ per TFLOP, power per TFLOP, software stack maturity, where each
wins (training vs inference vs edge), recent benchmark data points.
Include a comparison table. End with buying framework: "If your use
case is X, pick Y."`,
  },
  {
    slug: 'best-cpus-for-gaming-2026-buyers-guide',
    title: 'Best CPUs for Gaming in 2026: Buyer\'s Guide',
    kind: 'buyer-guide',
    category: 'hardware',
    persona: 'PC gamer building or upgrading in 2026',
    keywords: ['best gaming CPU 2026', 'AMD vs Intel gaming', 'Ryzen 9000 X3D', 'Core Ultra gaming'],
    brief: `Tiers: Budget ($150-$250), Mid ($250-$400), High-end ($400-$600),
Enthusiast ($600+). For each tier pick 2 recommended chips (one AMD
one Intel where realistic), give: clock, cores, cache, IPC notes,
gaming-specific benchmarks (1080p, 1440p, 4K), power draw, platform
cost (motherboard + DDR5), upgrade headroom. Specifically address
X3D-cache CPUs and why they matter for gaming. End with "if you can
wait, here's what's coming Q3 2026". Include a quick-decision flowchart.`,
  },
  {
    slug: 'quantum-computing-explained-for-developers-2026',
    title: 'Quantum Computing Explained for Developers (2026 Update)',
    kind: 'explainer',
    category: 'science',
    persona: 'classical software engineer curious about quantum',
    keywords: ['quantum computing explained', 'qubits vs bits', 'quantum supremacy', 'quantum software'],
    brief: `From the developer's seat. Cover: classical bit vs qubit, superposition
and entanglement (avoid hype, explain operationally), gate-based vs
adiabatic vs annealing, current hardware landscape (IBM Heron, Google
Willow, IonQ, Quantinuum, PsiQuantum), error correction state of the
art (logical qubit cost: 1000+ physical), where quantum currently
beats classical (it doesn't, for now — explain why), shor/grover
algorithms in plain terms, cryptographic implications (PQC migration
already underway), how to start coding (Qiskit, Cirq, Q#). Be honest
about the "5-10 years out" timeline.`,
  },
  {
    slug: 'best-laptop-processors-2026-m5-vs-snapdragon-x-vs-lunar-lake',
    title: 'Best Laptop Processors 2026: Apple M5 vs Snapdragon X vs Intel Lunar Lake',
    kind: 'comparison',
    category: 'mobile',
    persona: 'laptop buyer choosing platform in 2026',
    keywords: ['M5 vs Snapdragon X', 'best laptop CPU 2026', 'Arm laptop processor', 'Lunar Lake'],
    brief: `Three-way comparison. For each platform: silicon node, CPU core count
and types (P+E or all-uniform), GPU architecture, NPU TOPS, memory
bandwidth, real-world battery life numbers, single-thread and multi-
thread benchmarks (Geekbench, Cinebench), gaming notes, software
compatibility (x86 vs Arm: Rosetta vs Prism), thermal envelope, OEM
adoption signal. Specific scenarios: "if you're a developer", "if you
edit video", "if you're a road warrior", "if you game on the go".`,
  },
  {
    slug: 'magsafe-vs-qi2-vs-qi-wireless-charging-explained',
    title: 'MagSafe vs Qi2 vs Qi: Wireless Charging Standards Explained',
    kind: 'explainer',
    category: 'mobile',
    persona: 'phone owner trying to understand what charger to buy',
    keywords: ['Qi2', 'MagSafe vs Qi2', 'wireless charging standards', 'magnetic charging'],
    brief: `Explain the family tree: Qi (2008) → MagSafe (Apple 2020) → Qi2
(adopted MagSafe magnetics 2024) → Qi2.2 (15W open, 2025). Cover:
wattage tiers, magnetic alignment science, why heat is the real
limiter not coil tech, what "MagSafe-compatible" actually means
on Android, EU's USB-C mandate and how it interacts, future of
NFC-Wireless-Power (the standard nobody talks about). Buying guide:
which charger for which phone, what to skip.`,
  },
  {
    slug: 'usb-c-power-delivery-explained-pd-3-2-and-ufcs',
    title: 'USB-C Power Delivery Explained: PD 3.2, EPR, and Why Some Chargers Are Slower',
    kind: 'explainer',
    category: 'hardware',
    persona: 'consumer / dev confused about why their fast charger isn\'t fast',
    keywords: ['USB-C PD', 'USB PD 3.2', 'EPR USB-C', 'PD vs PPS', 'why USB-C charging slow'],
    brief: `Why a 100W USB-C cable can charge slowly: PD profile mismatch, PPS
support, EPR (240W) vs SPR (100W) cabling. Cover: USB-C connector
spec history, PD 3.0 → 3.1 EPR → 3.2 AVS, PPS for high-efficiency
Android fast-charging, UFCS (China's competing standard), e-marker
chips in cables, why "any USB-C cable" is a lie. Practical: how to
verify your charger+cable+device combo will negotiate the right
profile. Include a buying-decision table.`,
  },
];

/**
 * Pick the next evergreen to write — skips any already published
 * (by slug existence check in the caller).
 */
export function pickEvergreen(publishedSlugs: Set<string>): EvergreenTopic | null {
  for (const t of EVERGREEN_QUEUE) {
    if (!publishedSlugs.has(t.slug)) return t;
  }
  return null;
}
