import { MerchantClient } from "../Interfaces/MerchantClient";
import { SpendGuardrail } from "../Interfaces/SpendGuardrail";
import { deriveIdempotencyKey } from "../utils/IdempotencyKey";
import { IdempotencyStore } from "../Interfaces/IdempotencyStore";
import { OrderRequest } from "../domain/OrderRequest";
import { OrderFailure } from "../domain/statuses/OrderFailure";
import { OrderSuccess } from "../domain/statuses/OrderSuccess";
import { DailySpendTracker } from "../Interfaces/DailySpendTracker";

export class OrderPlacementService {
  constructor(
    private readonly merchantClient: MerchantClient,
    private readonly idempotencyStore: IdempotencyStore,
    private readonly guardrail: SpendGuardrail,
    private readonly dailySpendTracker: DailySpendTracker,
     private readonly staleThresholdMs: number = 2 * 60 * 1000,
  ) {}
  async placeOrder(
    request: OrderRequest,
  ): Promise<OrderFailure | OrderSuccess> {
    const spendCheck = await this.guardrail.checkSpendingPower(
      request.amount,
      request.user,
    );
    if (!spendCheck.isAllowed) {
      return {
        type: "DOMAIN_ERROR",
        message: spendCheck.message,
      };
    }
    // generate an idemptencyKey
    const idempotencyKey = deriveIdempotencyKey(request);

    //check if the record already exists
    const record = await this.idempotencyStore.get(idempotencyKey);
    if (record === null) {
      // create an order
      await this.idempotencyStore.create(idempotencyKey);
      return this.attemptPlacement(request, idempotencyKey);
    } else if (record.status === "SUCCEEDED" || record.status === "FAILED") {
      // gracefully handling undefined scenarios
      if (!record.result) {
        throw new Error(
          `Idempotency record ${idempotencyKey} resolved but missing result - data corruption`,
        );
      }
      return record.result;
    }
    if (record?.status === "IN_FLIGHT") {
      //const twoMinutesCheck = 2 * 60 * 1000;
      const isStale = Date.now() - record.createdAt.getTime() > this.staleThresholdMs;

      if (!isStale) {
        return {
          type: "DOMAIN_ERROR",
          message:
            "Order is already being processed, please wait before retrying",
        };
      }
      const merchantCheck =
        await this.merchantClient.checkStatus(idempotencyKey);
      if (merchantCheck.status === "FOUND") {
        const finalStatus =
          "orderId" in merchantCheck.result ? "SUCCEEDED" : "FAILED";
        await this.idempotencyStore.update(
          idempotencyKey,
          finalStatus,
          merchantCheck.result,
        );
        if(finalStatus === "SUCCEEDED"){
          await this.dailySpendTracker.recordSpend(request.user.userId,request.amount);
        }
        return merchantCheck.result;
      }
      return await this.attemptPlacement(request, idempotencyKey);
    }
    throw new Error(
      `Unhandled idempotency record state for key ${idempotencyKey}`,
    );
  }
  private async attemptPlacement(
    request: OrderRequest,
    idempotencyKey: string,
  ): Promise<OrderSuccess | OrderFailure> {
    const result = await this.merchantClient.placeOrder(
      request,
      idempotencyKey,
    );
    if("orderId" in result){
      await this.idempotencyStore.update(idempotencyKey,"SUCCEEDED",result);
      await this.dailySpendTracker.recordSpend(request.user.userId,request.amount);
    } else if(result.type === "DOMAIN_ERROR"){
      await this.idempotencyStore.update(idempotencyKey,"FAILED",result);
    }
    return result;
  }
}
