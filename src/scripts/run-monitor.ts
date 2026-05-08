import { runMonitor } from '../lib/agents/monitor';
(async () => {
  const r = await runMonitor({ hoursBack: 48, checkLinks: true, llmFactcheck: true });
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
})();
