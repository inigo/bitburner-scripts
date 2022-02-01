import { NS } from '@ns'
import { killMatchingScripts } from "libAttack";

/// Kill all attack scripts on the current server, or those attacks for a specific server

export async function main(ns : NS) : Promise<void> {
	const target = (ns.args[0] as string) ?? "all";
	const host = ns.getHostname();
    
	const killedControllers = killMatchingScripts(ns, host, ["pController.js", "newAttack.js"], target);
	const killedAttacks = killMatchingScripts(ns, host, ["pGrow.js", "pHack.js", "pWeaken.js"], target);
	
	const totalKilled = killedControllers + killedAttacks;
	ns.tprint(`Killed ${totalKilled} processes`);
}
