import { NS } from '@ns';

/** Find all servers in the game, including purchased and hacknet servers and home. */
export function findAllServers(ns: NS): string[] {
	ns.disableLog("disableLog");
	ns.disableLog("scan");
	
	const toScan: string[] = ns.scan();
	const foundServers = new Set<string>();
	ns.print("Scanning for servers - starting with initial set of: "+toScan);

	while (toScan.length > 0) {
		const current: string = (toScan.pop() as string);
		foundServers.add(current);

		const newServers = ns.scan(current);
		newServers.forEach(s => { 
			if (!foundServers.has(s)) { toScan.push(s) } 
		});
	}

	return [...foundServers];
}

/** Find servers with root access, excluding purchased servers and home. */
export function findCrackedServers(ns: NS): string[] {
	return findAllServers(ns)
			.filter(t => ns.hasRootAccess(t))
			.filter(t => t != "home" && !t.startsWith("pserv") && !t.startsWith("hacknet"));
}

export function findPurchasedServers(ns: NS): string[] {
	return findAllServers(ns)
			.filter(t => t.startsWith("pserv"));
}

export function findAllHackableServers(ns: NS): string[] {
	return findAllServers(ns)
						.filter(t => ns.hasRootAccess(t))
						.filter(t => t != "home" && t.substring(0,5)!="pserv" && !t.startsWith("hacknet"))
						.filter(t => ns.getServerMaxMoney(t) > 0 );		
}

export function findBestServersForExperience(ns: NS, count = 10): string[] {
	return findAllHackableServers(ns)
						.sort((a, b) => ns.getHackTime(a) - ns.getHackTime(b))
						.slice(0, count);
}

export function findBestServersForMoney(ns: NS, count = 10): string[] {
	return findAllHackableServers(ns)
						.filter(t => ns.getServerRequiredHackingLevel(t) < ns.getHackingLevel() )
						.filter(t => ns.hackAnalyzeChance(t) > 0.5 )
						.sort((a, b) => ns.getServerMaxMoney(a) - ns.getServerMaxMoney(b))
						.reverse()
						.slice(0, count);
}