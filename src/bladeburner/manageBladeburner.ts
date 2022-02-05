import { manageBladeburner } from "bladeburner/libBladeburner";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	if (ns.bladeburner.joinBladeburnerDivision()) {
		ns.stopAction();
		while(true) {
			manageBladeburner(ns);
			await ns.sleep(1000);
		}
	} else {
		ns.print("Not in the bitburner division - nothing to do");
	}
}