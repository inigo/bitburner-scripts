import { NS } from '@ns'
import * as ports from "libPorts";

/// Most basic control script - runs on a minimal server, and runs simple upgrades

const hackScript = "basicHack.js";

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");
	ns.enableLog("run");

	// We need to wait for various of these scripts to finish, or they break the next script if memory limited
	// It also helps to pause because at high levels, we'll reach high hacking / money after a few seconds wait

	ns.tprint("Bootstrapping...");

	ns.run("uiDashboard.js");
	await ns.sleep(200);

	ns.run("/sleeve/sleeveControl.js", 1, "study");
	await ns.sleep(1000);

	ns.run("/basic/studyCs.js");
	await ns.sleep(200);
	while (anyScriptRunning(ns, "/basic/studyCs.js")) {
		await ns.sleep(1000);
	}

	ns.run("/sleeve/sleeveControl.js", 1, "clear");
	await ns.sleep(1000);

	ns.run("/corp/manageCorp.js");
	await ns.sleep(200);
	// This will abort if not in a gang
	ns.run("/crime/manageGang.js");
	await ns.sleep(200);
	ns.run("/crime/intermittentWarfare.js");
	await ns.sleep(200);

	// In early stages, before money production is high via other means, gamble in the casino for starting cash
	const moneyAvailable = ns.getServerMoneyAvailable("home");
	if (moneyAvailable < 5_000_000 || ns.getServerMaxRam("home") < 512) {
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
							, "/hacknet/selectHashTarget.js"							
							, "/hacknet/sellHashes.js"
							, "/hacknet/upgradeNodes.js"
							, "/contracts/solveContracts.js"
							, "/sleeve/selectSleeveTask.js"
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
	const cheatingCasino = anyScriptRunning(ns, "/basic/cheatCasino.js");
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

function anyScriptRunning(ns: NS, filename: string): boolean {
	return ns.ps().some(p => p.filename == filename);
}