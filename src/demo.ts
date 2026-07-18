import { MockMerchantClient } from "./clients/MockMerchantClient";
import { OrderRequest } from "./domain/OrderRequest";
import { User } from "./domain/User";
import { InMemoryIdempotencyStore } from "./infra/  InMemoryIdempotencyStore";
import { SimpleSpendGuardrail } from "./infra/SimpleSpendguardrail";
import { InMemorySpendTracker } from "./Interfaces/InMemorySpendTrakcer";
import { OrderPlacementService } from "./services/OrderPlacementService";

function buildRequest(user: User, cartId: string, amount: number): OrderRequest {
  return {
    user,
    cartId,
    amount,
    timeStamp: new Date(),
  };
}

function logResult(label: string, result: unknown) {
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(result, null, 2));
}

async function runHappyPath() {
  console.log("\n=== SCENARIO 1: HAPPY_PATH ===");
  const merchant = new MockMerchantClient("HAPPY_PATH");
  const idempotencyStore = new InMemoryIdempotencyStore();
  const spendTracker = new InMemorySpendTracker();
  const guardrail = new SimpleSpendGuardrail(spendTracker);
  const service = new OrderPlacementService (merchant, idempotencyStore, guardrail, spendTracker);

  const user: User = { userId: "user-1", perOrderMax: 1000, dailyCap: 3000 };
  const request = buildRequest(user, "cart-happy", 500);

  const result = await service.placeOrder(request);
  logResult("Order placed", result);

  const spentToday = await spendTracker.getSpendToday(user.userId);
  console.log(`Spend recorded for user-1 today: ${spentToday}`);
}

async function runGuardrailRejection() {
  console.log("\n=== SCENARIO 2: GUARDRAIL REJECTION (per-order limit) ===");
  const merchant = new MockMerchantClient("HAPPY_PATH");
  const idempotencyStore = new InMemoryIdempotencyStore();
  const spendTracker = new InMemorySpendTracker();
  const guardrail = new SimpleSpendGuardrail(spendTracker);
  const service = new OrderPlacementService(merchant, idempotencyStore, guardrail, spendTracker);

  const user: User = { userId: "user-2", perOrderMax: 500, dailyCap: 3000 };
  const request = buildRequest(user, "cart-over-limit", 800); // exceeds perOrderMax

  const result = await service.placeOrder(request);
  logResult("Order rejected before hitting merchant", result);
}

async function runDomainFailure() {
  console.log("\n=== SCENARIO 3: DOMAIN_FAILURE (merchant rejects) ===");
  const merchant = new MockMerchantClient("DOMAIN_FAILURE");
  const idempotencyStore = new InMemoryIdempotencyStore();
  const spendTracker = new InMemorySpendTracker();
  const guardrail = new SimpleSpendGuardrail(spendTracker);
  const service = new OrderPlacementService(merchant, idempotencyStore, guardrail, spendTracker);

  const user: User = { userId: "user-3", perOrderMax: 1000, dailyCap: 3000 };
  const request = buildRequest(user, "cart-domain-fail", 400);

  const result = await service.placeOrder(request);
  logResult("Merchant rejected order", result);

  const spentToday = await spendTracker.getSpendToday(user.userId);
  console.log(`Spend recorded for user-3 today (should be 0): ${spentToday}`);
}

async function runTimeoutAfterPlacedReconciliation() {
  console.log("\n=== SCENARIO 4: TIMEOUT_AFTER_PLACED + reconciliation (no duplicate) ===");
  const merchant = new MockMerchantClient("TIMEOUT_AFTER_PLACED");
  const idempotencyStore = new InMemoryIdempotencyStore();
  const spendTracker = new InMemorySpendTracker();
  const guardrail = new SimpleSpendGuardrail(spendTracker);
  const service = new OrderPlacementService(merchant, idempotencyStore, guardrail, spendTracker, 1000); // 1s threshold for demo

  const user: User = { userId: "user-4", perOrderMax: 1000, dailyCap: 3000 };
  const request = buildRequest(user, "cart-timeout", 600);

  const firstAttempt = await service.placeOrder(request);
  logResult("First attempt (times out on client side, order secretly placed)", firstAttempt);

  console.log("\n(Waiting 1.5s for the IN_FLIGHT record to go stale...)");
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const secondAttempt = await service.placeOrder(request);
  logResult("Second attempt (reconciles with merchant, returns SAME order — no duplicate)", secondAttempt);

  const spentToday = await spendTracker.getSpendToday(user.userId);
  console.log(`Spend recorded for user-4 today (should reflect exactly ONE order, 600): ${spentToday}`);
}

async function main() {
  await runHappyPath();
  await runGuardrailRejection();
  await runDomainFailure();
  await runTimeoutAfterPlacedReconciliation();
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});