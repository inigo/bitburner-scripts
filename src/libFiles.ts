import { NS } from '@ns';

/** 
 * Copy the specified file (or all standard files if "all") to the specified servers.
 */
export async function scpToAll(ns:NS, targets: string[], filename: string): Promise<void> {
	for (const t of targets) {
		ns.print("Copying files to "+t);
		const filesToCopy = (filename=="all") ? listStandardFiles() : [ filename ];
		await ns.scp(filesToCopy, "home", t);		
	}
}

/** Files that should be put on every purchased or hacked server. */
export function listStandardFiles(): string[] {
	return [
		"hack.js"
		, "libAttack.js"
		, "pGrow.js"
		, "pWeaken.js"
		, "pHack.js"
		, "pController.js"
		, "listHackTargets.js"
		, "weakenOnly.js"
		, "utils.js"
		, "scan.js"
		, "simpleGrow.js"
		, "simpleWeaken.js"
		, "simpleHack.js"
		, "libSpread.js"
		, "formulaFacade.js"
		, "libPorts.js"
		, "libFormat.js"
		, "libServers.js"
		, "newAttack.js"
	];
}