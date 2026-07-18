export interface DailySpendTracker{
    getSpendToday(userId: string): Promise<number>;
    recordSpend(userId: string, amount: number):Promise<void>;
}