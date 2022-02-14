/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	ns.print("Checking for backdoors");
	ns.disableLog("ALL");
	await installAvailableBackdoors(ns);
}

export async function installAvailableBackdoors(ns: NS): Promise<void> {
	const backdoorableServers = listTargetServers().filter(s => isBackdoorable(ns, s.name));
	const routes = findRoutes(ns);
	for (const s of backdoorableServers) {
		const route = routes.find(r => r.name == s.name)!.route;
		ns.print("Installing backdoor on "+s.name);
		await connectAndInstallBackdoor(ns, s.name, route);
	}
}

function listTargetServers(): FactionInfo[] {
	return [ 
		{ faction: "CyberSec", name: "CSEC" }
		, { faction: "NiteSec", name: "avmnite-02h" }
        , { faction: "The Black Hand", name: "I.I.I.I" }
        , { faction: "BitRunners", name: "run4theh111z" }
		// , { faction: "Bachman and Associates", name: "b-and-a" }
		// , { faction: "Clarke Inc", name: "clarkinc" }
		, { faction: "-", name: "powerhouse-fitness" }
		, { faction: "-", name: "zb-def" }
		, { faction: "-", name: "rothman-uni" }
	];
}

function isBackdoorable(ns: NS, s: string): boolean {
	return ns.hasRootAccess(s) 
			&& ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel()
			&& !ns.getServer(s).backdoorInstalled;
}

function findRoutes(ns: NS, currentServer = "home", routeSoFar = [ "home" ]): Route[] {
	const nearbyServers = ns.scan(currentServer).filter(s => ! routeSoFar.includes(s));
	const additionalRoutes = nearbyServers.map(s => findRoutes(ns, s, [... routeSoFar.values(), s]) )
			.reduce((x, y) => [...x, ...y], []);
	return [... additionalRoutes.values(), { name: currentServer, route: routeSoFar }];
}

export async function manuallyConnectTo(ns: NS, s: string): Promise<void> {
	const routes = findRoutes(ns);
	const route = routes.find(r => r.name == s)!.route;
	ns.tprint("Connecting to " + s + " via route "+route);
	for (const r of route) {
		ns.print("Connecting to "+r);
		ns.connect(r);
	}
}

async function connectAndInstallBackdoor(ns: NS, serverName: string, route: string[]): Promise<void> {
	ns.toast("Installing backdoor on  "+serverName);
	for (const r of route) {
		ns.print("Connecting to "+r);
		ns.connect(r);
	}
	await ns.installBackdoor();
	for (const r of route.reverse()) {
		ns.print("Connecting to "+r);
		ns.connect(r);
	}	
}

type FactionInfo = { faction: string, name: string };
type Route = { name: string, route: string[] };
