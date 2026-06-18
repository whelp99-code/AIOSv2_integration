#!/usr/bin/env node
/**
 * Live operational smoke for integration stack + lifecycle read-through.
 */

const PORTAL = process.env.PORTAL_URL || "http://127.0.0.1:3110";

const HEALTH_CHECKS = [
  "http://127.0.0.1:3010/api/outlook/status",
  "http://127.0.0.1:3101/api/health",
  "http://127.0.0.1:3110/api/integrations/health",
  "http://127.0.0.1:3201/api/health",
  "http://127.0.0.1:3500/api/system/health",
  "http://127.0.0.1:4000/api/health",
  "http://127.0.0.1:3600/health",
];

async function getJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { res, data };
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function main() {
  console.log(`Lifecycle ops smoke — portal ${PORTAL}\n`);

  for (const url of HEALTH_CHECKS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const ok = res.ok ? "ok" : `HTTP ${res.status}`;
      console.log(`[health] ${url} → ${ok}`);
      if (!res.ok) fail(`unhealthy: ${url}`);
    } catch (error) {
      console.log(`[health] ${url} → unreachable`);
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  const { res: summaryRes, data: summary } = await getJson(
    `${PORTAL}/api/lifecycle/summary`,
  );
  if (!summaryRes.ok) fail(`summary HTTP ${summaryRes.status}`);
  console.log("\n[summary]", JSON.stringify(summary, null, 2));

  if (summary.persistence?.available) {
    const dbOpp = summary.dbSummary?.opportunity ?? 0;
    const resolvedOpp = summary.summary?.opportunities ?? 0;
    if (dbOpp > 0 && resolvedOpp < dbOpp) {
      fail(
        `DB/memory mismatch: db opportunity=${dbOpp}, summary.opportunities=${resolvedOpp}`,
      );
    }
    console.log(
      `[read-through] opportunities memory+db aligned (resolved=${resolvedOpp}, db=${dbOpp})`,
    );
  }

  const { res: oppListRes, data: oppList } = await getJson(
    `${PORTAL}/api/lifecycle/opportunities`,
  );
  if (!oppListRes.ok) fail(`opportunities GET HTTP ${oppListRes.status}`);
  const listCount = oppList.opportunities?.length ?? 0;
  const summaryCount = summary.summary?.opportunities ?? 0;
  if (summary.persistence?.available && summaryCount > listCount) {
    fail(
      `list shorter than summary: list=${listCount}, summary=${summaryCount}`,
    );
  }
  console.log(`[opportunities] list count=${listCount}, summary=${summaryCount}`);

  const { res: createRes, data: created } = await getJson(
    `${PORTAL}/api/lifecycle/opportunities`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadKey: `ops-smoke-${Date.now()}`,
        title: "Ops smoke opportunity",
        messageIds: ["msg-ops-1"],
        summary: "live operational test",
      }),
    },
  );
  if (!createRes.ok) {
    fail(`opportunity POST HTTP ${createRes.status}: ${JSON.stringify(created)}`);
  }
  console.log(`[create] opportunity id=${created.opportunity?.id}`);

  const { data: afterSummary } = await getJson(`${PORTAL}/api/lifecycle/summary`);
  if ((afterSummary.summary?.opportunities ?? 0) < (summary.summary?.opportunities ?? 0) + 1) {
    fail("summary count did not increase after POST");
  }
  console.log("\n=== PASS ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
