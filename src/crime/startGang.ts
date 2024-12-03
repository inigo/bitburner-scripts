import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	if (ns.gang.inGang()) {
		return;
	} else {
		if (ns.heart.break() < -54000) {
			const gangFactions = [ "Speakers for the Dead", "Tetrads", "Slum Snakes" ];
			gangFactions.filter(g => !ns.getPlayer().factions.includes(g))
						.forEach(g => ns.singularity.joinFaction(g));

			const gangName = gangFactions.find(f => ns.getPlayer().factions.includes(f));
			if (gangName==null) {
				ns.toast("Can't start gang - no eligible factions");
				return;
			}
			const wasCreated = ns.gang.createGang(gangName);
			if (wasCreated) {
				ns.tprint("Started gang");
				ns.run("/crime/manageGang.js");
				ns.run("/crime/intermittentWarfare.js");
			}
		}
	}
}