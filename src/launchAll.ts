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
						"basicUpgradeMemory.js"
						, "basicBuyCracks.js"
						, "basicCrackAll.js" 
						, "/spread/spreadAttackController.js"
						, "basicBuyStockmarket.js"
						, "basicWriteSsh.js"
						, "purchaseAndHack.js"
						, "installBackdoors.js"
						// , "joinFaction.js"  
						// , "buyAugmentations.js"
						, "/hacknet/upgradeNodes.js"
						, "/hacknet/manageHashSales.js"
						, "/sleeve/selectSleeveTask.js"	
						, "/sleeve/reportSleeveTasks.js"
						, "/sleeve/installSleeveAugments.js"
						, "/stanek/reportFragments.js"
						, "/crime/startGang.js"
						, "/crime/reportGangStatus.js"						
						, "/contracts/solveContracts.js"
						, "launchAttackFromHome.js"						
						];
		for (const script of scripts) {
			ns.run(script);
			while (anyScriptRunning(ns, script)) {
				await ns.sleep(100);
			}				
		}

		// This is created by buyAugmentations
		// @todo remove the file check, just use the port (easier to tidy up)
		if (ns.fileExists("shutdown.txt", "home") || shouldRestart(ns)) {
			ns.toast("Shutting down!", "warning");
			ns.run("augmentAndRestart.js", 1, "forceRestart");
			ns.exit();
		}

		await ns.sleep(60000);
	}
}

function shouldRestart(ns: NS): boolean {
	return ports.checkPort(ns, ports.AUGMENT_AND_RESTART, (v) => v === "true") ?? false;
}

function anyScriptRunning(ns: NS, filename: string): boolean {
	return ns.ps().some(p => p.filename == filename);
}