import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	if (ns.gang.inGang()) {
		return;
	} else {
		if (ns.heart.break() < -54000) {
			const gangFactions = [ "Tetrads", "Slum Snakes" ];
			gangFactions.filter(g => !ns.getPlayer().factions.includes(g))
						.forEach(g => ns.joinFaction(g));

			const gangName = (ns.getPlayer().factions.includes("Tetrads")) ? "Tetrads" : "Slum Snakes";
			const wasCreated = ns.gang.createGang(gangName);
			if (wasCreated) {
				ns.tprint("Started gang");
				ns.run("/crime/manageGang.js");
				ns.run("/crime/intermittentWarfare.js");
			}
		}
	}
}