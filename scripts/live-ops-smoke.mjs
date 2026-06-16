#!/usr/bin/env node
/**
 * Live ops smoke — stack health, lifecycle, mail proxy, ops console.
 * Exit 0 when all critical checks pass.
 */

const BASE = process.env.PORTAL_BASE_URL ?? "http://127.0.0.1:3110";

const STACK_HEALTH = [
  "http://127.0.0.1:3010/api/outlook/status",
  "http://127.0.0.1:3101/api/health",
  "http://127.0.0.1:3201/api/health",
  "http://127.0.0.1:3500/api/system/health",
  "http://127.0.0.1:4000/api/health",
  "http://127.0.0.1:3600/health",
  `${BASE}/api/integrations/health`,
];

async function getJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function checkStack() {
  const results = [];
  for (const url of STACK_HEALTH) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    results.push({ url, status: res.status, ok: res.ok });
  }
  return results;
}

async function checkLifecycle() {
  const summary = await getJson(`${BASE}/api/lifecycle/summary`);
  const memoryOpp = summary.data?.summary?.opportunities ?? 0;
  const dbOpp = summary.data?.dbSummary?.opportunity ?? 0;
  const mismatch =
    summary.data?.persistence?.available &&
    dbOpp > 0 &&
    memoryOpp !== dbOpp;

  const candidate = await getJson(`${BASE}/api/lifecycle/customers/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityRole: "customer",
      domain: "live-ops-smoke.test",
      candidateName: "Live Ops Smoke",
      sourceThreadKey: `smoke-${Date.now()}`,
      requestedBy: "live-ops-smoke",
    }),
  });

  return {
    summaryStatus: summary.res.status,
    memoryOpp,
    dbOpp,
    mismatch,
    candidateStatus: candidate.res.status,
    candidateOk: candidate.res.status === 201,
  };
}

async function checkMailProxy() {
  const res = await getJson(`${BASE}/api/proxy/outlook/status`);
  return { status: res.res.status, ok: res.res.ok };
}

async function checkOpsHealth() {
  const res = await getJson(`${BASE}/api/ops/health`);
  const criticalUnreachable = (res.data?.services ?? []).filter(
    (s) =>
      s.critical &&
      (s.liveness === "unreachable" || s.readiness === "unreachable"),
  );
  return {
    status: res.res.status,
    systemStatus: res.data?.status,
    criticalUnreachable: criticalUnreachable.map((s) => s.name),
    ok:
      res.res.ok &&
      res.data?.status !== "unreachable" &&
      criticalUnreachable.length === 0,
  };
}

async function main() {
  console.log(`Live ops smoke @ ${BASE}\n`);

  const stack = await checkStack();
  const lifecycle = await checkLifecycle();
  const mail = await checkMailProxy();
  const ops = await checkOpsHealth();

  const stackOk = stack.every((s) => s.ok);
  const lifecycleOk =
    lifecycle.summaryStatus === 200 &&
    !lifecycle.mismatch &&
    lifecycle.candidateOk;

  const report = { stack, lifecycle, mail, ops };
  console.log(JSON.stringify(report, null, 2));

  const allOk = stackOk && lifecycleOk && mail.ok && ops.ok;
  if (!allOk) {
    console.error("\nFAILED checks:");
    if (!stackOk) console.error("- stack health");
    if (!lifecycleOk) console.error("- lifecycle (summary mismatch or candidate)");
    if (!mail.ok) console.error("- mail proxy");
    if (!ops.ok) console.error("- ops health");
  }
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
