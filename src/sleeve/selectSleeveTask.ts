/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { listSleeves, getMeanCombatStat, getLowestPlayerCombatStat, getOrderedCombatStats,
        workout, travelTo,  commitCrime, recoverShock, studyCs,
        retrieveSleeveInstructions, 
        reportSleeveTasks, SleeveNo, CombatStats } from "sleeve/libSleeve";

/**
 * Identify and set the correct thing for sleeves to be doing, based on the current game state - 
 * broadly, commit crimes until there is a gang, then support the player. This does not loop - call it repeatedly.
 */
export async function main(ns : NS) : Promise<void> {
    ns.disableLog("ALL");

    const sleeves: SleeveNo[] = listSleeves(ns);
    if (sleeves.length===0) {
        ns.print("No sleeves!");
        return;
    }
    const useManualControl = (retrieveSleeveInstructions(ns)?.useManualControl) ?? false;
    if (useManualControl) {
        ns.print("Manual control for sleeves - doing nothing automatically");
        return;
    }

    const sleeveStats = sleeves.map(i => ns.sleeve.getSleeveStats(i));

    const anyVeryShocked = sleeveStats.some(ss => ss.shock > 97);
    const playerHackTooLow = ns.getPlayer().hacking < 10;
    const sleevesUntrained = sleeves.map(s => getMeanCombatStat(ns, s)).some(combat => combat < 75);
    const tooMuchKarma = ns.heart.break() > -54000;
    const notYetInGang = ! ns.gang.inGang();
    const playerStatsTooLowForGang = getLowestPlayerCombatStat(ns).value < 75;
    const enoughMoneyForTravelling = ns.getServerMoneyAvailable("home") > 50_000_000;

    if (anyVeryShocked) {
        ns.print("Sleeves are very shocked - recovering");
        sleeves.forEach(i => recoverShock(ns, i));
    } else if (playerHackTooLow) {
        ns.print("Player hacking level is too low - helping to train it");
        sleeves.forEach(i => studyCs(ns, i));
    } else if (sleevesUntrained) {
        ns.print("Sleeves are not buff enough - training them so they can commit crimes well");
        if (enoughMoneyForTravelling) { sleeves.forEach(i => travelTo(ns, i, "Sector-12")); }
        trainCombat(ns, sleeves);
    } else if (tooMuchKarma) {
        ns.print("Not able to start a gang yet, so committing crimes");
        sleeves.forEach(i => commitCrime(ns, i));
    } else if (notYetInGang && playerStatsTooLowForGang) {
        ns.print("Able to start a gang, but haven't because player stats are too low for faction - training for the player stats");
        if (enoughMoneyForTravelling) { sleeves.forEach(i => travelTo(ns, i, "Sector-12")); }
        const statToTrain = getLowestPlayerCombatStat(ns).name;
        sleeves.forEach(i => workout(ns, i, statToTrain));
    } else {
        ns.print("Now in post-gang training");
        let nextAvailableSleeve = 0;
        if (sleeveStats[nextAvailableSleeve].shock>0) { 
            ns.print("Setting first sleeve to recover shock, so it can install augments eventually");
            recoverShock(ns, nextAvailableSleeve); nextAvailableSleeve++; 
        }

        
        const currentFaction = ns.getPlayer().currentWorkFactionName;
        if (currentFaction!=null) {
            ns.print("Setting sleeve to work for faction "+currentFaction+" to match what the player is doing");
            try {
                workForFaction(ns, nextAvailableSleeve, currentFaction);
            } catch (err) {
                ns.print("Working for faction failed - probably an existing sleeve doing the same");
            }
            nextAvailableSleeve++;
        }

        const remainingSleeves = sleeves.slice(nextAvailableSleeve);
        ns.print("Setting "+remainingSleeves.length+" other sleeves to study Computer Science to improve player hacking");
        if (enoughMoneyForTravelling) { remainingSleeves.forEach(i => travelTo(ns, i, "Volhaven")); }
        remainingSleeves.forEach(i => studyCs(ns, i));
    }

    await reportSleeveTasks(ns);
}

function trainCombat(ns: NS, sleeves: SleeveNo[]): void {
    // Assume the last sleeve has representative stats (the first sleeve may not, because it might be augmented)
    const lastSleeve = sleeves.at(-1) !;
    const s = ns.sleeve.getSleeveStats(lastSleeve) as CombatStats;
    const stats = getOrderedCombatStats(s);
    // Spread the sleeves across the stats that need training, starting with the lowest. If there are more than 4 sleeves,
    // then the excess sleeves will give additional training to the lowest stats.
	for (const i of sleeves) {
		const statToTrain = stats.at( i % stats.length )!.name;
		workout(ns, i, statToTrain);
	}
}

function workForFaction(ns: NS, sleeveNo: SleeveNo, faction: string): void {
    const preferHacking = getMeanCombatStat(ns, sleeveNo) > ns.sleeve.getSleeveStats(sleeveNo).hacking;
    const preferredTasks = preferHacking ? [ "Hacking", "Security", "Field" ] : [ "Security", "Field", "Hacking" ];
    const currentTask = ns.sleeve.getTask(sleeveNo);
    for (const task of preferredTasks) {
        if (currentTask.task=="Faction" && currentTask.location==faction && currentTask.factionWorkType == task) break;
        if (ns.sleeve.setToFactionWork(sleeveNo, faction, task)) break;
    }    
}