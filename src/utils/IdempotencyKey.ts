import { createHash } from "crypto";
import { OrderRequest } from "../domain/OrderRequest";

function getTimeBucket(date: Date){
    const tenMins = 10*60*1000;
    return Math.floor(date.getTime() / tenMins) * tenMins;
}

export function deriveIdempotencyKey(request: OrderRequest): string{
    const raw = `${request.user.userId}:${request.cartId}:${getTimeBucket(request.timeStamp)}`;
    return createHash('sha256').update(raw).digest('hex');
}