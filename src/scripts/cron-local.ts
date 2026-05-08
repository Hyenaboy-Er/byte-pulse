import cron from 'node-cron';
import { runOnce } from '../lib/agents/orchestrator';
import { runMonitor } from '../lib/agents/monitor';

const WRITER_SCHEDULE       = process.env.CRON_SCHEDULE          ?? '*/15 * * * *'; // alle 15 Min (~96 Artikel/Tag)
const MONITOR_LIGHT_SCHEDULE = process.env.MONITOR_LIGHT_SCHEDULE  ?? '15 * * * *';   // stündlich :15 (Links + KI-Geruch, gratis)
const MONITOR_FULL_SCHEDULE  = process.env.MONITOR_FULL_SCHEDULE   ?? '0 8 * * *';    // täglich 8:00 (mit GPT-Faktencheck)

console.log(`[cron] Writer-Loop:    ${WRITER_SCHEDULE}`);
console.log(`[cron] Monitor-Light:  ${MONITOR_LIGHT_SCHEDULE} (gratis, jede Stunde)`);
console.log(`[cron] Monitor-Full:   ${MONITOR_FULL_SCHEDULE} (mit GPT-Faktencheck, 1×/Tag)`);
console.log('[cron] Erster Writer-Lauf in 10s, danach nach Schedule.');

setTimeout(() => writerRun(), 10_000);

cron.schedule(WRITER_SCHEDULE,       () => writerRun(),         { timezone: 'Europe/Berlin' });
cron.schedule(MONITOR_LIGHT_SCHEDULE, () => monitorRun(false),   { timezone: 'Europe/Berlin' });
cron.schedule(MONITOR_FULL_SCHEDULE,  () => monitorRun(true),    { timezone: 'Europe/Berlin' });

async function writerRun() {
  const t0 = Date.now();
  console.log(`\n[writer] === ${new Date().toLocaleString('de-DE')} ===`);
  try {
    const report = await runOnce();
    console.log(`[writer] ${Date.now() - t0}ms`);
    console.log(JSON.stringify(report, null, 2));
  } catch (err) { console.error('[writer] Fehler:', err); }
}

async function monitorRun(full: boolean) {
  const t0 = Date.now();
  console.log(`\n[monitor:${full ? 'full' : 'light'}] === ${new Date().toLocaleString('de-DE')} ===`);
  try {
    const report = await runMonitor({ hoursBack: 24, checkLinks: true, llmFactcheck: full });
    console.log(`[monitor] ${Date.now() - t0}ms — audited=${report.audited} avgQ=${report.avgQuality} flags=${report.flaggedFactuality.length}`);
    if (report.deadSourceLinks.length || report.flaggedFactuality.length) {
      console.log(JSON.stringify(report, null, 2));
    }
  } catch (err) { console.error('[monitor] Fehler:', err); }
}
