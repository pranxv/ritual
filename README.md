# Ritual

**Spend-authorization and idempotency engine for AI agents.**

AI agents that place real-world orders on a user's behalf (e.g. food-ordering agents built against surfaces like Swiggy's MCP) face a problem regular backend systems don't: when a network call times out, the agent doesn't know if the order was actually placed or not. Retrying blindly risks a duplicate charge. Not retrying risks losing a legitimate order. Ritual solves this safely.

## The problem

Building against Swiggy's MCP developer surface surfaced a concrete edge case: an agent retrying a timed-out order-placement request has no guarantee it won't create a duplicate order. Most systems either ignore this risk or bolt on ad-hoc retry logic that doesn't actually guarantee safety. Ritual is a standalone engine that makes retry-safety a first-class guarantee, not an afterthought.

## What it guarantees

- **No duplicate orders**, even when an agent retries after a timeout
- **No lost orders** — a genuinely failed request can always be safely retried
- **No silent overspending** — pre-transaction guardrails reject unsafe orders before they ever reach a merchant, and spend is only recorded after confirmed success

## How it works

1. **Guardrail check** — every order is checked against per-order and daily spend limits *before* anything else happens. Rejected orders never generate an idempotency key or touch the merchant.
2. **Deterministic idempotency key** — derived from `userId + cartId + a 10-minute time bucket`, not a random UUID. This means retrying the same logical order — even from a cold process — produces the same key without needing to remember anything in memory.
3. **Three-state idempotency record** (`IN_FLIGHT` / `SUCCEEDED` / `FAILED`) tracks every order attempt persistently.
4. **Ambiguous outcomes stay `IN_FLIGHT`.** A timeout doesn't mean failure — it means *unknown*. Only an explicit merchant rejection is marked `FAILED`.
5. **Stale `IN_FLIGHT` records reconcile with the merchant** before any retry is allowed. If the merchant confirms the order was placed, that result is returned — no duplicate. If not, a fresh attempt proceeds safely.
6. **Spend is recorded only after confirmed success** — never at guardrail-check time, and never for failed or ambiguous attempts — so a rejected order can never wrongly eat into a user's daily cap.

## Architecture

```
domain/       — pure types (OrderRequest, OrderSuccess, OrderFailure, User, IdempotencyRecord)
interfaces/   — contracts (MerchantClient, IdempotencyStore, SpendGuardrail, DailySpendTracker)
infra/        — implementations (InMemoryIdempotencyStore, InMemorySpendTracker,
                SimpleSpendGuardrail, MockMerchantClient)
services/     — OrderPlacementService, the core orchestration logic
utils/        — deterministic idempotency key derivation
```

All dependencies are injected via interfaces (dependency inversion) — `OrderPlacementService` never depends on a concrete store or merchant client, only on contracts. Swapping the in-memory store for Redis, or the mock merchant for a real HTTP client, requires zero changes to the service itself.

## Running the demo

```bash
bun src/demo.ts
```

This runs four scenarios end-to-end against mocked dependencies:

1. **Happy path** — order placed successfully, spend recorded
2. **Guardrail rejection** — an over-limit order is rejected before ever reaching the merchant
3. **Domain failure** — merchant explicitly rejects the order; no spend recorded
4. **Timeout + reconciliation** — the merchant secretly places the order but the response times out. After the idempotency record goes stale, a retry reconciles with the merchant and returns the *original* order — no duplicate, spend recorded exactly once.

Sample output from scenario 4:

```
[First attempt (times out on client side, order secretly placed)]
{ "type": "TRANSPORT_ERROR", "message": "Failed to place an order due to timeout" }

(Waiting 1.5s for the IN_FLIGHT record to go stale...)

[Second attempt (reconciles with merchant, returns SAME order — no duplicate)]
{ "orderId": "584f5c94-e52e-4862-8d9c-d84b0b78bae9" }

Spend recorded for user-4 today (should reflect exactly ONE order, 600): 600
```

## Notes

This is a portfolio project demonstrating idempotency and saga-style safety patterns, built with in-memory implementations for demonstration. Production use would swap `InMemoryIdempotencyStore` and `InMemorySpendTracker` for Redis or Postgres-backed implementations behind the same interfaces.
