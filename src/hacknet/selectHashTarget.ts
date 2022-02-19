import { NS } from '@ns'
import { retrieveCompanyStatus } from "corp/libCorporation";
import { setHashSpend, spendHashesOnPurchases } from "hacknet/libHashes";
import { retrieveSleeveTasks } from "sleeve/libSleeve";
import { retrieveAttackStatus } from "attack/libAttack";

/**
 * Choose an appropriate objective to spend Hacknet hashes on, based on the reports from various
 * other scripts.
 */
export async function main(ns : NS) : Promise<void> {
    const level = (s: string) => ns.hacknet.getHashUpgradeLevel(s)

    const corpInfo = retrieveCompanyStatus(ns);
    const investmentRound = (corpInfo?.investmentRound ?? -1);
    const sleeveInfo = retrieveSleeveTasks(ns);
    const allSleevesAtGym = sleeveInfo.every(s => s.task=="Gym");
    const homeAttackTarget = retrieveAttackStatus(ns).filter(a => a.source=="home").map(a => a.target)[0] ?? null;
    const hashes = ns.hacknet.numHashes();
    const hashesNeededForServerWeakening = 700;

    if (level("Generate Coding Contract")<1) {
        ns.print("No contracts generated, so generating one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (investmentRound == 0 && level("Exchange for Corporation Research")<2) {
        ns.print("New corporation startup, so doing a little corporation research");
        await setHashSpend(ns, [ { name: "Exchange for Corporation Research" } ]);
    } else if (investmentRound == 0) {
        ns.print("New corporation startup, so providing funds to be used for growth");
        await setHashSpend(ns, [ { name: "Sell for Corporation Funds" } ]);
    } else if (allSleevesAtGym && level("Improve Gym Training") < 3) {
        ns.print("All sleeves are at the gym, so improving gym training to support them");
        await setHashSpend(ns, [ { name: "Improve Gym Training" } ]);
    } else if (level("Generate Coding Contract")<2) {
        ns.print("Less than two coding contracts, so generating another one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (homeAttackTarget!=null && homeAttackTarget!="n00dles" && hashes < hashesNeededForServerWeakening) {
        ns.print("Attacking a server, but insufficient hashes to improve it thoroughly - pausing until more hashes - currently "+hashes+" but want "+hashesNeededForServerWeakening);
        await setHashSpend(ns, [ ]);
    } else if (homeAttackTarget!=null && homeAttackTarget!="n00dles" && hashes >= hashesNeededForServerWeakening && level("Reduce Minimum Security")<3 && level("Increase Maximum Money")<3) {
        // Batch this increase together - otherwise the hack script will restart every time we make an improvement
        ns.print("Attacking server "+homeAttackTarget+", so making the attack easier");
        while (spendHashesOnPurchases(ns, [ { name: "Reduce Minimum Security", target: homeAttackTarget }, { name: "Increase Maximum Money", target: homeAttackTarget } ])) {
            ns.print("Reducing security and increasing money on "+homeAttackTarget);
        }
    } else if (investmentRound >= 1) {
        ns.print("Providing research to corporation");
        await setHashSpend(ns, [ { name: "Exchange for Corporation Research" } ]);
    } else {
        ns.print("No other objectives, so saving hashes for later");
        await setHashSpend(ns, [ ]);
    }

}