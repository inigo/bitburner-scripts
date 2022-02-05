import { findAllHackableServers } from "libServers";
import { fmt } from "libFormat";
import { log } from "libAttack";
import { HackingFormulas, NS, Player, Server } from '@ns';

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
			
			const timeElapsed = new Date().getTime() - startTime;
			attacksSoFar++;
			if (attacksSoFar>=minAttacksBeforeReset && timeElapsed >= minWaitBeforeResetMs) {
				log(ns, "INFO Reached rebalance limit.")
				break;
			}
		}
		await ns.sleep(10);
		await ns.sleep(timing.pauseBetweenAttacks + resetBufferMs);
	}
}


export function listBestTargets(ns: NS, paybackPeriodInMinutes = 60, serverRam: number = ns.getServerMaxRam("home"), serverCores = 1, moneyToTakePercent = 0.5): TargetInfo[] {
	const targets = findAllHackableServers(ns);
	const attacks = listRunningAttacks(ns);
	const player = ns.getPlayer();
	const targetDetails = targets.map(t => {
		const attack = new AttackController(ns, t, serverRam, serverCores, moneyToTakePercent);
		const timingInfo = attack.timingInfo();
		const memoryPerAttack = attack.infoPerCycle().memory;
		const maxMoney = ns.getServerMaxMoney(t);
		const bestMoneyPerAttack = Math.round(maxMoney * moneyToTakePercent);

		const chance = ns.formulas.hacking.hackChance(toIdealServer(ns, t), player);
		const actualMoneyPerAttack = bestMoneyPerAttack * chance;

		const attacksPerSecond = 1000 * timingInfo.simultaneousAttacks / attack.infoPerCycle().time;
		const incomePerSecond = actualMoneyPerAttack * attacksPerSecond;

		const totalMemory = (memoryPerAttack * timingInfo.simultaneousAttacks) + ns.getScriptRam("newAttack.js", "home") 

		const initialPrimeTime = attack.initialPrimeTime();

		const paybackPeriodInSeconds = paybackPeriodInMinutes * 60;
		const timeForAttacksInSeconds = paybackPeriodInSeconds - (initialPrimeTime/1000);

		const incomeInPaybackPeriod = incomePerSecond * timeForAttacksInSeconds; 
		const incomeWithinPeriodPerSecond = incomeInPaybackPeriod / paybackPeriodInSeconds;

		const isAttacked = attacks.includes(t);

		return { name: t, incomeWithinPeriodPerSecond: incomeWithinPeriodPerSecond, incomePerSecond, totalMemory, maxMoney, time: timingInfo.pauseBetweenAttacks, threads: timingInfo.simultaneousAttacks, chance: chance, initialPrimeTime, isAttacked };
	});
	return targetDetails
				.filter(td => td.totalMemory <= serverRam)
				.filter(td => td.incomePerSecond > 0 )
				.filter(td => td.incomeWithinPeriodPerSecond > 0 )
				.sort((a, b) => a.incomeWithinPeriodPerSecond - b.incomeWithinPeriodPerSecond)
				.reverse();
}

function listRunningAttacks(ns: NS): string[] {
	const servers = [... ns.getPurchasedServers(), "home"];
	const attackedServers = servers.flatMap(s => ns.ps(s).filter(p => p.filename=="pController.js" || p.filename=="safePController.js" || p.filename=="newAttack.js").map(p => p.args[0]) );
	const distinctTargets = [...new Set(attackedServers)];
	return distinctTargets;	
}

export type TargetInfo = { name: string, incomeWithinPeriodPerSecond: number, incomePerSecond: number, maxMoney: number, totalMemory: number, time: number, threads: number, chance: number, initialPrimeTime: number, isAttacked: boolean };

function toIdealServer(ns: NS, serverName: string): Server {
	const serverInfo = ns.getServer(serverName);
	return { ... serverInfo, hackDifficulty: serverInfo.minDifficulty, moneyAvailable: serverInfo.moneyMax };
}

export class AttackController {
	targetServerName = "";
	sourceServerRam = 0;
	sourceServerCores = 0;
	moneyToTakePercent = 0;
	internalDelay = 0;
	additionalDelay = 0;
	idealServerInfo: Server;
	ns: NS;
	hf: HackingFormulas;
	constructor(ns: NS, targetServerName: string, sourceServerRam: number, sourceServerCores = 1, moneyToTakePercent = 0.5) {
		this.ns = ns;
		this.hf = ns.formulas.hacking;
		this.targetServerName = targetServerName;
		this.idealServerInfo = toIdealServer(ns, targetServerName);
		this.sourceServerRam = sourceServerRam;
		this.sourceServerCores = sourceServerCores;
		this.moneyToTakePercent = moneyToTakePercent;

		this.internalDelay = 200;
		this.additionalDelay = 300;
	}

	initialPrimeTime(): number {
		const firstWeakenTime = (this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)) ? this.ns.getWeakenTime(this.targetServerName) : 0;

		const availableGrowth = this.ns.getServerMaxMoney(this.targetServerName) / this.ns.getServerMoneyAvailable(this.targetServerName);
		const growthInfo = this.growInfo(availableGrowth);
		const growthTime = (availableGrowth>1) ? growthInfo.time : 0;

		const secondWeakenInfo = this.weakenInfo( growthInfo.securityGrowth);
		const secondWeakenTime = (availableGrowth>1) ? secondWeakenInfo.time : 0;

		const totalPrimeTime = firstWeakenTime + growthTime + secondWeakenTime;
		return totalPrimeTime;
	}

	async primeServer(): Promise<void> {
		log(this.ns, "Starting priming on "+this.targetServerName);
		reportOnServer(this.ns, this.targetServerName);
		const host = this.ns.getHostname();
		const availableMemory = this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);		

		const securityToReduce = this.ns.getServerSecurityLevel(this.targetServerName) - this.ns.getServerMinSecurityLevel(this.targetServerName);
		const firstWeakenInfo = this.weakenInfo( securityToReduce );
		const firstWeakenTime = this.ns.getWeakenTime(this.targetServerName);

		const availableGrowth = this.ns.getServerMaxMoney(this.targetServerName) / this.ns.getServerMoneyAvailable(this.targetServerName);
		const growthInfo = this.growInfo(availableGrowth);

		const secondWeakenInfo = this.weakenInfo( growthInfo.securityGrowth);

		const idealPrimeTime = ((firstWeakenInfo.threads>0) ? firstWeakenTime : 0) +
									((growthInfo.threads>0) ? growthInfo.time : 0) +
									((secondWeakenInfo.threads>0) ? secondWeakenInfo.time : 0);
		const isOverMemory = Math.max(firstWeakenInfo.memory, growthInfo.memory, secondWeakenInfo.memory) > availableMemory;
		const overMemoryMessage = isOverMemory ? " but insufficient memory, so expect longer" : "";
		log(this.ns, fmt(this.ns)`Time to prime with sufficient threads should be ${idealPrimeTime}s${overMemoryMessage}`);

		if (firstWeakenInfo.threads>0) {
			if (firstWeakenInfo.memory > availableMemory) {
				firstWeakenInfo.threads = Math.floor(availableMemory / firstWeakenInfo.memoryPerThread);
			}
			while (this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)) {
				this.ns.exec("pWeaken.js", host, firstWeakenInfo.threads, this.targetServerName, 0, firstWeakenInfo.time, "prime_"+uniqueId(), "weaken1");				
				await this.waitForAttacksToEnd();
			}
		}
		if (growthInfo.threads>0 && availableGrowth!=1) {
			if (growthInfo.memory > availableMemory) {
				growthInfo.threads = Math.floor(availableMemory / growthInfo.memoryPerThread);
			}
			while (this.ns.getServerMoneyAvailable(this.targetServerName) < this.ns.getServerMaxMoney(this.targetServerName)) {
				this.ns.exec("pGrow.js", host, growthInfo.threads, this.targetServerName, 0, growthInfo.time, "prime_"+uniqueId(), "grow");				
				await this.waitForAttacksToEnd();
			}
		}
		if (secondWeakenInfo.threads>0 && availableGrowth!=1) {
			if (secondWeakenInfo.memory > availableMemory) {
				secondWeakenInfo.threads = Math.floor(availableMemory / secondWeakenInfo.memoryPerThread);
			}			
			while (this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)) {
				this.ns.exec("pWeaken.js", host, secondWeakenInfo.threads, this.targetServerName, 0, secondWeakenInfo.time, "prime_"+uniqueId(), "weaken2");				
				await this.waitForAttacksToEnd();
			}
		}		
		log(this.ns, "Priming completed for "+this.targetServerName);
		reportOnServer(this.ns, this.targetServerName);
	}	

	async waitForAttacksToEnd(): Promise<void> {
		while(true) {
			if (! runningAttacks(this.ns, this.targetServerName)) {
				break;
			}
			await this.ns.sleep(500);
		}		
	}

	launchAttack(i: number): AttackInfo {
		const cycle = this.infoPerCycle();

		const timeTaken = cycle.time + this.additionalDelay;
		const expectedEndTimeMillis = new Date().getTime() + timeTaken;
		const atLeastOne = (t: number) => isNaN(t) ? 1 : Math.max(t, 1);

		log(this.ns, fmt(this.ns)`Launching attack (batch ${i}) on ${this.targetServerName} - to take ${timeTaken}s`);

		const delay = this.internalDelay;

		const host = this.ns.getHostname();
		this.ns.exec("pHack.js", host, atLeastOne(cycle.hackInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 0), cycle.hackInfo.time, i+"h", uniqueId(), "hack");	
		// This one is slowest
		this.ns.exec("pWeaken.js", host, atLeastOne(cycle.firstWeakenInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 1), cycle.firstWeakenInfo.time, i+"w1", uniqueId(), "weaken1");
		this.ns.exec("pGrow.js", host, atLeastOne(cycle.growthInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 2), cycle.growthInfo.time, i+"g", uniqueId(), "grow");	
		this.ns.exec("pWeaken.js", host, atLeastOne(cycle.secondWeakenInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 3), cycle.secondWeakenInfo.time, i+"w2", uniqueId(), "weaken2");

		return { time: timeTaken + (delay*3) };
	}	

	timingInfo(minPauseBetweenAttacks = 300): TimingInfo {
		const cycle = this.infoPerCycle();

		const timingConstrainedSimultaneousAttacks = Math.floor(cycle.time / minPauseBetweenAttacks);
		const memoryConstrainedSimultaneousAttacks = Math.floor(this.sourceServerRam / cycle.memory);
		const simultaneousAttacks = Math.min( memoryConstrainedSimultaneousAttacks, timingConstrainedSimultaneousAttacks);
		const pauseBetweenAttacks = Math.max(Math.ceil(cycle.time / simultaneousAttacks), minPauseBetweenAttacks)+this.additionalDelay+(this.internalDelay*3);

		log(this.ns, fmt(this.ns)`Total time is ${cycle.time}s and min pause is ${minPauseBetweenAttacks}s giving timing constrained max attacks of ${timingConstrainedSimultaneousAttacks}`);
		log(this.ns, fmt(this.ns)`Available RAM is ${this.sourceServerRam}GB and totalMemory is ${cycle.memory}GB giving memory constrained max of ${memoryConstrainedSimultaneousAttacks}`);
		log(this.ns, fmt(this.ns)`Simultaneous attacks is min of those: ${simultaneousAttacks}`);
		log(this.ns, fmt(this.ns)`Pause between attacks is max of time/attacks i.e. ${Math.ceil(cycle.time / simultaneousAttacks)} and min pause of ${minPauseBetweenAttacks} hence ${pauseBetweenAttacks}`);
		return { simultaneousAttacks: simultaneousAttacks, pauseBetweenAttacks: pauseBetweenAttacks, maximumSimultaneousAttacks: memoryConstrainedSimultaneousAttacks };
	}

	infoPerCycle(): CycleInfo { 
		const hackInfo = this.hackInfo();
		const firstWeakenInfo = this.weakenInfo(hackInfo.securityGrowth);
		const growthInfo = this.growInfo();
		const secondWeakenInfo = this.weakenInfo(growthInfo.securityGrowth);

		const totalMemory = hackInfo.memory + firstWeakenInfo.memory + growthInfo.memory + secondWeakenInfo.memory;
		const totalTime = Math.max(hackInfo.time, growthInfo.time, firstWeakenInfo.time, secondWeakenInfo.time);
		return { time: totalTime, memory: totalMemory, hackInfo: hackInfo, firstWeakenInfo: firstWeakenInfo, growthInfo: growthInfo, secondWeakenInfo: secondWeakenInfo }; 
	}

	hackInfo(): ActionInfo {
		const player = this.ns.getPlayer();
		const server = this.idealServerInfo;
		const hackTime = this.hf.hackTime(server, player);

		const hackPerThread = this.hf.hackPercent(server, player);
		const hackThreads = this.moneyToTakePercent / hackPerThread;

		const memoryPerThread = this.ns.getScriptRam("pHack.js");
		const hackMemory = hackThreads * memoryPerThread;
		const securityGrowth = this.ns.hackAnalyzeSecurity( hackThreads );

		return { threads: hackThreads, time: hackTime, securityGrowth: securityGrowth, memory: hackMemory, memoryPerThread: memoryPerThread };
	}

	growInfo(growAmount = (1/(1-this.moneyToTakePercent)), growBuffer = 1.5): ActionInfo {
		const growth = growAmount * growBuffer;
		const player = this.ns.getPlayer();

		const server = this.idealServerInfo;
		const growthTime = this.hf.growTime(server, player)

		const growthThreads = this.growThreads(server, growth, player); 
		const memoryPerThread = this.ns.getScriptRam("pGrow.js");
		const growthMemory = growthThreads * memoryPerThread;	

		const securityGrowth = this.ns.growthAnalyzeSecurity(growthThreads);

		return { threads: growthThreads, time: growthTime, securityGrowth: securityGrowth, memory: growthMemory, memoryPerThread: memoryPerThread }; 
	}

	growThreads(server: Server, growthAmount: number, player: Player): number {
		let ajdGrowthRate = 1 + (0.03 / server.hackDifficulty);
		if (ajdGrowthRate > 1.0035) {
			ajdGrowthRate = 1.0035;
		}
		const serverGrowthPercentage = server.serverGrowth / 100;
		const coreBonus = 1 + (this.sourceServerCores - 1) / 16;
		const cycles =
			Math.log(growthAmount) /
			(Math.log(ajdGrowthRate) *
			player.hacking_grow_mult *
			serverGrowthPercentage *
			this.ns.getBitNodeMultipliers().ServerGrowthRate *
			coreBonus);
		return cycles;
	}

	weakenInfo(amountToReduce: number, weakenBuffer = 1.2): ActionInfo {
		const security = amountToReduce * weakenBuffer;
		const player = this.ns.getPlayer();
		const server = this.idealServerInfo; 
		const weakenTime = this.hf.weakenTime(server, player);

		const coreBonus = 1 + (this.sourceServerCores - 1) / 16;
		const weakenPerThread = 0.05 * coreBonus;
		const weakenThreads = security / weakenPerThread;

		const memoryPerThread = this.ns.getScriptRam("pWeaken.js");
		const weakenMemory = weakenThreads * memoryPerThread;	

		return { threads: weakenThreads, time: weakenTime, securityGrowth: (-1 * security), memory: weakenMemory, memoryPerThread: memoryPerThread }; 
	}

}

export type AttackInfo = { time: number };
export type TimingInfo = { simultaneousAttacks: number, pauseBetweenAttacks: number, maximumSimultaneousAttacks: number };
export type CycleInfo = { time: number, memory: number, hackInfo: ActionInfo, firstWeakenInfo: ActionInfo, growthInfo: ActionInfo, secondWeakenInfo: ActionInfo };
export type ActionInfo = { threads: number, time: number, securityGrowth: number, memory: number, memoryPerThread: number };

function runningAttacks(ns: NS, target: string): number {
	const scripts = ns.ps();
	const growScripts = scripts.filter(p => p.filename=="pGrow.js" && p.args.includes(target));
	const hackScripts = scripts.filter(p => p.filename=="pHack.js" && p.args.includes(target));
	const weaken1Scripts = scripts.filter(p => p.filename=="pWeaken.js" && p.args.includes(target) && p.args.includes("weaken1") );
	const weaken2Scripts = scripts.filter(p => p.filename=="pWeaken.js" && p.args.includes(target) && p.args.includes("weaken2") );
	return Math.max(growScripts.length, hackScripts.length, weaken1Scripts.length, weaken2Scripts.length);
}

function killAttacks(ns: NS, target: string): void {
	const host = ns.getHostname();
	const scriptsToKill = ns.ps(host)
		.filter(p => p.filename=="pGrow.js" || p.filename=="pHack.js" || p.filename=="pWeaken.js")
		.filter(p => p.args.includes(target) );
	scriptsToKill.forEach(p => ns.kill(p.filename, host, ... p.args) );
}

function uniqueId(): string {
	return "unique_"+Math.random()+"_"+Math.random(); 
}

function reportOnServer(ns: NS, s: string) {
	const security = ns.getServerSecurityLevel(s);
	const minSecurity = ns.getServerMinSecurityLevel(s);
	const presentMoney = ns.getServerMoneyAvailable(s);
	const maxMoney = ns.getServerMaxMoney(s);
	log(ns, fmt(ns)`For ${s}, security level is ${security} (min is ${minSecurity}) and money is £${presentMoney} of £${maxMoney}`);
}