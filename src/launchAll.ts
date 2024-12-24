import { NS } from '@ns'
import * as ports from "@/libPorts";
import {getGoal} from "@/goal/libGoal";
import {anyScriptRunning, launchIfNotRunning} from "@/libLaunch";

// The second phase control script, launched by bootstrap once we've reached sufficient memory and money

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ps");
	ns.disableLog("sleep");

	ns.run("/goal/selectGoal.js");
	await ns.sleep(100);

	const goal = getGoal(ns);

	if (ns.getServerMaxRam("home") > 128 && !anyScriptRunning(ns, "tix/stockTrade.js")) {
		ns.run("/tix/stockTrade.js", 1, "live");
	}

	// This will abort if not in a gang
	await launchIfNotRunning(ns, "/crime/manageGang.js");
	await launchIfNotRunning(ns, "/crime/intermittentWarfare.js");

	await launchIfNotRunning(ns, "/go/playLotsOfGo.js");

	if (goal=="bladeburner") {
		await launchIfNotRunning(ns, "/bladeburner/manageBladeburner.js");
	}

	await launchIfNotRunning(ns, "/react/newUiDashboard.js");

	while(true) {
		const scripts = [
						// "/augment/completeBitnode.js" // This needs to be at the beginning, so it triggers before any restarts
						"/basic/upgradeMemory.js"
						, "/basic/buyCracks.js"
						, "/basic/crackAll.js" 
						, "/spread/spreadAttackController.js"
						, "/basic/buyStockmarket.js"
						, "/basic/installBackdoors.js"
						, "/hacknet/upgradeNodes.js"
						, "/sleeve/selectSleeveTask.js"	
						, "/sleeve/reportSleeveTasks.js"
						, "/sleeve/installSleeveAugments.js"
						, "/stanek/reportFragments.js"
						, "/company/workForCompany.js"
						, "/crime/startGang.js"
						, "/crime/reportGangStatus.js"
						// , "/corp/startCorp.js" // @todo Don't start a corp because corp code is bad
						, "/contracts/solveContracts.js"
						, "/attack/launchAttackFromHome.js"						
						, "/attack/purchaseAndAttack.js"																	
						, "/attack/launchAttacksFromPurchasedServers.js"
						, "/attack/reportAttacks.js"
						, "/hacknet/sellHashes.js"
						, "/hacknet/selectHashTarget.js"
						, "joinFaction.js"
						, "/augment/buyAugments.js"
						, "/reporting/logProgress.js"
						];
		for (const script of scripts) {
			ns.run(script);
			while (anyScriptRunning(ns, script)) {
				await ns.sleep(50);
			}				
		}

		// This is created by buyAugmentations and buyAugmentationsFromGang
		if (shouldRestart(ns)) {
			ns.toast("Triggering restart!", "warning");
			ns.exec("/augment/augmentAndRestart.js", "home", 1, "forceRestart");
			ns.exit();
			break;
		}

		await ns.sleep(15_000);
	}
}

function shouldRestart(ns: NS): boolean {
	return ports.checkPort(ns, ports.AUGMENT_AND_RESTART, (v) => v === "true") ?? false;
}
