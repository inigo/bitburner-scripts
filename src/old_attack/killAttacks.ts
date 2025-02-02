import { NS } from '@ns'
import { killMatchingScripts } from "@/old_attack/libAttack";

/**
 * Kill all attack scripts on the current server, or those attacks against a specific server.
 */
export async function main(ns : NS) : Promise<void> {
	const target = (ns.args[0] as string) ?? "all";
	await killAttacks(ns, target);
}

export async function killAttacks(ns: NS, target = "all"): Promise<void> {
	const host = ns.getHostname();
    
	const killedControllers = killMatchingScripts(ns, host, ["attack/attack.js"], target);
	const killedHacks = killMatchingScripts(ns, host, ["attack/hack.js"], target);
	await ns.sleep(1000); // Reduces the chance that we'll leave the target in a non-ideal state
	const killedAttacks = killMatchingScripts(ns, host, ["attack/grow.js", "attack/hack.js", "attack/weaken.js"], target);
	
	const totalKilled = killedControllers + killedAttacks + killedHacks;
	ns.tprint(`Killed ${totalKilled} processes`);
}