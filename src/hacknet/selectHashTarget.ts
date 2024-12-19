import {NS, SleeveCompanyTask, SleeveTask} from '@ns'
import {retrieveCompanyStatus} from "corp/libCorporation";
import {retrieveHashSpendReport, setHashSpend, spendHashesOnPurchases} from "hacknet/libHashes";
import {retrieveSleeveTasks} from "sleeve/libSleeve";
import {retrieveAttackStatus} from "attack/libAttack";
import {retrieveGangInfo} from "crime/libGangInfo";

/**
 * Choose an appropriate objective to spend Hacknet hashes on, based on the reports from various
 * other scripts.
 */
export async function main(ns : NS) : Promise<void> {

    const currentHashSpend = retrieveHashSpendReport(ns);
    if (currentHashSpend?.setManually) {
        ns.print(`Hash spend currently manually set to ${JSON.stringify(currentHashSpend?.targets)} - leaving as-is`);
        return;
    }

    const level = (s: string) => ns.hacknet.getHashUpgradeLevel(s)

    const corpInfo = retrieveCompanyStatus(ns);
    const investmentRound = (corpInfo?.investmentRound ?? -1);
    const inCorporation = corpInfo != null;

    const sleeveInfo = retrieveSleeveTasks(ns);
    const isGymClass = (s: SleeveTask) => s?.type === "CLASS" ? ["str","def", "dex", "agi"].includes(s.classType) : false;
    const isUni = (s: SleeveTask) => s?.type === "CLASS" && !isGymClass(s);
    const allSleevesAtGym = sleeveInfo.filter(s => s!=null).every(s => isGymClass(s));
    const someSleevesAtGym = sleeveInfo.filter(s => s!=null && isGymClass(s)).length > 2;
    const someSleevesAtUni = sleeveInfo.filter(s => s!=null && isUni(s)).length > 2;
    const sleeveCompanyTask = sleeveInfo.find(s => (s as SleeveCompanyTask)?.companyName) ?? null;
    const sleeveCompany = sleeveCompanyTask ? (sleeveCompanyTask as SleeveCompanyTask).companyName : null;

    const homeAttackTarget = retrieveAttackStatus(ns).filter(a => a.source=="home").map(a => a.target)[0] ?? null;
    const hashes = ns.hacknet.numHashes();
    const hashesNeededForServerWeakening = 700;
    const gangInfo = retrieveGangInfo(ns);
    const gangFaction = gangInfo?.gangInfo?.faction ?? null;
    const factionsToIgnore = ["Church of the Machine God", "Bladeburners", gangFaction ].filter(f => f!=null);
    const inInterestingFaction = ns.getPlayer().factions.filter(f => !factionsToIgnore.includes(f)).length > 0;
    const inBladeburner = ns.bladeburner.inBladeburner();

    if (level("Generate Coding Contract")<1) {
        ns.print("No contracts generated, so generating one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ], false);
    } else if (investmentRound == 0 && level("Exchange for Corporation Research")<2) {
        ns.print("New corporation startup, so doing a little corporation research");
        await setHashSpend(ns, [ { name: "Exchange for Corporation Research" } ], false);
    } else if (investmentRound == 0) {
        ns.print("New corporation startup, so providing funds to be used for growth");
        await setHashSpend(ns, [ { name: "Sell for Corporation Funds" } ], false);
    } else if (allSleevesAtGym && (level("Improve Gym Training") < 5)) {
        ns.print("All sleeves are at the gym, so improving gym training to support them");
        await setHashSpend(ns, [ { name: "Improve Gym Training" } ], false);
    } else if (inBladeburner && (level("Exchange for Bladeburner SP") < 4)) {
        ns.print("In Bladeburner, so improving Bladeburner skills", false);
        await setHashSpend(ns, [ { name: "Exchange for Bladeburner SP" } ], false);
    } else if (inBladeburner && (level("Exchange for Bladeburner Rank") < 4)) {
        ns.print("In Bladeburner, and already have skills, so improving Bladeburner rank");
        await setHashSpend(ns, [ { name: "Exchange for Bladeburner Rank" } ], false);
    } else if (level("Generate Coding Contract")<3 && inInterestingFaction) {
        ns.print("Less than three coding contracts, so generating another one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ], false);
    } else if (homeAttackTarget!=null && homeAttackTarget!="n00dles" && hashes < hashesNeededForServerWeakening && level("Reduce Minimum Security")<4 && level("Increase Maximum Money")<4) {
        ns.print("Attacking a server, but insufficient hashes to improve it thoroughly - pausing until more hashes - currently "+hashes+" but want "+hashesNeededForServerWeakening);
        await setHashSpend(ns, [ ], false);
    } else if (homeAttackTarget!=null && homeAttackTarget!="n00dles" && hashes >= hashesNeededForServerWeakening && level("Reduce Minimum Security")<4 && level("Increase Maximum Money")<4) {
        // Batch this increase together - otherwise the hack script will restart every time we make an improvement
        ns.print("Attacking server "+homeAttackTarget+", so making the attack easier");
        while (spendHashesOnPurchases(ns, [ { name: "Reduce Minimum Security", target: homeAttackTarget }, { name: "Increase Maximum Money", target: homeAttackTarget } ])) {
            ns.print("Reducing security and increasing money on "+homeAttackTarget);
        }
    } else if (level("Generate Coding Contract")<6 && inInterestingFaction) {
        ns.print("Less than six coding contracts, so generating another one");
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ], false);
    } else {
        ns.print("Already done initial hash spends - now onto weighted algorithm");
        const params = {
            sleeveCompany,
            attackedServer: homeAttackTarget,
            inCorporation,
            someSleevesAtGym,
            someSleevesAtUni,
            inInterestingFaction
        };
        const bestTarget = selectBestHashSpend(ns, params);
        await setHashSpend(ns, [ bestTarget ], false);
    }
}

interface WeightedHashTarget {
    name: string;
    weight: number;
    isAvailable: boolean;
    cost?: number;
    weightedCost?: number;
    target?: string;
}

function selectBestHashSpend(ns: NS, params: {
    sleeveCompany: string | null,
    attackedServer: string | null,
    inCorporation: boolean,
    someSleevesAtGym: boolean,
    someSleevesAtUni: boolean,
    inInterestingFaction: boolean,
}): { name: string, target?: string } {

    const doingBladeburnerAction = ns.bladeburner.inBladeburner() && ns.bladeburner.getCurrentAction() != null;
    const cost = (s: string) => ns.hacknet.hashCost(s);

    const possibleTargets: WeightedHashTarget[] = [
        { name: "Sell for Money",weight: 1_000_000, isAvailable: true }
        , {name: "Sell for Corporation Funds",weight: 2, isAvailable: params.inCorporation }
        , {name: "Exchange for Corporation Research",weight: 2, isAvailable: params.inCorporation}
        , {name: "Reduce Minimum Security", weight: 8, isAvailable: params.attackedServer!=null, target: params.attackedServer ?? undefined }
        , {name: "Increase Maximum Money", weight: 8, isAvailable: params.attackedServer!=null, target: params.attackedServer ?? undefined }
        , {name: "Improve Studying", weight: 10, isAvailable: params.someSleevesAtUni }
        , {name: "Improve Gym Training", weight: 10, isAvailable: params.someSleevesAtGym}
        , {name: "Exchange for Bladeburner Rank",weight: 1, isAvailable: doingBladeburnerAction }
        , {name: "Exchange for Bladeburner SP",weight: 1, isAvailable: doingBladeburnerAction }
        , {name: "Generate Coding Contract", weight: 4, isAvailable: params.inInterestingFaction }
        , {name: "Company Favor",weight: 6, isAvailable: params.sleeveCompany!=null, target: params.sleeveCompany ?? undefined }
    ];
    const availableTargets = possibleTargets
        .filter(t => t.isAvailable)
        .map(t => ({ ...t, cost: cost(t.name) }))
        .filter(t => t.cost <= ns.hacknet.hashCapacity() )
        .map(t => ({ ...t, weightedCost: t.cost * t.weight }))
        .sort((a, b) => a.weightedCost - b.weightedCost)

    ns.print(`Picking preferred target ${JSON.stringify(availableTargets[0])} from target options ${JSON.stringify(availableTargets)}`);

    return availableTargets[0];
}
