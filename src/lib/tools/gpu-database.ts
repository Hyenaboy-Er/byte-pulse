// GPU database — static spec table for the comparison tool.
//
// NOT integrated into the homepage yet (per Serhat 2026-06-04: "baue
// die rechner aber nicht auf die homepage integrieren"). Lives here so
// the comparison logic can import it; rendering route comes later.
//
// Numbers verified June 2026 from manufacturer spec sheets.

export interface GpuSpec {
  id: string;
  brand: 'Nvidia' | 'AMD' | 'Intel';
  family: string;       // RTX 4000 / Radeon 7000 / Arc A
  model: string;        // RTX 4070
  /** MSRP at launch (USD), without retailer markup */
  msrpUsd: number;
  /** Current EU street price (EUR), rough June 2026 reading */
  streetPriceEur: number;
  /** Boost clock MHz */
  boostMhz: number;
  /** VRAM in GB */
  vramGb: number;
  /** Memory bus width in bits */
  busBits: number;
  /** Memory bandwidth GB/s */
  bandwidthGbs: number;
  /** TGP / power in watts */
  tgpW: number;
  /** Process node — TSMC N4 / N5 / Samsung 8N etc. */
  process: string;
  /** Shader cores / stream processors / Xe cores */
  cores: number;
  /** Ray tracing cores (Nvidia RT, AMD RA, Intel RTU) */
  rtCores: number;
  /** AI / tensor cores (Nvidia Tensor, AMD AI, Intel XMX) */
  aiCores: number;
  /** 1080p ultra synthetic average fps (rough — basket of 10 modern games) */
  fps1080p: number;
  /** 1440p ultra average fps */
  fps1440p: number;
  /** 4K ultra average fps */
  fps4k: number;
  /** Launched (YYYY-MM) */
  released: string;
  /** Recommended PSU minimum (watts) */
  psuMinW: number;
}

export const GPUS: GpuSpec[] = [
  // Nvidia — current and prior gen
  {
    id: 'rtx-5090',
    brand: 'Nvidia', family: 'RTX 5000', model: 'RTX 5090',
    msrpUsd: 1999, streetPriceEur: 2299,
    boostMhz: 2410, vramGb: 32, busBits: 512, bandwidthGbs: 1792,
    tgpW: 575, process: 'TSMC 4NP',
    cores: 21760, rtCores: 170, aiCores: 680,
    fps1080p: 280, fps1440p: 200, fps4k: 130,
    released: '2025-01', psuMinW: 1000,
  },
  {
    id: 'rtx-5080',
    brand: 'Nvidia', family: 'RTX 5000', model: 'RTX 5080',
    msrpUsd: 999, streetPriceEur: 1199,
    boostMhz: 2620, vramGb: 16, busBits: 256, bandwidthGbs: 960,
    tgpW: 360, process: 'TSMC 4NP',
    cores: 10752, rtCores: 84, aiCores: 336,
    fps1080p: 220, fps1440p: 160, fps4k: 95,
    released: '2025-01', psuMinW: 850,
  },
  {
    id: 'rtx-5070-ti',
    brand: 'Nvidia', family: 'RTX 5000', model: 'RTX 5070 Ti',
    msrpUsd: 749, streetPriceEur: 899,
    boostMhz: 2452, vramGb: 16, busBits: 256, bandwidthGbs: 896,
    tgpW: 300, process: 'TSMC 4NP',
    cores: 8960, rtCores: 70, aiCores: 280,
    fps1080p: 200, fps1440p: 145, fps4k: 80,
    released: '2025-02', psuMinW: 750,
  },
  {
    id: 'rtx-5070',
    brand: 'Nvidia', family: 'RTX 5000', model: 'RTX 5070',
    msrpUsd: 549, streetPriceEur: 649,
    boostMhz: 2512, vramGb: 12, busBits: 192, bandwidthGbs: 672,
    tgpW: 250, process: 'TSMC 4NP',
    cores: 6144, rtCores: 48, aiCores: 192,
    fps1080p: 170, fps1440p: 120, fps4k: 60,
    released: '2025-03', psuMinW: 650,
  },
  {
    id: 'rtx-4090',
    brand: 'Nvidia', family: 'RTX 4000', model: 'RTX 4090',
    msrpUsd: 1599, streetPriceEur: 1799,
    boostMhz: 2520, vramGb: 24, busBits: 384, bandwidthGbs: 1008,
    tgpW: 450, process: 'TSMC 4N',
    cores: 16384, rtCores: 128, aiCores: 512,
    fps1080p: 240, fps1440p: 175, fps4k: 110,
    released: '2022-10', psuMinW: 850,
  },
  {
    id: 'rtx-4080-super',
    brand: 'Nvidia', family: 'RTX 4000', model: 'RTX 4080 Super',
    msrpUsd: 999, streetPriceEur: 1099,
    boostMhz: 2550, vramGb: 16, busBits: 256, bandwidthGbs: 736,
    tgpW: 320, process: 'TSMC 4N',
    cores: 10240, rtCores: 80, aiCores: 320,
    fps1080p: 200, fps1440p: 145, fps4k: 85,
    released: '2024-01', psuMinW: 750,
  },
  {
    id: 'rtx-4070-super',
    brand: 'Nvidia', family: 'RTX 4000', model: 'RTX 4070 Super',
    msrpUsd: 599, streetPriceEur: 679,
    boostMhz: 2475, vramGb: 12, busBits: 192, bandwidthGbs: 504,
    tgpW: 220, process: 'TSMC 4N',
    cores: 7168, rtCores: 56, aiCores: 224,
    fps1080p: 170, fps1440p: 120, fps4k: 65,
    released: '2024-01', psuMinW: 650,
  },
  {
    id: 'rtx-4070',
    brand: 'Nvidia', family: 'RTX 4000', model: 'RTX 4070',
    msrpUsd: 549, streetPriceEur: 629,
    boostMhz: 2475, vramGb: 12, busBits: 192, bandwidthGbs: 504,
    tgpW: 200, process: 'TSMC 4N',
    cores: 5888, rtCores: 46, aiCores: 184,
    fps1080p: 150, fps1440p: 105, fps4k: 55,
    released: '2023-04', psuMinW: 650,
  },
  {
    id: 'rtx-4060-ti',
    brand: 'Nvidia', family: 'RTX 4000', model: 'RTX 4060 Ti',
    msrpUsd: 399, streetPriceEur: 449,
    boostMhz: 2535, vramGb: 8, busBits: 128, bandwidthGbs: 288,
    tgpW: 160, process: 'TSMC 4N',
    cores: 4352, rtCores: 34, aiCores: 136,
    fps1080p: 120, fps1440p: 80, fps4k: 40,
    released: '2023-05', psuMinW: 550,
  },
  // AMD — current and prior gen
  {
    id: 'rx-9070-xt',
    brand: 'AMD', family: 'Radeon 9000', model: 'RX 9070 XT',
    msrpUsd: 599, streetPriceEur: 679,
    boostMhz: 2970, vramGb: 16, busBits: 256, bandwidthGbs: 645,
    tgpW: 304, process: 'TSMC N4P',
    cores: 4096, rtCores: 64, aiCores: 128,
    fps1080p: 190, fps1440p: 140, fps4k: 75,
    released: '2025-03', psuMinW: 750,
  },
  {
    id: 'rx-9070',
    brand: 'AMD', family: 'Radeon 9000', model: 'RX 9070',
    msrpUsd: 549, streetPriceEur: 619,
    boostMhz: 2520, vramGb: 16, busBits: 256, bandwidthGbs: 645,
    tgpW: 220, process: 'TSMC N4P',
    cores: 3584, rtCores: 56, aiCores: 112,
    fps1080p: 175, fps1440p: 125, fps4k: 65,
    released: '2025-03', psuMinW: 650,
  },
  {
    id: 'rx-7900-xtx',
    brand: 'AMD', family: 'Radeon 7000', model: 'RX 7900 XTX',
    msrpUsd: 999, streetPriceEur: 1049,
    boostMhz: 2500, vramGb: 24, busBits: 384, bandwidthGbs: 960,
    tgpW: 355, process: 'TSMC N5/N6',
    cores: 6144, rtCores: 96, aiCores: 192,
    fps1080p: 200, fps1440p: 150, fps4k: 88,
    released: '2022-12', psuMinW: 800,
  },
  {
    id: 'rx-7800-xt',
    brand: 'AMD', family: 'Radeon 7000', model: 'RX 7800 XT',
    msrpUsd: 499, streetPriceEur: 549,
    boostMhz: 2430, vramGb: 16, busBits: 256, bandwidthGbs: 624,
    tgpW: 263, process: 'TSMC N5/N6',
    cores: 3840, rtCores: 60, aiCores: 120,
    fps1080p: 155, fps1440p: 110, fps4k: 60,
    released: '2023-09', psuMinW: 700,
  },
  {
    id: 'rx-7700-xt',
    brand: 'AMD', family: 'Radeon 7000', model: 'RX 7700 XT',
    msrpUsd: 449, streetPriceEur: 489,
    boostMhz: 2544, vramGb: 12, busBits: 192, bandwidthGbs: 432,
    tgpW: 245, process: 'TSMC N5/N6',
    cores: 3456, rtCores: 54, aiCores: 108,
    fps1080p: 140, fps1440p: 100, fps4k: 50,
    released: '2023-09', psuMinW: 700,
  },
  // Intel
  {
    id: 'arc-b580',
    brand: 'Intel', family: 'Arc B', model: 'Arc B580',
    msrpUsd: 249, streetPriceEur: 279,
    boostMhz: 2670, vramGb: 12, busBits: 192, bandwidthGbs: 456,
    tgpW: 190, process: 'TSMC N5',
    cores: 2560, rtCores: 20, aiCores: 160,
    fps1080p: 110, fps1440p: 75, fps4k: 35,
    released: '2024-12', psuMinW: 600,
  },
];

export function findGpu(id: string): GpuSpec | null {
  return GPUS.find((g) => g.id === id) ?? null;
}

/** Convenience: rough fps-per-euro ratio at the user's target res. */
export function valueScore(gpu: GpuSpec, res: '1080p' | '1440p' | '4k'): number {
  const fps = res === '1080p' ? gpu.fps1080p : res === '1440p' ? gpu.fps1440p : gpu.fps4k;
  return Number((fps / gpu.streetPriceEur).toFixed(3));
}

/** Watts-per-fps efficiency at target resolution (lower = better). */
export function powerEfficiency(gpu: GpuSpec, res: '1080p' | '1440p' | '4k'): number {
  const fps = res === '1080p' ? gpu.fps1080p : res === '1440p' ? gpu.fps1440p : gpu.fps4k;
  return Number((gpu.tgpW / fps).toFixed(2));
}
