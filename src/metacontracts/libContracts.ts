import { NS } from '@ns'

export function* listContracts(ns: NS): IterableIterator<ContractInfo> {
	const servers = findAllServers(ns).filter(t => t != "home" && t.substring(0,5)!="pserv");
	for (const s of servers) {
		const contractFiles = ns.ls(s).filter(f => f.endsWith(".cct"));
		for (const f of contractFiles) {
			const contractType = ns.codingcontract.getContractType(f, s);
			const data = ns.codingcontract.getData(f, s);
			const description = ns.codingcontract.getDescription(f, s);
			yield { server: s, filename: f, contractType: contractType, data: data, description: description };
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContractInfo = { server: string, filename: string, contractType: string, data: any, description: string };

/** Find all servers in the game, including purchased and hacknet servers and home. */
function findAllServers(ns: NS, server = "home", foundAlready: string[] = []): string[] {
	const newServers = ns.scan(server).filter(s => ! foundAlready.includes(s));
	const foundNow = [... foundAlready, ... newServers];
	return [... new Set([... foundNow, ... newServers.flatMap( s => findAllServers(ns, s, foundNow)) ])];
}
