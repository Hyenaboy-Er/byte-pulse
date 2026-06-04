// AI glossary — definitions for common acronyms and concepts.
//
// NOT linked from the homepage yet. Data lives here; companion
// component (AiGlossary.tsx) renders search + lookup. Wire to a
// route when Serhat says go.

export interface GlossaryEntry {
  term: string;
  short: string;       // 1-2 sentence definition
  long: string;        // 1-2 paragraph deeper context
  category: 'hardware' | 'model' | 'training' | 'inference' | 'safety' | 'agentic' | 'platform';
  related: string[];   // related term names (must match other entry.term values)
  /** Optional: link to a Byte-Pulse article that goes deeper */
  deeperReadSlug?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // Hardware
  {
    term: 'NPU',
    short:
      'Neural Processing Unit. A silicon block optimized for low-power neural-network inference, typically on-device for phones and laptops.',
    long:
      'NPUs trade peak performance for energy efficiency. They run model inference at a few watts where a GPU would draw 100+. Modern examples: Apple Neural Engine, Qualcomm Hexagon, Intel AI Boost, AMD Ryzen AI. The 40-TOPS bar is the Copilot+ PC certification threshold as of 2026.',
    category: 'hardware',
    related: ['TOPS', 'GPU', 'TPU', 'Edge AI'],
    deeperReadSlug: 'what-is-an-npu-neural-processing-unit-explained',
  },
  {
    term: 'TPU',
    short:
      'Tensor Processing Unit. Google\'s custom AI accelerator, originally built for inference and now also a top-tier training chip.',
    long:
      'TPUs use a systolic-array architecture optimized for matrix multiplies (the bulk of transformer math). Current TPU v5p outperforms an H100 on dense training and costs Google less per FLOP than buying Nvidia. Outside Google Cloud you can\'t buy one.',
    category: 'hardware',
    related: ['GPU', 'NPU', 'ASIC', 'Systolic Array'],
  },
  {
    term: 'GPU',
    short:
      'Graphics Processing Unit. Originally for graphics, now the workhorse for AI training and large-scale inference.',
    long:
      'A modern GPU like Nvidia\'s H200 has 141 GB of HBM3e memory and 4.8 TB/s of bandwidth — both more important than peak TFLOPS for transformer inference, where memory bandwidth is the actual bottleneck. AMD\'s MI300X competes spec-wise but the software stack (ROCm) lags CUDA badly.',
    category: 'hardware',
    related: ['HBM', 'CUDA', 'NPU', 'TPU'],
  },
  {
    term: 'TOPS',
    short:
      'Trillions of Operations Per Second. Marketing metric for NPU performance — measures raw INT8 / INT4 ops per second, not real-world model throughput.',
    long:
      'TOPS counts have inflated since 2023 as vendors mix INT8 with INT4 and "sparse" ops to pump headline numbers. Real-world: a 40-TOPS NPU runs a 7B-parameter LLM at 5-10 tokens/sec; a 100-TOPS NPU doesn\'t hit 2x because memory bandwidth caps throughput first.',
    category: 'hardware',
    related: ['NPU', 'INT8', 'Quantization'],
  },
  {
    term: 'HBM',
    short:
      'High-Bandwidth Memory. Stacked DRAM tightly coupled to the GPU die — current standard for AI accelerators.',
    long:
      'HBM3e (2024-2025) hits ~9.2 Gbps per pin, giving an H200 its 4.8 TB/s aggregate bandwidth. HBM4 ships 2025-2026 with 36GB per stack and ~10 Gbps/pin. Supply-constrained: SK Hynix, Micron, and Samsung are the only producers; lead times are 12+ months.',
    category: 'hardware',
    related: ['GPU', 'TPU'],
  },
  // Models
  {
    term: 'LLM',
    short:
      'Large Language Model. A transformer trained on terabytes of text to predict the next token; the foundation of modern chatbots.',
    long:
      'Modern frontier LLMs (Claude Opus 4.x, GPT-5, Gemini 2.5 Pro) range from ~200B to ~2T parameters, train on ~10-20T tokens, and cost roughly $50-200M per training run end-to-end including compute, salaries, and data work.',
    category: 'model',
    related: ['Transformer', 'Token', 'Context window'],
  },
  {
    term: 'Transformer',
    short:
      'The neural-network architecture that underlies all current LLMs. Replaces RNNs with attention as the mechanism for handling sequence data.',
    long:
      'Introduced in 2017 ("Attention Is All You Need"). The key insight: attention lets every token "look at" every other token in parallel, which is what made GPU-scale training tractable. Every frontier LLM in 2026 is still a transformer variant, though architectural tweaks (RoPE, GQA, MoE) have layered on.',
    category: 'model',
    related: ['LLM', 'Attention', 'MoE'],
  },
  {
    term: 'MoE',
    short:
      'Mixture of Experts. An architectural trick where only a subset of model weights ("experts") activate per token, cutting compute cost.',
    long:
      'Mixtral, Llama 4, GPT-4o, and DeepSeek-V3 are MoE. A 400B-parameter MoE that activates 50B per token runs at ~50B inference cost while having 400B-worth of "memorized" capacity. Tradeoff: routing overhead, harder distributed-training, gateway logic can fail at the edges.',
    category: 'model',
    related: ['LLM', 'Sparse', 'Routing'],
  },
  {
    term: 'Token',
    short:
      'The unit an LLM processes — typically a sub-word chunk. About 4 characters or 0.75 English words per token on average.',
    long:
      'Tokenization choice matters: GPT-style BPE merges common pairs greedily, SentencePiece is closer to character-level for non-English, modern Claude/Gemini use tweaked BPE variants. A "1M token context window" = roughly 750k English words = a long novel.',
    category: 'model',
    related: ['LLM', 'Context window', 'Tokenizer'],
  },
  {
    term: 'Context window',
    short:
      'The maximum number of tokens a model can see at once — both the input prompt and the generated response count toward it.',
    long:
      'Current frontier: 1-2M tokens (Gemini 2.5, Claude 4.x). The cost of long context isn\'t linear: attention scales O(n²) in the naive case, mitigated by Ring Attention and similar tricks. Quality also degrades past ~50% of the advertised window — "long context is a lie" is a frequent practitioner complaint that has merit.',
    category: 'model',
    related: ['Token', 'LLM', 'Attention'],
  },
  // Training
  {
    term: 'RLHF',
    short:
      'Reinforcement Learning from Human Feedback. The fine-tuning step that turns a raw pretrained model into one that follows instructions and refuses harmful requests.',
    long:
      'RLHF starts with supervised fine-tuning on instruction data, then trains a reward model from human-ranked outputs, then optimizes the LLM against the reward model with PPO or DPO. Anthropic\'s "Constitutional AI" replaces step 2 with an LLM judge; DPO skips the explicit reward model and learns directly from pairs.',
    category: 'training',
    related: ['DPO', 'Constitutional AI', 'Fine-tuning'],
  },
  {
    term: 'Fine-tuning',
    short:
      'Taking a pretrained foundation model and training it further on a smaller, task-specific dataset.',
    long:
      'Modern fine-tuning is rarely full-weight — LoRA and QLoRA train tiny adapter layers that capture the task delta at 1-5% of the parameter count. A 7B model fine-tuned with QLoRA on a single H100 takes hours, not weeks.',
    category: 'training',
    related: ['LoRA', 'RLHF', 'Pretraining'],
  },
  // Inference
  {
    term: 'Quantization',
    short:
      'Reducing the bit-precision of model weights to make inference faster and smaller in memory.',
    long:
      'A 7B model at FP16 takes 14GB; quantized to INT4 it fits in 4GB and runs on a phone. Quality loss is non-trivial below 4-bit — newer methods like GPTQ, AWQ, and HQQ preserve more accuracy but compress harder. Most NPU inference is INT8 or lower.',
    category: 'inference',
    related: ['NPU', 'INT8', 'INT4'],
  },
  {
    term: 'Inference',
    short:
      'Using a trained model to produce outputs. The "running the model" half of the lifecycle (training is the other half).',
    long:
      'Inference cost dominates frontier LLM economics now — training a model once is millions, but serving it bills per-token. Per-token cost has fallen ~100x between 2022 and 2026, driven by speculative decoding, batching tricks, and chip improvements.',
    category: 'inference',
    related: ['Quantization', 'Batch', 'TPU', 'GPU'],
  },
  // Safety
  {
    term: 'Hallucination',
    short:
      'When an LLM produces fluent text that\'s confidently wrong — invented citations, fabricated numbers, made-up APIs.',
    long:
      'Hallucination is a feature of how LLMs work, not a bug — they\'re trained to produce plausible continuations, and plausibility ≠ truth. Mitigations: RAG, tool use, citation-required prompting, structured output. None eliminate the problem; they shift it.',
    category: 'safety',
    related: ['RAG', 'Grounding'],
  },
  {
    term: 'RAG',
    short:
      'Retrieval-Augmented Generation. Pulling relevant documents into the model\'s context before it answers, instead of relying on memorized knowledge.',
    long:
      'A typical RAG stack: chunk + embed documents (BAAI, OpenAI text-embedding-3, Cohere), store in a vector DB (Pinecone, Weaviate, Postgres+pgvector), retrieve top-k at query time, stuff into the LLM prompt. The bottleneck is rarely the LLM; it\'s the retrieval quality.',
    category: 'safety',
    related: ['Embedding', 'Vector DB', 'Hallucination'],
  },
  // Agentic
  {
    term: 'Agent',
    short:
      'An LLM-driven system that plans multi-step tasks, calls tools, observes results, and iterates — instead of just answering one prompt.',
    long:
      'Modern agents (Claude Code, Cursor Composer, OpenAI Operator) loop: think → call a tool → read the result → think again. Reliability depends on the model\'s tool-use training and the design of the tool surface. Agentic systems break differently from chat: silent loops, wrong-direction snowballs, context-budget exhaustion.',
    category: 'agentic',
    related: ['Tool use', 'MCP', 'ReAct'],
  },
  {
    term: 'MCP',
    short:
      'Model Context Protocol. Anthropic\'s open standard for connecting LLMs to external tools and data sources via a unified server interface.',
    long:
      'Released late 2024, MCP has become the de-facto standard for agent ↔ tool wiring. An MCP server exposes "tools" (functions the LLM can call) and "resources" (data it can read). Adopted by Claude, Cursor, Windsurf, Zed, JetBrains, and dozens of standalone IDEs.',
    category: 'agentic',
    related: ['Agent', 'Tool use'],
  },
  // Platform
  {
    term: 'CUDA',
    short:
      'Nvidia\'s parallel-computing platform. The software moat that keeps the AI industry on Nvidia hardware even when alternatives are cheaper.',
    long:
      'CUDA isn\'t one thing — it\'s a programming model, a runtime, a compiler (NVCC), and a stack of libraries (cuDNN, cuBLAS, NCCL, TensorRT). PyTorch and JAX both treat CUDA as the reference target. AMD ROCm and Intel oneAPI try to compete but lag by 18-24 months on every important library.',
    category: 'platform',
    related: ['GPU', 'PyTorch', 'ROCm'],
  },
];

export function findGlossary(term: string): GlossaryEntry | null {
  const lower = term.toLowerCase().trim();
  return (
    GLOSSARY.find((g) => g.term.toLowerCase() === lower) ??
    GLOSSARY.find((g) => g.term.toLowerCase().startsWith(lower)) ??
    null
  );
}

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return GLOSSARY;
  return GLOSSARY.filter(
    (g) =>
      g.term.toLowerCase().includes(q) ||
      g.short.toLowerCase().includes(q) ||
      g.long.toLowerCase().includes(q),
  );
}
