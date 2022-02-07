import { NS } from '@ns'
import { sellAllShares, getOwnedShareValue } from "tix/libTix"; 
import * as ports from "libPorts";

export async function main(ns : NS) : Promise<void> {

	// Get $100b in cash to qualify for Daedalus
	const availableMoney = ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
	if (availableMoney > 100_000_000_000 && !isMemberOrInvited(ns, "Daedalus")) {
		sellAllShares(ns);
		await ports.setPortValue(ns, ports.SHARE_VALUE_PORT, 0);
		await ports.setPortValue(ns, ports.PAUSE_SHARE_TRADING, 60);	
	}

	joinFaction(ns, "Daedalus");

	try {
		ns.run("fl1ght.exe");
	} catch (err) {
		// Ignore
	}
}

function isMemberOrInvited(ns: NS, faction: string): boolean {
	return ns.checkFactionInvitations().includes(faction) || ns.getPlayer().factions.includes(faction);
}

function joinFaction(ns: NS, faction: string) {
	if (ns.checkFactionInvitations().includes(faction)) {
		ns.toast("Joining preferred faction "+faction);
		ns.joinFaction(faction);

		ns.workForFaction(faction, "Hacking Contracts");
		ns.setFocus(true);
	}
}
