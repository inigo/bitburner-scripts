import { listBestTargets } from "newAttack"; 
import { listStandardFiles } from "libFiles"
import { fmt } from "libFormat"; 
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");
	const ignoreLimit = (ns.args[0] == "ignoreLimit");
	await buyServerWithAttack(ns, ignoreLimit);
}

async function buyServerWithAttack(ns: NS, ignoreLimit: boolean) {
	const existingCount = ns.getPurchasedServers().length;
	const hackLevel = ns.getHackingLevel();

	if (hackLevel < 500) {
		ns.print("Hack level too low to be worthwhile");
		ns.exit();
	}
	
	const ramSize = (existingCount < 3 || hackLevel < 1000) ? 16384 :
						(existingCount < 6 || hackLevel < 1500) ? 65536 :
						524288;
	const viableTargets = listBestTargets(ns, 60, ramSize);

	if (viableTargets.length==0) {
		ns.print("No suitable targets to attack");
		ns.exit();
	}

	const moneyAvailable = ns.getServerMoneyAvailable("home");
	const serverCost = ns.getPurchasedServerCost(ramSize);
	const canAfford = moneyAvailable >= serverCost;

	if (!canAfford) {
		ns.print(fmt(ns)`Not enough money to buy server - have £${moneyAvailable} but need at least £${serverCost}`);
		ns.exit();
	}

	const maxServers = (hackLevel < 1000) ? 3 : (hackLevel < 1500) ? 6 : 12;
	if (ns.getPurchasedServers().length >= maxServers && !ignoreLimit) {
		ns.print("Enough servers already");
		ns.exit();
	}

	const target = viableTargets[0].name;
	ns.toast("Buying server and attacking "+target);
	await buyAndAttack(ns, ramSize, target);
}

async function buyAndAttack(ns: NS, desiredRam: number, targetServer: string) {
	const newServerName = "pserv-" + desiredRam+"-"+randomInt(1000);
	ns.purchaseServer(newServerName, desiredRam);
	await ns.scp(listStandardFiles(), "home", newServerName);

	const serverToAttack = targetServer;
	ns.exec("newAttack.js", newServerName, 1, serverToAttack);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sellServerSmallerThan(ns: NS, ram: number) {
	const sellableServers = ns.getPurchasedServers()
						.filter(s => ns.getServerMaxRam(s) < ram)
						.sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
	if (sellableServers.length>0) {
		const toSell = sellableServers[0];						
		ns.tprint(`Selling ${toSell} with RAM ${ns.getServerRam(toSell)} GB`);
		ns.deleteServer(toSell);
		return true;
	} else {
		ns.tprint("No servers available to be sold");
		return false;
	}
}

function randomInt(max: number): number {
	return Math.floor(Math.random() * max);
}
  