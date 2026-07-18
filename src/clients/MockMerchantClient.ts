import { MerchantClient } from "../Interfaces/MerchantClient";
import { OrderRequest } from "../domain/OrderRequest";
import { OrderSuccess } from "../domain/statuses/OrderSuccess";
import { OrderFailure } from "../domain/statuses/OrderFailure";
import { randomUUID } from "crypto";
export type MockScenario = 'HAPPY_PATH' | 'TIMEOUT_BEFORE_PLACED' | 'TIMEOUT_AFTER_PLACED' | 'DOMAIN_FAILURE';
export class MockMerchantClient implements MerchantClient {
    private attempts = new Map<string, number>();
    private placedOrders = new Map<string, OrderSuccess>();

    constructor(private readonly scenario: MockScenario){}

    async placeOrder(request: OrderRequest, idempotencyKey: string): Promise<OrderSuccess | OrderFailure>{
        const attempt = (this.attempts.get(idempotencyKey) ?? 0) + 1;
        this.attempts.set(idempotencyKey,attempt);

        switch(this.scenario){
            case 'DOMAIN_FAILURE':
                return {type:'DOMAIN_ERROR', message: 'Merchant rejected the order'};
            case 'TIMEOUT_AFTER_PLACED':
                if(attempt === 1){
                        const intermittentSuccess: OrderSuccess = {orderId:randomUUID()};
                        this.placedOrders.set(idempotencyKey,intermittentSuccess);
                        return{type:"TRANSPORT_ERROR", "message":"Failed to place an order due to timeout"};
                }
                return this.placedOrders.get(idempotencyKey)!;
            case 'TIMEOUT_BEFORE_PLACED':
                if(attempt === 1){
                    return{type:"TRANSPORT_ERROR", "message":"Failed to place an order due to timeout"}; 
                }
                return  {orderId: randomUUID()};
            case 'HAPPY_PATH':
                return {orderId: randomUUID()};
        }
    }

    async checkStatus(idempotencyKey: string): Promise < 
    | { status: 'FOUND'; result: OrderSuccess | OrderFailure } 
    | { status: 'NOT_FOUND'}> {
        const order = this.placedOrders.get(idempotencyKey);
        if(order){
            return {status: 'FOUND', result: order};
        }
        return {status:'NOT_FOUND'};
    }
}