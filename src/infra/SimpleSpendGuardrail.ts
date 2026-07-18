import { User } from "../domain/User";
import { DailySpendTracker } from "../Interfaces/DailySpendTracker";
import { SpendGuardrail } from "../Interfaces/SpendGuardrail";

export class SimpleSpendGuardrail implements SpendGuardrail{
    constructor(private readonly spendTracker:DailySpendTracker){}

    async checkSpendingPower(orderAmount: number, user: User):Promise <
    | {isAllowed: true}
    | { isAllowed: false; reason: 'PER_ORDER_LIMIT_EXCEEDED' | 'DAILY_CAP_EXCEEDED'; message: string }
    >{
        const approvedAmount = user.dailyCap;
        const perOrderLimit = user.perOrderMax;
        const spentAlready = await this.spendTracker.getSpendToday(user.userId);
        if(orderAmount > perOrderLimit){
            return {isAllowed:false, reason:'PER_ORDER_LIMIT_EXCEEDED', message: `the orderAmout ${orderAmount} is more than approved per order limit ${perOrderLimit}`}
        }
        if(orderAmount+spentAlready > approvedAmount){
              return {isAllowed:false, reason:'DAILY_CAP_EXCEEDED', message: `the orderAmout ${orderAmount} is more than approved per order limit ${perOrderLimit}`}
        }
        return {isAllowed: true}
    }
}