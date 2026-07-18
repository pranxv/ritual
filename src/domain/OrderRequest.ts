import { User } from "./User";

export interface OrderRequest {
    user: User,
    cartId: string,
    timeStamp: Date;
    amount: number
}