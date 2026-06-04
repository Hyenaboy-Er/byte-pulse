'use client';

// GPU comparator — side-by-side comparison + value/efficiency scoring.
//
// NOT linked from the homepage yet (Serhat 2026-06-04: "baue es aber
// nicht integrieren"). Component is fully self-contained — drop it
// into any route when ready.
//
// Usage when ready:
//   import { GpuComparator } from '@/components/tools/GpuComparator';
//   export default function ToolsGpuPage() {
//     return <GpuComparator />;
//   }
//
// Design choices:
//   - Pure client component, no API needed (data is bundled).
//   - 3-column responsive: cards on mobile, table on desktop.
//   - Tailwind-only styling, matches the rest of Byte-Pulse.
//   - Default selection: RTX 5070 vs RX 9070 XT (most-searched June 2026).

import { useMemo, useState } from 'react';
import {
  GPUS,
  valueScore,
  powerEfficiency,
  type GpuSpec,
} from '@/lib/tools/gpu-database';

type Resolution = '1080p' | '1440p' | '4k';

export function GpuComparator() {
  const [leftId, setLeftId] = useState<string>('rtx-5070');
  const [rightId, setRightId] = useState<string>('rx-9070-xt');
  const [res, setRes] = useState<Resolution>('1440p');

  const left = useMemo(() => GPUS.find((g) => g.id === leftId)!, [leftId]);
  const right = useMemo(() => GPUS.find((g) => g.id === rightId)!, [rightId]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">
          GPU Comparator
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Side-by-side specs, value, and power efficiency for current
          consumer GPUs. Numbers verified June 2026 from manufacturer
          sheets and a basket of 10 modern games at ultra settings.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <PickerSelect
          label="Left GPU"
          value={leftId}
          onChange={setLeftId}
          options={GPUS}
        />
        <PickerSelect
          label="Right GPU"
          value={rightId}
          onChange={setRightId}
          options={GPUS}
        />
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wider text-zinc-400 mb-1">
            Target resolution
          </label>
          <select
            value={res}
            onChange={(e) => setRes(e.target.value as Resolution)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm"
          >
            <option value="1080p">1080p Ultra</option>
            <option value="1440p">1440p Ultra</option>
            <option value="4k">4K Ultra</option>
          </select>
        </div>
      </div>

      <Verdict left={left} right={right} res={res} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card gpu={left} res={res} sideLabel="Left" />
        <Card gpu={right} res={res} sideLabel="Right" />
      </div>

      <ComparisonTable left={left} right={right} res={res} />

      <p className="mt-6 text-xs text-zinc-500">
        Disclaimer: street prices vary by region and retailer. FPS
        figures are averages — your game and your settings will land
        a bit higher or lower. Verified June 2026.
      </p>
    </div>
  );
}

function PickerSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: GpuSpec[];
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs uppercase tracking-wider text-zinc-400 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm"
      >
        {options.map((g) => (
          <option key={g.id} value={g.id}>
            {g.brand} {g.model}
          </option>
        ))}
      </select>
    </div>
  );
}

function Verdict({
  left,
  right,
  res,
}: {
  left: GpuSpec;
  right: GpuSpec;
  res: Resolution;
}) {
  const lValue = valueScore(left, res);
  const rValue = valueScore(right, res);
  const lPower = powerEfficiency(left, res);
  const rPower = powerEfficiency(right, res);
  const betterValue = lValue > rValue ? left : right;
  const betterPower = lPower < rPower ? left : right;
  const fpsKey = res === '1080p' ? 'fps1080p' : res === '1440p' ? 'fps1440p' : 'fps4k';
  const lFps = left[fpsKey];
  const rFps = right[fpsKey];
  const faster = lFps > rFps ? left : right;

  return (
    <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/60 p-4 mb-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">
        Snap Verdict ({res})
      </h2>
      <ul className="text-sm space-y-1">
        <li>
          <span className="text-zinc-400">Pure performance:</span>{' '}
          <strong>{faster.brand} {faster.model}</strong> wins ({lFps} vs {rFps} fps)
        </li>
        <li>
          <span className="text-zinc-400">FPS per euro:</span>{' '}
          <strong>{betterValue.brand} {betterValue.model}</strong>{' '}
          (€{(1000 / (betterValue === left ? lValue : rValue)).toFixed(0)} per 1000 fps)
        </li>
        <li>
          <span className="text-zinc-400">Power efficiency:</span>{' '}
          <strong>{betterPower.brand} {betterPower.model}</strong>{' '}
          ({(betterPower === left ? lPower : rPower).toFixed(2)} W/fps)
        </li>
      </ul>
    </div>
  );
}

function Card({
  gpu,
  res,
  sideLabel,
}: {
  gpu: GpuSpec;
  res: Resolution;
  sideLabel: string;
}) {
  const fpsKey = res === '1080p' ? 'fps1080p' : res === '1440p' ? 'fps1440p' : 'fps4k';
  return (
    <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
        {sideLabel}
      </div>
      <h3 className="text-xl font-display font-extrabold tracking-tight">
        {gpu.brand} {gpu.model}
      </h3>
      <div className="text-xs text-zinc-400 mb-3">
        {gpu.family} · launched {gpu.released}
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-400">{res} fps</dt>
        <dd className="font-mono text-right">{gpu[fpsKey]}</dd>

        <dt className="text-zinc-400">MSRP</dt>
        <dd className="font-mono text-right">${gpu.msrpUsd}</dd>

        <dt className="text-zinc-400">EU street</dt>
        <dd className="font-mono text-right">€{gpu.streetPriceEur}</dd>

        <dt className="text-zinc-400">VRAM</dt>
        <dd className="font-mono text-right">{gpu.vramGb} GB</dd>

        <dt className="text-zinc-400">Bandwidth</dt>
        <dd className="font-mono text-right">{gpu.bandwidthGbs} GB/s</dd>

        <dt className="text-zinc-400">Power (TGP)</dt>
        <dd className="font-mono text-right">{gpu.tgpW} W</dd>

        <dt className="text-zinc-400">PSU min</dt>
        <dd className="font-mono text-right">{gpu.psuMinW} W</dd>

        <dt className="text-zinc-400">Process</dt>
        <dd className="font-mono text-right">{gpu.process}</dd>
      </dl>
    </div>
  );
}

function ComparisonTable({
  left,
  right,
  res,
}: {
  left: GpuSpec;
  right: GpuSpec;
  res: Resolution;
}) {
  const rows: Array<[string, string | number, string | number]> = [
    ['Boost clock (MHz)', left.boostMhz, right.boostMhz],
    ['Shader cores', left.cores.toLocaleString(), right.cores.toLocaleString()],
    ['RT cores', left.rtCores, right.rtCores],
    ['AI / tensor cores', left.aiCores, right.aiCores],
    ['Bus width (bit)', left.busBits, right.busBits],
    ['1080p Ultra fps', left.fps1080p, right.fps1080p],
    ['1440p Ultra fps', left.fps1440p, right.fps1440p],
    ['4K Ultra fps', left.fps4k, right.fps4k],
    [
      `${res} fps / €`,
      valueScore(left, res),
      valueScore(right, res),
    ],
    [
      `W per ${res} fps`,
      powerEfficiency(left, res),
      powerEfficiency(right, res),
    ],
  ];
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-400 border-b border-zinc-800">
            <th className="text-left py-2 pr-3">Spec</th>
            <th className="text-right py-2 px-3">
              {left.brand} {left.model}
            </th>
            <th className="text-right py-2 pl-3">
              {right.brand} {right.model}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, l, r]) => (
            <tr key={label} className="border-b border-zinc-900">
              <td className="py-2 pr-3 text-zinc-300">{label}</td>
              <td className="py-2 px-3 text-right font-mono">{l}</td>
              <td className="py-2 pl-3 text-right font-mono">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
