import { NS } from '@ns'
import { sellAllShares } from "tix/libTix"; 
import { buyLastingPurchases } from "augment/buyLastingPurchases"; 

export async function main(ns: NS): Promise<void> {
	const shouldForceRestart = ns.args[0] == "forceRestart";
	ns.print("Restarting!");
	ns.toast("Restarting!");
	await restart(ns, shouldForceRestart);
}

export async function restart(ns: NS, shouldForceRestart: boolean): Promise<void> {
	ns.scriptKill("/tix/stockTrade.js", "home");
	sellAllShares(ns);

	if (ns.singularity.isBusy()) { ns.singularity.stopAction(); }
	await buyLastingPurchases(ns);
	const shouldRestart = shouldForceRestart || await ns.prompt("Install augmentations and restart?")
	if (shouldRestart) {
		await installAndRestart(ns);
	} else {
		ns.toast("Aborting restart");
	}
}

async function installAndRestart(ns: NS): Promise<void> {
	ns.toast("Restarting in 10 seconds", "warning");
	await ns.sleep(10000);
	ns.singularity.installAugmentations("bootstrap.js");
}