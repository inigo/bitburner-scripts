import { NS } from '@ns'
import { TargetFinder }  from "/attack/libTargets";
import { say } from "/speech/libSpeech"

export async function main(ns : NS) : Promise<void> {
	if (ns.scriptRunning("/attack/attack.js", "home")) {
		ns.print("Attack already running");
		return;
	} 

	const ramToKeepFree = 128;
	const availableRam = ns.getServerMaxRam("home") - ramToKeepFree;
    const cores = ns.getServer("home").cpuCores;

    const targetFinder = new TargetFinder(ns);
	const viableTargets = targetFinder.listBestTargets(60, availableRam, cores).filter(t => ! t.isAttacked);

	if (viableTargets.length==0) {
		ns.print("No suitable targets to attack");
		return;
	}
	
	const serverToAttack = viableTargets[0].name;
	ns.toast("Launching an attack from home on "+serverToAttack);
	const pid = ns.exec("/attack/attack.js", "home", 1, serverToAttack);
	if (pid > 0) {
		say("Launched an attack from home on "+serverToAttack);
	}
}

