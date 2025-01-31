import { NS } from '@ns'
import { killMatchingScripts } from "@/attack2/libAttack";

/**
 * Kill all attack scripts on the current server, or those attacks against a specific server.
 */
export async function main(ns : NS) : Promise<void> {
	const target = (ns.args[0] as string) ?? "all";
	await killAttacks(ns, target);
}

export async function killAttacks(ns: NS, target = "all"): Promise<void> {
	const host = ns.getHostname();
    
	const killedControllers = killMatchingScripts(ns, host, ["attack2/attack.js"], target);
	const killedHacks = killMatchingScripts(ns, host, ["attack2/hack.js"], target);
	await ns.sleep(1000); // Reduces the chance that we'll leave the target in a non-ideal state
	const killedAttacks = killMatchingScripts(ns, host, ["attack2/grow.js", "attack2/hack.js", "attack2/weaken.js"], target);
	
	const totalKilled = killedControllers + killedAttacks + killedHacks;
	ns.tprint(`Killed ${totalKilled} processes`);
}