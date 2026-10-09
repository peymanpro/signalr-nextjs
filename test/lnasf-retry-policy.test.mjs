import test from "node:test";
import assert from "node:assert/strict";
import { AdaptiveRetryPolicy, RetryOutcomeModel } from "../lib/chat/lnasf-retry-policy.ts";

test("model learns outcomes and predicts success with explicit confidence and utility", () => {
  const model = new RetryOutcomeModel();
  model.observe(0, true, 400);
  model.observe(0, true, 350);
  model.observe(0, false);
  const estimate = model.estimate(0);
  assert.equal(estimate.attempts, 3);
  assert.equal(estimate.successProbability, 3 / 5);
  assert.equal(estimate.confidence, 3 / 5);
  assert.equal(estimate.utility, 3 / 5);
  assert.equal(model.predictBest().delayMs, 0);
});

test("passive mode records recommendations but never changes the deterministic schedule", () => {
  const model = new RetryOutcomeModel();
  for (let i = 0; i < 6; i += 1) model.observe(0, true);
  for (let i = 0; i < 6; i += 1) model.observe(2000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "passive", model, now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1_000 }), 2_000);
  assert.equal(policy.getSnapshot().lastDecision.action, "baseline");
  assert.equal(policy.getSnapshot().lastDecision.recommendedDelayMs, 0);
});

test("advisory mode explains an alternative but returns the baseline delay", () => {
  const model = new RetryOutcomeModel();
  for (let i = 0; i < 6; i += 1) model.observe(0, true);
  for (let i = 0; i < 6; i += 1) model.observe(2000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "advisory", model, now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1_000 }), 2_000);
  assert.equal(policy.getSnapshot().lastDecision.recommendedDelayMs, 0);
  assert.equal(policy.getSnapshot().lastDecision.selectedDelayMs, 2_000);
});

test("adaptive mode uses learned evidence only when it beats the baseline utility", () => {
  const model = new RetryOutcomeModel();
  for (let i = 0; i < 8; i += 1) model.observe(0, true, 350);
  for (let i = 0; i < 8; i += 1) model.observe(2000, false);
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", model, now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1_000 }), 0);
  assert.equal(policy.getSnapshot().lastDecision.action, "adaptive");
});

test("cold start and insufficient evidence use deterministic baseline", () => {
  const policy = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1_000 });
  assert.equal(policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 }), 0);
  assert.equal(policy.getSnapshot().lastDecision.action, "baseline");
});

test("retry limits bound attempts and elapsed time", () => {
  const byAttempts = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1_000 });
  assert.equal(byAttempts.nextRetryDelay({ previousRetryCount: 4, elapsedMilliseconds: 0 }), null);
  const byTime = new AdaptiveRetryPolicy({ mode: "adaptive", now: () => 1_000 });
  assert.equal(byTime.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 30_000 }), null);
});

test("a following failed attempt updates the model and success feeds recovery outcomes back", () => {
  let now = 10_000;
  const policy = new AdaptiveRetryPolicy({ mode: "passive", now: () => now });
  policy.nextRetryDelay({ previousRetryCount: 0, elapsedMilliseconds: 0 });
  policy.nextRetryDelay({ previousRetryCount: 1, elapsedMilliseconds: 1_000 });
  assert.equal(policy.getSnapshot().model[0].failures, 1);
  now += 1_000;
  policy.recordSuccess();
  assert.equal(policy.getSnapshot().model[1].successes, 1);
  assert.equal(policy.getSnapshot().measurements.recoveryCount, 1);
});
