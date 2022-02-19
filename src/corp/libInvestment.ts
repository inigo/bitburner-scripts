/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { formatMoney } from 'libFormat';
import { findDivisionName } from 'corp/libCorporation';
import { ProductPriceManager } from '/corp/libProducts';

export class InvestmentManager {
    readonly division: string;
    constructor(private ns: NS, readonly industry: string, private priceManager: ProductPriceManager) {
        this.division = findDivisionName(ns, industry) !;        
    }

    considerGettingInvestment(): void {
        if (this.getTimesInvested()==1) {
            // Check for all products producing
            if (this.priceManager.listCompletedProducts().length >= 3 && this.priceManager.arePricesFairlyStable()) {
                const offer = this.ns.corporation.getInvestmentOffer().funds;
                this.ns.tprint("Accepting investment offer of "+formatMoney(this.ns, offer));
                this.ns.corporation.acceptInvestmentOffer();
            }
        }
    }

    getTimesInvested(): number {
        const numShares = this.ns.corporation.getCorporation().numShares;
        return (numShares==1_000_000_000) ? 0 :
                (numShares==900_000_000) ? 1 :
                (numShares==550_000_000) ? 2 :
                (numShares==300_000_000) ? 3 :
                (numShares==100_000_000) ? 4 :
                5; // Not sure you can get five rounds of investment...
        // Could also do via:
        // return (this.ns.corporation.getInvestmentOffer().round - 1)
    }
 
    considerGoingPublic(): void {
        const corp = this.ns.corporation.getCorporation();
        const income = corp.revenue - corp.expenses;
        const sufficientIncome = (income > 1_000_000_000_000_000); // 1q / second

        if (!corp.public && sufficientIncome) {
            this.ns.corporation.goPublic(0);
            this.ns.corporation.issueDividends(0.9);
            this.unlockUpgrade("Shady Accounting");
            this.unlockUpgrade("Government Partnership");
        }
    }

    private unlockUpgrade(name: string): void {
        if (!this.ns.corporation.hasUnlockUpgrade(name)) {
            this.ns.corporation.unlockUpgrade(name);
        }
    }
}