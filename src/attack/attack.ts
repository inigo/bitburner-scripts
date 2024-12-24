import { fmt } from "@/libFormat";
import { log, reportOnServer, runningAttacks } from "@/attack/libAttack";
import { NS } from '@ns';
import { AttackController } from "@/attack/libController";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers];
}


export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	const hackTarget: string = (ns.args[0] as string);
	if (hackTarget==null) {
		ns.tprint("ERROR No valid hack targets");
		ns.exit();
	}

	const host = ns.getHostname();
	const spareRamBuffer = host=="home" ? 100 : 0;
	const moneyToTakePercent: number = (ns.args[1] as number) ?? 0.5;
	
	const minAttacksBeforeReset = 500;
	const minWaitBeforeResetMs = 600000;
	const resetBufferMs = 5000;

	const availableRam = ns.getServerMaxRam(host) - spareRamBuffer;	

	const initialHackLevel = ns.getPlayer().skills.hacking;

	while(true) {
		killAttacks(ns, hackTarget);
		ns.toast(`Priming ${host} for attack on ${hackTarget}`, "info");

		const cores = ns.getServer(host).cpuCores;
		const primingAttack = new AttackController(ns, hackTarget, availableRam, cores, moneyToTakePercent);
		const primingTiming = primingAttack.timingInfo();
		
		log(ns, fmt(ns)`INFO Planning ${primingTiming.simultaneousAttacks} simultaneous attacks`);		

		const primingAttackInfo = primingAttack.infoPerCycle();
		const memoryNeeded = primingAttackInfo.memory;
		if (memoryNeeded > availableRam) {
			ns.tprint(fmt(ns)`ERROR Unable to run hack on ${hackTarget} from ${host} - insufficient memory. Currently have ${availableRam}GB but need ${memoryNeeded}GB`);
			ns.exit();
		}

		await primingAttack.primeServer();	
		
		// The priming often takes a while, and this sometimes means a significant change in hacking before the real attack starts
		const attack = new AttackController(ns, hackTarget, availableRam, cores, moneyToTakePercent);
		const timing = attack.timingInfo();
		
		ns.toast(fmt(ns)`Launching ${timing.simultaneousAttacks} simultaneous attacks on ${hackTarget} from ${host} with a pause of ${timing.pauseBetweenAttacks}s between each`, "info");
		
		const startTime = new Date().getTime();
		let attacksSoFar = 0;
		let potentiallyUnbalanced = 0;

		const maxMoney = ns.getServerMaxMoney(hackTarget);
		const minSecurity = ns.getServerMinSecurityLevel(hackTarget);
		const hostMaxRam = ns.getServerMaxRam(host);

		let i = 1;
		while(true) {
			if (runningAttacks(ns, hackTarget) < timing.simultaneousAttacks) {
				attack.launchAttack(i++);
			} else {
				log(ns, "WARN Not launching a new attack - maybe timing is off?");
			}
			reportOnServer(ns, hackTarget);			
			await ns.sleep(10);
			await ns.sleep(timing.pauseBetweenAttacks);

			if (ns.getServerMoneyAvailable(hackTarget) < (ns.getServerMaxMoney(hackTarget) / 10)) {
				log(ns, "INFO Insufficient money on server - either unbalanced, or other scripts running");
				potentiallyUnbalanced++;
			} else {
				potentiallyUnbalanced = 0;
			}
			if (potentiallyUnbalanced > 20) {
				log(ns, "WARN Still insufficient money - rebalancing");
				break;
			}

			if ((ns.getServerMaxMoney(hackTarget)!=maxMoney) || (ns.getServerMinSecurityLevel(hackTarget)!=minSecurity)) {
				log(ns, "INFO server stats have changed - probably due to hashes - rebalancing");
				break;
			}

			if ((ns.getServerMaxRam(host)!=hostMaxRam)) {
				log(ns, "INFO host max memory has changed due to server upgrade - rebalancing");
				break;
			}			
			
			const timeElapsed = new Date().getTime() - startTime;
			attacksSoFar++;
			if (attacksSoFar>=minAttacksBeforeReset && timeElapsed >= minWaitBeforeResetMs) {
				log(ns, "INFO Reached rebalance limit.")
				break;
			}
		}

		if (isSignificantHackingIncrease(ns.getPlayer().skills.hacking, initialHackLevel) && host=="home") {
			// Note that this will end completely - on home, we expect it to restart again with a new target shortly
			break;
		}

		await ns.sleep(10);
		await ns.sleep(timing.pauseBetweenAttacks + resetBufferMs);

		restartControlNotRunning(ns);
	}
}

function restartControlNotRunning(ns: NS) {
	const controlScriptRunning = (ns.ps("home").some(p => p.filename==="launchAll.js" || p.filename==="bootstrap.js"));
	if (!controlScriptRunning) {
		ns.exec("/bootstrap.js", "home", 1);
	}
}

function isSignificantHackingIncrease(currentHack: number, originalHack: number): boolean {
	if (originalHack>1500) {
		return false; // No change significant after a certain point
	} else if (currentHack<500) {
		return false; // Changes at a low level are unimportant
	} else if (currentHack > (originalHack * 2)) {
		return true; // Doubling hack level is significant
	} else {
		return false;
	}
}


function killAttacks(ns: NS, target: string): void {
	const host = ns.getHostname();
	const scriptsToKill = ns.ps(host)
		.filter(p => p.filename=="/attack/grow.js" || p.filename=="/attack/weaken.js" || p.filename=="/attack/hack.js")
		.filter(p => p.args.includes(target) );
	scriptsToKill.forEach(p => ns.kill(p.filename, host, ... p.args) );
}
