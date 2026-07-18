import { User } from "../domain/User";

export interface SpendGuardrail{
    checkSpendingPower(orderAmount: number, user: User): Promise<
    { isAllowed: true } | { isAllowed: false, reason: 'PER_ORDER_LIMIT_EXCEEDED' | 'DAILY_CAP_EXCEEDED'; message: string }>
}