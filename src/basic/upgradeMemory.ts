import { NS } from '@ns'
import { buyWithShares } from "tix/libShareSelling";
import { say } from "speech/libSpeech"

export async function main(ns : NS) : Promise<void> {
	const upgradeSucceeded = await buyWithShares(ns, ns.singularity.getUpgradeHomeRamCost(), () => ns.singularity.upgradeHomeRam());
	if (upgradeSucceeded) {
		say("Upgrading memory");
		if (ns.getServerMaxRam("home")<=8192) {
			// Kill running attacks, because we're likely to want to switch target at the beginning
			ns.run("/attack/killAttacks.js");
		}
	}
}