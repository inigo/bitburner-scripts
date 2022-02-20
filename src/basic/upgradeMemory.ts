import { NS } from '@ns'
import { buyWithShares } from "tix/libShareSelling"; 

export async function main(ns : NS) : Promise<void> {
	const upgradeSucceeded = await buyWithShares(ns, ns.getUpgradeHomeRamCost(), () => ns.upgradeHomeRam());
	if (upgradeSucceeded) {
		if (ns.getServerMaxRam("home")<=8192) {
			// Kill running attacks, because we're likely to want to switch target at the beginning
			ns.run("/attack/killAttacks.js");
		}
	}
}