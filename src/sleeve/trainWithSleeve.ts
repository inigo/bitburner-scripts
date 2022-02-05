import { getLowestPlayerCombatStat, listSleeves, workout, travelTo } from "sleeve/libSleeve";
import { NS } from '@ns'

// Use sleeves to train player combat stats equally

export async function main(ns: NS): Promise<void> {
	const sleeves = listSleeves(ns);

	const enoughMoneyForTravelling = ns.getServerMoneyAvailable("home") > 50_000_000;
	if (enoughMoneyForTravelling) { sleeves.forEach(i => travelTo(ns, i, "Sector-12")); }

	while (true) {
        const statToTrain = getLowestPlayerCombatStat(ns).name;
        sleeves.forEach(i => workout(ns, i, statToTrain));

		await ns.sleep(1000);
	}
}
