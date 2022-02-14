import { NS } from '@ns';
import { sellAllShares, getOwnedShareValue } from "/tix/libTix.js"; 

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");

    if (isInCorporation(ns)) {
        ns.print("Already in corporation - nothing to do");
        return;
    } 
    const selfFund = (ns.getPlayer().bitNodeN!=3);
    const totalMoney = calculateTotalMoney(ns);
    const baseCorporationCost = 150_000_000_000;

    if (selfFund && totalMoney<baseCorporationCost) {
        ns.print("Insufficent money to start corporation");
        return;
    }

    if (selfFund) {
        sellAllShares(ns);
    }
    
    ns.print("Starting corporation");
    const started = ns.corporation.createCorporation("Bats Inc", selfFund);    
    if (started) {
        ns.run("/corp/manageStartup.js");
    } else {
        ns.print("Could not start corporation");
    }
}

function calculateTotalMoney(ns: NS): number {
    return ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
}

function isInCorporation(ns: NS): boolean {
    try {
        const corpExists = ns.corporation.getCorporation();
        return (corpExists!=null);
    } catch (err) {
        return false;
    }
}