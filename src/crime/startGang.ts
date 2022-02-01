import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	if (ns.gang.inGang()) {
		return;
	} else {
		const wasCreated = ns.gang.createGang("Tetrads");
		if (wasCreated) {
			ns.tprint("Started gang");
			ns.run("/crime/manageGang.js");
			ns.run("/crime/intermittentWarfare.js");
		}
	}
}