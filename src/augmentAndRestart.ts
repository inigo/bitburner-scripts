import { NS } from '@ns'
import { sellAllShares } from "/tix/libTix.js"; 
import { buyLastingPurchases } from "./buyLastingPurchases.js"; 

export async function main(ns: NS): Promise<void> {
	const shouldForceRestart = ns.args[0] == "forceRestart";
	ns.print("Restarting!");
	ns.toast("Restarting!");
	await restart(ns, shouldForceRestart);
}

export async function restart(ns: NS, shouldForceRestart: boolean): Promise<void> {
	ns.rm("shutdown.txt", "home");

	if (ns.getPlayer().hasTixApiAccess) {
		ns.toast("Stopping stock market trading and selling all shares", "info")
		ns.scriptKill("/tix/stockTrade.js", "home");
		sellAllShares(ns);
	}
	if (ns.isBusy()) {
		ns.stopAction();
	}
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
	ns.installAugmentations("bootstrap.js");
}