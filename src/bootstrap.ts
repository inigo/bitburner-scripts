import { NS } from '@ns'
import * as ports from "@/libPorts";
import {anyScriptRunning, launchIfNotRunning} from "@/libLaunch";
import {getGoal} from "@/goal/libGoal";

/// Most basic control script - runs on a minimal server, and runs simple upgrades. RUN THIS FIRST!

const hackScript = "/basic/timedHack.js";

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");
	ns.enableLog("run");

	// We need to wait for various of these scripts to finish, or they break the next script if memory limited
	// It also helps to pause because at high levels, we'll reach high hacking / money after a few seconds wait

	ns.tprint("Bootstrapping...");

	ns.run("/reporting/logProgress.js");
	await ns.sleep(100);

	await launchIfNotRunning(ns, "/react/newUiDashboard.js");

	ns.run("/goal/selectGoal.js");
	await ns.sleep(100);

	const goal = getGoal(ns);

	if (goal=="stocks") {
		await bootstrapStocks(ns);
		return;
	}

	ns.run("/sleeve/sleeveControl.js", 1, "study");
	await ns.sleep(1000);

	ns.run('/stanek/buyStanek.js');
	ns.run("/stanek/launchChargeFragments.js", 1, 25);
	await ns.sleep(200);
	while (anyScriptRunning(ns, "stanek/chargeFragments.js")) {
		await ns.sleep(1000);
	}

	ns.run("/basic/studyCs.js");
	await ns.sleep(200);
	while (anyScriptRunning(ns, "basic/studyCs.js")) {
		await ns.sleep(1000);
	}

	ns.run("/sleeve/sleeveControl.js", 1, "clear");
	await ns.sleep(1000);

	await launchIfNotRunning(ns, "/corp/manageStartup.js");
	// await launchIfNotRunning(ns, "/corp/manageCorp.js");

	// These will abort if not in a gang
	await launchIfNotRunning(ns, "/crime/manageGang.js", 200);
	await launchIfNotRunning(ns, "/crime/intermittentWarfare.js", 200);

	// In early stages, before money production is high via other means, gamble in the casino for starting cash
	await ns.sleep(10_000);
	if (ns.getServerMoneyAvailable("home") < 300_000_000 || ns.getServerMaxRam("home") < 512) {
		await ns.sleep(1000);
		ns.run("/basic/cheatCasino.js");
	}

	while(! isPhaseTwo(ns)) {
		if (! anyScriptRunning(ns, hackScript)) {
			const scripts = [
							"/basic/upgradeMemory.js"
							, "/basic/buyCracks.js"
							, "/basic/crackAll.js" 
							, "/basic/installBackdoors.js" 
							, "/spread/spreadAttackController.js"
							, "/hacknet/sellHashes.js"
							, "/hacknet/selectHashTarget.js"
							, "/hacknet/upgradeNodes.js"
							, "/contracts/solveContracts.js"
							, "/sleeve/selectSleeveTask.js"
							, "/reporting/logProgress.js"
							];
			for (const script of scripts) {
				ns.run(script);
				while (anyScriptRunning(ns, script)) {
					await ns.sleep(200);
				}				
			}
			launchHackLocal(ns);
		}
		await ns.sleep(10000);
	}

	ns.tprint("Second phase reached - ending bootstrap and switching to next control script");
	ns.scriptKill(hackScript, "home");
	ns.spawn("launchAll.js");
}

function isPhaseTwo(ns: NS): boolean {
	const allCracksBought = (ports.checkPort(ns, ports.CRACKS_BOUGHT_COUNT, parseInt)==5);
	const cheatingCasino = anyScriptRunning(ns, "basic/cheatCasino.js") || anyScriptRunning(ns, "casino/coinFlip.js");
	return ns.getServerMaxRam("home") >= 1024 && ns.getServerMoneyAvailable("home") > 1_000_000 && allCracksBought && !cheatingCasino;
}

function launchHackLocal(ns: NS): void {
	const scriptMem = ns.getScriptRam(hackScript, "home");
	const ramToKeepFree = ns.getServerMaxRam("home") >= 256 ? 100 : 50;
	const ram = ns.getServerMaxRam("home") - ns.getServerUsedRam("home") - ramToKeepFree;
	const threads = Math.floor(ram / scriptMem);

	const hackTarget = (ns.getHackingLevel()>=80) ? "harakiri-sushi" : "joesguns";
	const maxMoney = ns.getServerMaxMoney(hackTarget);
	const minSecurity = ns.getServerMinSecurityLevel(hackTarget);	
	ns.print(`Launching hack script to hack ${hackTarget}`);
	ns.run(hackScript, threads, hackTarget, maxMoney, minSecurity, "stopAfterDelay");
}


/**
 * For Bitnode 8, we only make money from stocks, so there aren't many other scripts to run.
 */
async function bootstrapStocks(ns: NS) {
	ns.tprint("Bootstrapping in stocks mode - this will not do most normal actions...");
	if (!anyScriptRunning(ns, "tix/stockTrade.js")) {
		ns.run("/tix/stockTrade.js", 1, "live");
	}

	ns.run("/basic/studyCs.js");
	await ns.sleep(200);
	while (anyScriptRunning(ns, "basic/studyCs.js")) {
		await ns.sleep(1000);
	}

	// noinspection InfiniteLoopJS
	while(true) {
		if (!anyScriptRunning(ns, hackScript)) {
			const scripts = [
				"basicCrackAll.js"
				, "spread/attackShareholdings.js"
				, "spread/spreadAttackController.js"
				, "basic/buyStockmarket.js"
				, "basic/installBackdoors.js"
				, "joinDaedalus.js"
				, "sleeve/reportSleeveTasks.js"
				, "crime/reportGangStatus.js"
				, "contracts/solveContracts.js"
			];
			for (const script of scripts) {
				ns.run(script);
				while (anyScriptRunning(ns, script)) {
					await ns.sleep(200);
				}
			}
		}

		await ns.sleep(60000);
	}
}
