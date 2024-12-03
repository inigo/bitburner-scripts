import { manageGang, getGangInstructions, reportGangInfo } from "crime/libGang";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	if (ns.gang.inGang()) {
		// noinspection InfiniteLoopJS
		while(true) {
			const instructions = getGangInstructions(ns);
			const goal = instructions?.goal ?? "general";
			const stage = instructions?.stage ?? "early";
			await manageGang(ns, goal, stage);
			await reportGangInfo(ns);

			const pause = (ns.gang.getBonusTime() > 0) ? 1000 : 10000;
			await ns.sleep(pause);
		}
	} else {
		ns.print("Not in a gang - nothing to do");
	}
}