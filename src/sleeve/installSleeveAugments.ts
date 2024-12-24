import { NS } from '@ns'
import { listSleeves, installSleeveAugments } from "@/sleeve/libSleeve";


/**
 * If there is sufficient money, then install all (sensible) augments on all unshocked sleeves.
 */
export async function main(ns : NS) : Promise<void> {
    ns.disableLog("ALL");

    const moneyToRetain = 600_000_000_000;
    const enoughMoney = ns.getServerMoneyAvailable("home") > moneyToRetain;
    const unshockedSleeves = listSleeves(ns).filter(s => ns.sleeve.getSleeve(s).shock == 0);

    if (!enoughMoney) {
        ns.print("Not enough money to be worth installing augments - doing nothing");
        return;
    } else if (unshockedSleeves.length==0) {
        ns.print("No sleeves with zero shock - cannot install augments yet");
        return;
    } else {
        unshockedSleeves.forEach(s => installSleeveAugments(ns, s, moneyToRetain));
    }
}
