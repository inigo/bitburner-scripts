import {NS} from '@ns'
import {setHashSpend} from "/hacknet/libHashes";

/// Buy hashes

export function autocomplete(): string[] {
    return hashObjectives.map(o => o.name);
}

const hashObjectives = [
    { name: "contracts", target: "Generate Coding Contract" }
   , { name: "corpResearch", target: "Exchange for Corporation Research" }
   , { name: "corpFunds", target: "Sell for Corporation Funds" }
   , { name: "gym", target: "Improve Gym Training" }
   , { name: "study", target: "Improve Studying" }
   , { name: "bladeburnerSkill", target: "Exchange for Bladeburner SP" }
   , { name: "bladeburnerRank", target: "Exchange for Bladeburner Rank" }
   , { name: "money", target: "Sell for Money" }
    // Reduce Minimum Security / Increase Maximum Money
    // Company Favor
]

export async function main(ns: NS): Promise<void> {
    const goal = (ns.args[0] as string) ?? null;

    const targetName = hashObjectives.find(o => o.name == goal)?.target;
    if (targetName) {
        await setHashSpend(ns, [ {name: targetName} ])
    }
}
