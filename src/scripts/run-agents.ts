import { runOnce } from '../lib/agents/orchestrator';

(async () => {
  const report = await runOnce();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.error ? 1 : 0);
})();
