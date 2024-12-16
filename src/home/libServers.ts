import { NS } from '@ns';

/** Find all servers in the game, including purchased and hacknet servers and home. */
export function findAllServers(ns: NS, server = "home", foundAlready: string[] = []): string[] {
	const newServers = ns.scan(server).filter(s => ! foundAlready.includes(s));
	const foundNow = [... foundAlready, ... newServers];
	return [... new Set([... foundNow, ... newServers.flatMap( s => findAllServers(ns, s, foundNow)) ])];
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