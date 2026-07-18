import { IdempotencyRecord } from "./IdempotencyStore";
import { OrderRequest } from "../domain/OrderRequest";
import { OrderFailure } from "../domain/statuses/OrderFailure";
import { OrderSuccess } from "../domain/statuses/OrderSuccess";

export interface MerchantClient {
    placeOrder(request: OrderRequest, idempotencyKey: string): Promise<OrderFailure | OrderSuccess> ;
    checkStatus(idempotencyKey: string): Promise < 
    {status: 'FOUND'; result: OrderSuccess | OrderFailure} | { status: 'NOT_FOUND'}>; 
}