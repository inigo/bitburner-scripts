import {GymType, NS, SleeveClassTask, SleeveCompanyTask, SleeveTask} from '@ns'
import { retrieveCompanyStatus } from "corp/libCorporation";
import { setHashSpend, spendHashesOnPurchases } from "hacknet/libHashes";
import { retrieveSleeveTasks } from "sleeve/libSleeve";
import { retrieveAttackStatus } from "attack/libAttack";
import { retrieveGangInfo } from "crime/libGangInfo";

/**
 * Choose an appropriate objective to spend Hacknet hashes on, based on the reports from various
 * other scripts.
 */
export async function main(ns : NS) : Promise<void> {
    const level = (s: string) => ns.hacknet.getHashUpgradeLevel(s)
    const cost = (s: string) => ns.hacknet.hashCost(s);

    const corpInfo = retrieveCompanyStatus(ns);
    const investmentRound = (corpInfo?.investmentRound ?? -1);
    const sleeveInfo = retrieveSleeveTasks(ns);

    const isGymClass = (s: SleeveTask) => s?.type === "CLASS" ? ["str","def", "dex", "agi"].includes(s.classType) : false;
    const allSleevesAtGym = sleeveInfo.filter(s => s!=null).every(s => isGymClass(s));
    const someSleevesAtGym = sleeveInfo.filter(s => s!=null && isGymClass(s)).length > 2;
    const sleeveCompany = sleeveInfo.find(s => (s as SleeveCompanyTask)?.companyName) ?? null;

    const homeAttackTarget = retrieveAttackStatus(ns).filter(a => a.source=="home").map(a => a.target)[0] ?? null;
    const hashes = ns.hacknet.numHashes();
    const hashCapacity = ns.hacknet.hashCapacity();
    const hashesNeededForServerWeakening = 700;
    const gangInfo = retrieveGangInfo(ns);
    const gangFaction = gangInfo?.gangInfo?.faction ?? null;
    const factionsToIgnore = ["Church of the Machine God", gangFaction ].filter(f => f!=null);
    const inInterestingFaction = ns.getPlayer().factions.filter(f => !factionsToIgnore.includes(f)).length > 0;
    const inBladeburner = ns.bladeburner.inBladeburner();

    if (level("Generate Coding Contract")<1) {
        ns.print("No contracts generated, so generating one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (investmentRound == 0 && level("Exchange for Corporation Research")<2) {
        ns.print("New corporation startup, so doing a little corporation research");
        await setHashSpend(ns, [ { name: "Exchange for Corporation Research" } ]);
    } else if (investmentRound == 0) {
        ns.print("New corporation startup, so providing funds to be used for growth");
        await setHashSpend(ns, [ { name: "Sell for Corporation Funds" } ]);
    } else if (allSleevesAtGym && (level("Improve Gym Training") < 5)) {
        ns.print("All sleeves are at the gym, so improving gym training to support them");
        await setHashSpend(ns, [ { name: "Improve Gym Training" } ]);
    } else if (inBladeburner && (level("Exchange for Bladeburner SP") < 4)) {
        ns.print("In Bladeburner, so improving Bladeburner skills");
        await setHashSpend(ns, [ { name: "Exchange for Bladeburner SP" } ]);
    } else if (inBladeburner && (level("Exchange for Bladeburner Rank") < 4)) {
        ns.print("In Bladeburner, and already have skills, so improving Bladeburner rank");
        await setHashSpend(ns, [ { name: "Exchange for Bladeburner Rank" } ]);
    } else if (level("Generate Coding Contract")<3 && inInterestingFaction) {
        ns.print("Less than three coding contracts, so generating another one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (homeAttackTarget!=null && homeAttackTarget!="n00dles" && hashes < hashesNeededForServerWeakening && level("Reduce Minimum Security")<3 && level("Increase Maximum Money")<3) {
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
    } else if (level("Generate Coding Contract")<6 && inInterestingFaction) {
        ns.print("Less than five coding contracts, so generating another one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (hashes > hashCapacity*0.9) {
        ns.print("Reaching hash capacity, so being more generous about using hashes");

        if ((cost("Generate Coding Contract") < hashes) && inInterestingFaction) {
            await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
        } else if (inBladeburner && (cost("Exchange for Bladeburner SP") < hashes)) {
            await setHashSpend(ns, [ { name: "Exchange for Bladeburner SP" } ]);
        } else if (inBladeburner && (cost("Exchange for Bladeburner Rank") < hashes)) {
            await setHashSpend(ns, [ { name: "Exchange for Bladeburner Rank" } ]);
        } else if (sleeveCompany!=null) {
            await setHashSpend(ns, [ { name: "Company Favor", target: sleeveCompany } ]);
        } else if (someSleevesAtGym && (cost("Improve Gym Training") < hashes)) {
            await setHashSpend(ns, [ { name: "Improve Gym Training" } ]);
        // Corporation research already dealt with, and spending on server security/money is disruptive
        } else {
            await setHashSpend(ns, [ { name: "Sell for Money" } ]);
        }
    } else {
        ns.print("No other objectives, so saving hashes for later");
        await setHashSpend(ns, [ ]);
    }

}