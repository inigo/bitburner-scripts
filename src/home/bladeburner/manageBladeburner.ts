import { manageBladeburner } from "/bladeburner/libBladeburner";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	ns.disableLog("sleep");
	if (ns.bladeburner.joinBladeburnerDivision()) {
		ns.singularity.stopAction();
		// noinspection InfiniteLoopJS
		while(true) {
			manageBladeburner(ns);
			await ns.sleep(1000);
		}
	} else {
		ns.print("Not in the bladeburner division - nothing to do");
	}
}