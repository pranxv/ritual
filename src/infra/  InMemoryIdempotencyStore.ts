import { OrderFailure } from "../domain/statuses/OrderFailure";
import { OrderSuccess } from "../domain/statuses/OrderSuccess";
import { IdempotencyRecord, IdempotencyStore } from "../Interfaces/IdempotencyStore";

export class InMemoryIdempotencyStore implements IdempotencyStore {
    private store = new Map<string, IdempotencyRecord>();

    async get(key: string): Promise<IdempotencyRecord | null> {
        const record = this.store.get(key);
         return record ?? null;
    }

    async create(key: string): Promise<IdempotencyRecord> {
        const existing = this.store.get(key);
        if(existing){
            return existing;
        }
        const record: IdempotencyRecord = {
            key,
            status:"IN_FLIGHT",
            createdAt: new Date(),
        };

        this.store.set(key,record);
        return record;
    }

    async update(key: string, status: 'SUCCEEDED' | 'FAILED', result: OrderFailure | OrderSuccess): Promise<void>{
       const record = this.store.get(key) ;
       if(!record){
        throw new Error(`Cannot update non-exiistent idempotency key${key}`);
       }
       this.store.set(key, {...record,status,result});
    }
}