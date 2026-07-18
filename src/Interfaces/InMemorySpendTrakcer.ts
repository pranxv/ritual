import { DailySpendTracker } from "./DailySpendTracker";

export class InMemorySpendTracker implements DailySpendTracker {
    private spend = new Map <string, number>();

    private getKey(userId: string): string {
        const today = new Date().toISOString().split('T')[0];
        return `${userId}:${today}`;
    }
    
    async getSpendToday(userId: string): Promise<number> {
        const key = this.getKey(userId);
         return this.spend.get(key) ?? 0;
    }

    async recordSpend(userId: string, amount:number): Promise<void>{
    const key = this.getKey(userId);
    const current = this.spend.get(key) ?? 0;
    this.spend.set(key, current + amount);
}
}