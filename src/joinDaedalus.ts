import {NS} from '@ns'
import {getOwnedShareValue, pauseTrading, reportShareStatus, sellAllShares} from "@/tix/libTix";

export async function main(ns : NS) : Promise<void> {

	// Get $100b in cash to qualify for Daedalus
	const availableMoney = ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
	if (availableMoney > 100_000_000_000 && !isMemberOrInvited(ns, "Daedalus")) {
		sellAllShares(ns);
		await reportShareStatus(ns);
		await pauseTrading(ns);
	}

	joinFaction(ns, "Daedalus");

	try {
		ns.run("fl1ght.exe");
	} catch (err) {
		// Ignore
	}
}

function isMemberOrInvited(ns: NS, faction: string): boolean {
	return ns.singularity.checkFactionInvitations().includes(faction) || ns.getPlayer().factions.includes(faction);
}

function joinFaction(ns: NS, faction: string) {
	if (ns.singularity.checkFactionInvitations().includes(faction)) {
		ns.toast("Joining preferred faction "+faction);
		ns.singularity.joinFaction(faction);

		ns.singularity.workForFaction(faction, ns.enums.FactionWorkType.hacking);
		ns.singularity.setFocus(true);
	}
}
