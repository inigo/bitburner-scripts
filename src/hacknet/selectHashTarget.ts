import { NS } from '@ns'
import { retrieveCompanyStatus } from "corp/libCorporation";
import { setHashSpend } from "hacknet/libHashes";
import { retrieveSleeveTasks } from "sleeve/libSleeve";

export async function main(ns : NS) : Promise<void> {
    const level = (s: string) => ns.hacknet.getHashUpgradeLevel(s)

    const corpInfo = retrieveCompanyStatus(ns);
    const investmentRound = (corpInfo?.investmentRound ?? -1);
    const sleeveInfo = retrieveSleeveTasks(ns);
    const allSleevesAtGym = sleeveInfo.every(s => s.task=="Gym");

    if (level("Generate Coding Contract")<1) {
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (investmentRound == 0 && level("Exchange for Corporation Research")<2) {
        await setHashSpend(ns, [ { name: "Exchange for Corporation Research" } ]);
    } else if (investmentRound == 0) {
        await setHashSpend(ns, [ { name: "Sell for Corporation Funds" } ]);
    } else if (allSleevesAtGym && level("Improve Gym Training") < 3) {
        await setHashSpend(ns, [ { name: "Improve Gym Training" } ]);
    } else if (level("Generate Coding Contract")<2) {
        await setHashSpend(ns, [ { name: "Generate Coding Contract" } ]);
    } else if (investmentRound >= 1) {
        await setHashSpend(ns, [ { name: "Exchange for Corporation Research" } ]);
    } else {
        await setHashSpend(ns, [ ]);
    }

}