import { NS } from '@ns'
import * as ports from "libPorts";

// The second phase control script, launched by bootstrap once we've reached sufficient memory and money

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ps");
	ns.disableLog("sleep");

	if (ns.getServerMaxRam("home") > 128 && !anyScriptRunning(ns, "/tix/stockTrade.js")) {
		ns.run("/tix/stockTrade.js", 1, "live");
	}

	// This will abort if not in a gang
	ns.run("/crime/manageGang.js");
	ns.run("/crime/intermittentWarfare.js");

	// ns.run("/bladeburner/manageBladeburner.js");

	ns.run("uiDashboard.js");
	
	while(true) {
		const scripts = [
						"/augment/completeBitnode.js" // This needs to be at the beginning, so it triggers before any restarts
						, "/basic/upgradeMemory.js"
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
						, "/crime/startGang.js"
						, "/crime/reportGangStatus.js"
						, "/corp/startCorp.js"				
						, "/contracts/solveContracts.js"
						, "/attack/launchAttackFromHome.js"						
						, "/attack/purchaseAndAttack.js"																	
						, "/attack/launchAttacksFromPurchasedServers.js"	
						, "/attack/reportAttacks.js"
						, "/hacknet/selectHashTarget.js"
						, "/hacknet/sellHashes.js"
						, "joinFaction.js"  
						, "/augment/buyAugments.js"
						, "/reporting/logProgress.js"
						];
		for (const script of scripts) {
			ns.run(script);
			while (anyScriptRunning(ns, script)) {
				await ns.sleep(100);
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

function anyScriptRunning(ns: NS, filename: string): boolean {
	return ns.ps().some(p => p.filename == filename);
}