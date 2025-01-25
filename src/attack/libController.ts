import { HackingFormulas, NS, Player, Server } from '@ns';
import { fmt } from "@/libFormat";
import { log, reportOnServer, runningAttacks, toIdealServer } from "@/attack/libAttack";

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
		const host = this.ns.getHostname();
		const availableMemory =  this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);

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

		const actualFirstWeaken = firstWeakenInfo.threads == 0 ? 0 :
				firstWeakenInfo.memory <= availableMemory ? firstWeakenTime :
					(firstWeakenInfo.threads /  Math.floor(availableMemory / firstWeakenInfo.memoryPerThread)) * firstWeakenTime;
		const actualGrowth = growthInfo.threads == 0 ? 0 :
			growthInfo.memory <= availableMemory ? growthInfo.time :
				(growthInfo.threads /  Math.floor(availableMemory / growthInfo.memoryPerThread)) * growthInfo.time;
		const actualSecondWeaken = secondWeakenInfo.threads == 0 ? 0 :
				secondWeakenInfo.memory <= availableMemory ? secondWeakenInfo.time :
					(secondWeakenInfo.threads /  Math.floor(availableMemory / secondWeakenInfo.memoryPerThread)) * secondWeakenInfo.time;
		const actualPrimeTime = actualFirstWeaken + actualGrowth + actualSecondWeaken;

		log(this.ns, isOverMemory ? fmt(this.ns)`Time to prime with sufficient threads should be ${idealPrimeTime}s but actually will be ${actualPrimeTime}s` :
			fmt(this.ns)`Time to prime is ${idealPrimeTime}s`);
		return actualPrimeTime;
	}

	async primeServer(): Promise<void> {
		log(this.ns, "Starting priming on "+this.targetServerName);
		reportOnServer(this.ns, this.targetServerName);
		const host = this.ns.getHostname();
		const availableMemory = this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);		

		const securityToReduce = this.ns.getServerSecurityLevel(this.targetServerName) - this.ns.getServerMinSecurityLevel(this.targetServerName);
		const firstWeakenInfo = this.weakenInfo( securityToReduce );
		const availableGrowth = this.ns.getServerMaxMoney(this.targetServerName) / this.ns.getServerMoneyAvailable(this.targetServerName);
		const growthInfo = this.growInfo(availableGrowth);

		const secondWeakenInfo = this.weakenInfo( growthInfo.securityGrowth);

		log(this.ns, fmt(this.ns)`Priming in ${this.initialPrimeTime()}s`);

		if (firstWeakenInfo.threads>0) {
			if (firstWeakenInfo.memory > availableMemory) {
				firstWeakenInfo.threads = Math.floor(availableMemory / firstWeakenInfo.memoryPerThread);
			}
			while (this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)) {				
				this.ns.exec("/attack/weaken.js", host, firstWeakenInfo.threads, this.targetServerName, 0, firstWeakenInfo.time, "prime_"+this.uniqueId(), "weaken1");				
				await this.ns.sleep(2);
				await this.waitForAttacksToEnd();
			}
		}
		if (growthInfo.threads>0 && availableGrowth!=1) {
			if (growthInfo.memory > availableMemory) {
				growthInfo.threads = Math.floor(availableMemory / growthInfo.memoryPerThread);
			}
			while (this.ns.getServerMoneyAvailable(this.targetServerName) < this.ns.getServerMaxMoney(this.targetServerName)) {
				this.ns.exec("/attack/grow.js", host, growthInfo.threads, this.targetServerName, 0, growthInfo.time, "prime_"+this.uniqueId(), "grow");				
				await this.ns.sleep(2);				
				await this.waitForAttacksToEnd();
			}
		}
		if (secondWeakenInfo.threads>0 && availableGrowth!=1) {
			if (secondWeakenInfo.memory > availableMemory) {
				secondWeakenInfo.threads = Math.floor(availableMemory / secondWeakenInfo.memoryPerThread);
			}			
			while (this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)) {
				this.ns.exec("/attack/weaken.js", host, secondWeakenInfo.threads, this.targetServerName, 0, secondWeakenInfo.time, "prime_"+this.uniqueId(), "weaken2");				
				await this.ns.sleep(2);				
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
		this.ns.exec("/attack/hack.js", host, atLeastOne(cycle.hackInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 0), cycle.hackInfo.time, i+"h", this.uniqueId(), "hack");	
		// This one is slowest
		this.ns.exec("/attack/weaken.js", host, atLeastOne(cycle.firstWeakenInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 1), cycle.firstWeakenInfo.time, i+"w1", this.uniqueId(), "weaken1");
		this.ns.exec("/attack/grow.js", host, atLeastOne(cycle.growthInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 2), cycle.growthInfo.time, i+"g", this.uniqueId(), "grow");	
		this.ns.exec("/attack/weaken.js", host, atLeastOne(cycle.secondWeakenInfo.threads), this.targetServerName, expectedEndTimeMillis + (delay * 3), cycle.secondWeakenInfo.time, i+"w2", this.uniqueId(), "weaken2");

		return { time: timeTaken + (delay*3) };
	}	

	timingInfo(minPauseBetweenAttacks = 100): TimingInfo {
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
		const hackThreads = Math.floor(this.moneyToTakePercent / hackPerThread);

		const memoryPerThread = this.ns.getScriptRam("/attack/hack.js");
		const hackMemory = hackThreads * memoryPerThread;
		const securityGrowth = this.ns.hackAnalyzeSecurity( hackThreads );

		return { threads: hackThreads, time: hackTime, securityGrowth: securityGrowth, memory: hackMemory, memoryPerThread: memoryPerThread };
	}

	growInfo(growAmount = (1/(1-this.moneyToTakePercent)), growBuffer = 1.5): ActionInfo {
		const growth = growAmount * growBuffer;
		const player = this.ns.getPlayer();

		const server = this.idealServerInfo;
		const growthTime = this.hf.growTime(server, player)

		const growthThreads = Math.ceil(this.growThreads(server, growth, player)); 
		const memoryPerThread = this.ns.getScriptRam("/attack/grow.js");
		const growthMemory = growthThreads * memoryPerThread;	

		const securityGrowth = this.ns.growthAnalyzeSecurity(growthThreads);

		return { threads: growthThreads, time: growthTime, securityGrowth: securityGrowth, memory: growthMemory, memoryPerThread: memoryPerThread }; 
	}

	growThreads(server: Server, growthAmount: number, player: Player): number {
		let ajdGrowthRate = 1 + (0.03 / server.hackDifficulty!);
		if (ajdGrowthRate > 1.0035) {
			ajdGrowthRate = 1.0035;
		}
		const serverGrowthPercentage = server.serverGrowth! / 100;
		const coreBonus = 1 + (this.sourceServerCores - 1) / 16;
		const cycles =
			Math.log(growthAmount) /
			(Math.log(ajdGrowthRate) *
			player.mults.hacking_grow *
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
		const weakenThreads = Math.ceil(security / weakenPerThread);

		const memoryPerThread = this.ns.getScriptRam("/attack/weaken.js");
		const weakenMemory = weakenThreads * memoryPerThread;	

		return { threads: weakenThreads, time: weakenTime, securityGrowth: (-1 * security), memory: weakenMemory, memoryPerThread: memoryPerThread }; 
	}

    uniqueId(): string {
        return "unique_"+Math.random()+"_"+Math.random(); 
    }
    
}

export type AttackInfo = { time: number };
export type TimingInfo = { simultaneousAttacks: number, pauseBetweenAttacks: number, maximumSimultaneousAttacks: number };
export type CycleInfo = { time: number, memory: number, hackInfo: ActionInfo, firstWeakenInfo: ActionInfo, growthInfo: ActionInfo, secondWeakenInfo: ActionInfo };
export type ActionInfo = { threads: number, time: number, securityGrowth: number, memory: number, memoryPerThread: number };
