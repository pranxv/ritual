import { OrderFailure } from "../domain/statuses/OrderFailure";
import { OrderSuccess } from "../domain/statuses/OrderSuccess";

export interface IdempotencyRecord {
    key: string;
    status:'SUCCEEDED' | 'IN_FLIGHT' | 'FAILED';
    result?: OrderFailure | OrderSuccess;
    createdAt: Date;
}

export interface IdempotencyStore {
    //Fetch current record for a key, or null if never seen before
    get(key: string): Promise<IdempotencyRecord | null>;

    //Create a new INFLIGHT record, which is default set when created and fail if key already exiss and avoid concurrent calls
    create(key: string): Promise<IdempotencyRecord>;
    //Update the existing record's status
    update(key: string, status: 'SUCCEEDED' |'FAILED', result: OrderFailure | OrderSuccess ): Promise<void>;
}