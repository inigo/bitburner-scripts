import {HackingFormulas, NS, Player, Server} from '@ns'
import {fmt} from "@/libFormat";
import {baseDir, DoAttackParams, log, reportOnServer, toIdealServer} from "@/attack2/libAttack";

export class AttackController {
    private ns: NS;
    private hf: HackingFormulas;

    private sourceHostName: string;
    private targetServerName: string;
    private sourceServerRam: number;
    private sourceServerCores = 1;
    private bufferTimeWithinAttack = 20;
    private bufferTimeBetweenAttacks = 20;
    private moneyToTakePercentage = 0.5;

    private port: number;
    private idealServerInfo: Server;

    constructor(ns: NS, targetServerName: string, sourceServerRam: number, sourceServerCores = 1,
                bufferTimeWithinAttack = 20, bufferTimeBetweenAttacks = 20) {
        this.ns = ns;
        this.hf = ns.formulas.hacking;

        this.sourceHostName = this.ns.getHostname();
        this.targetServerName = targetServerName;
        this.sourceServerRam = sourceServerRam;
        this.sourceServerCores = sourceServerCores;
        this.bufferTimeWithinAttack = bufferTimeWithinAttack;
        this.bufferTimeBetweenAttacks = bufferTimeBetweenAttacks;

        this.port = this.uniquePort();

        this.idealServerInfo = toIdealServer(ns, targetServerName);
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
        this.initialPrimeTime();

        reportOnServer(this.ns, this.targetServerName);
        const host = this.ns.getHostname();
        const availableMemory = this.ns.getServerMaxRam(host) - this.ns.getServerUsedRam(host);

        const adjustThreadsForMemory = (action: ActionInfo) => {
            if (action.memory > availableMemory) {
                const availableThreads = Math.floor(availableMemory / action.memoryPerThread);
                this.ns.print(`Insufficient memory for action, so only using ${availableThreads} threads not ${action.threads} threads`);
                action.threads = availableThreads;
            }
        };

        const securityToReduce = this.ns.getServerSecurityLevel(this.targetServerName) - this.ns.getServerMinSecurityLevel(this.targetServerName);
        const firstWeakenInfo = this.weakenInfo( securityToReduce );
        if (firstWeakenInfo.threads>0) {
            adjustThreadsForMemory(firstWeakenInfo);
            while (firstWeakenInfo.threads>0 && this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)+0.01) {
                await this.launchWeaken(firstWeakenInfo.threads, firstWeakenInfo.time, 0, "prime_weaken1", this.port);
                await this.ns.nextPortWrite(this.port);
            }
        }

        const availableGrowth = this.ns.getServerMaxMoney(this.targetServerName) / this.ns.getServerMoneyAvailable(this.targetServerName);
        const growthInfo = this.growInfo(availableGrowth);
        if (growthInfo.threads>0 && availableGrowth!=1) {
            adjustThreadsForMemory(growthInfo);
            while (this.ns.getServerMoneyAvailable(this.targetServerName) < this.ns.getServerMaxMoney(this.targetServerName) * 0.999) {
                await this.launchGrow(growthInfo.threads, growthInfo.time, 0, "prime_grow", this.port);
                await this.ns.nextPortWrite(this.port);
            }
        }

        const secondWeakenInfo = this.weakenInfo( growthInfo.securityGrowth);
        if (secondWeakenInfo.threads>0 && availableGrowth!=1) {
            adjustThreadsForMemory(secondWeakenInfo);
            while (this.ns.getServerSecurityLevel(this.targetServerName) > this.ns.getServerMinSecurityLevel(this.targetServerName)+0.01) {
                await this.launchWeaken(secondWeakenInfo.threads, secondWeakenInfo.time, 0, "prime_weaken2", this.port);
                await this.ns.nextPortWrite(this.port);
            }
        }
        log(this.ns, "Priming completed for "+this.targetServerName);
        reportOnServer(this.ns, this.targetServerName);
    }

    // -------

    async launchAttackCycle(i: number): Promise<AttackInfo> {
        const cycle = this.infoPerCycle();

        const timeTaken = cycle.time;
        const batchEndTime = new Date().getTime() + timeTaken;

        log(this.ns, fmt(this.ns)`Launching attack (batch ${i}) on ${this.targetServerName} - to take ${timeTaken}s`);

        const delay = this.bufferTimeWithinAttack;
        const atLeastOne = (t: number) => isNaN(t) ? 1 : Math.max(t, 1);

        await this.launchHack(atLeastOne(cycle.hackInfo.threads), cycle.hackInfo.time, batchEndTime + (delay * 0), `${i}_h`);
        await this.launchWeaken(atLeastOne(cycle.firstWeakenInfo.threads), cycle.firstWeakenInfo.time, batchEndTime + (delay * 1), `${i}_w1`);
        await this.launchGrow(atLeastOne(cycle.growthInfo.threads), cycle.growthInfo.time, batchEndTime + (delay * 2), `${i}_g`);
        await this.launchWeaken(atLeastOne(cycle.secondWeakenInfo.threads), cycle.secondWeakenInfo.time, batchEndTime + (delay * 3), `${i}_w2`, this.port);

        return { time: timeTaken + (delay*3) };
    }


    // -------

    async launchHack(threads: number, timeForAction: number, endTime: number, batchId: string, port = 0) {
        await this.launchScript("hack", threads, timeForAction, endTime, batchId, port);
    }

    async launchWeaken(threads: number, timeForAction: number, endTime: number, batchId: string, port = 0) {
        await this.launchScript("weaken", threads, timeForAction, endTime, batchId, port);
    }

    async launchGrow(threads: number, timeForAction: number, endTime: number, batchId: string, port = 0) {
        await this.launchScript("grow", threads, timeForAction, endTime, batchId, port);
    }

    async launchScript(type: "hack" | "weaken" | "grow", threads: number, timeForAction: number, endTime: number, batchId: string, port: number) {
        if (threads === 0) return;

        const doAttackArgs: DoAttackParams = {
            target: this.targetServerName, expectedEndTime: endTime, timeForAction: timeForAction, portToUse: port, batchId: batchId
        };

        // this.ns.print(`Launching ${type} with ${threads} threads, to take ${timeForAction.toFixed(2)}`);
        this.ns.exec(`${baseDir}${type}.js`, this.sourceHostName, threads, ...Object.values(doAttackArgs));
    }

    // -------

    timingInfo(): TimingInfo {
        const cycle = this.infoPerCycle();

        const minPauseBetweenAttacks = (this.bufferTimeBetweenAttacks+this.bufferTimeWithinAttack*3);
        const timingConstrainedSimultaneousAttacks = Math.floor(cycle.timeIncludingBuffer / minPauseBetweenAttacks);
        const memoryConstrainedSimultaneousAttacks = Math.floor(this.sourceServerRam / cycle.memory);
        const simultaneousAttacks = Math.max(Math.min( memoryConstrainedSimultaneousAttacks, timingConstrainedSimultaneousAttacks),1);
        const pauseBetweenAttacks = Math.max(Math.ceil(cycle.timeIncludingBuffer / simultaneousAttacks), minPauseBetweenAttacks);

        log(this.ns, fmt(this.ns)`Total time is ${cycle.time}s and min pause is ${minPauseBetweenAttacks}s giving timing constrained max attacks of ${timingConstrainedSimultaneousAttacks}`);
        log(this.ns, fmt(this.ns)`Available RAM is ${this.sourceServerRam}GB and totalMemory is ${cycle.memory}GB giving memory constrained max of ${memoryConstrainedSimultaneousAttacks}`);
        log(this.ns, fmt(this.ns)`Simultaneous attacks is min of those: ${simultaneousAttacks}`);
        log(this.ns, fmt(this.ns)`Pause between attacks is max of time/attacks i.e. ${Math.ceil(cycle.time / simultaneousAttacks)} and min pause of ${minPauseBetweenAttacks} hence ${pauseBetweenAttacks}`);
        return { simultaneousAttacks: simultaneousAttacks, pauseBetweenAttacks: pauseBetweenAttacks, maximumSimultaneousAttacks: memoryConstrainedSimultaneousAttacks };
    }

    infoPerCycle(): CycleInfo {
        const hackInfo = this.hackInfo();
        const firstWeakenInfo = this.weakenInfo(hackInfo.securityGrowth);
        const growthInfo = this.growInfo((1/(1-hackInfo.hackAmount!)));
        const secondWeakenInfo = this.weakenInfo(growthInfo.securityGrowth);

        const totalMemory = hackInfo.memory + firstWeakenInfo.memory + growthInfo.memory + secondWeakenInfo.memory;
        const totalTime = Math.max(hackInfo.time, growthInfo.time, firstWeakenInfo.time, secondWeakenInfo.time);
        const timeIncludingBuffer = totalTime + this.bufferTimeBetweenAttacks + this.bufferTimeWithinAttack * 3;
        return { time: totalTime, timeIncludingBuffer: timeIncludingBuffer, memory: totalMemory, hackInfo: hackInfo, firstWeakenInfo: firstWeakenInfo, growthInfo: growthInfo, secondWeakenInfo: secondWeakenInfo };
    }

    hackInfo(): ActionInfo {
        const player = this.ns.getPlayer();
        const server = this.idealServerInfo;
        const hackTime = this.hf.hackTime(server, player);

        const hackPerThread = this.hf.hackPercent(server, player);
        const hackThreads = Math.max(Math.floor(this.moneyToTakePercentage / hackPerThread), 1);
        // At high hack levels, granularity of threads means that we will end up taking less than 50% of the money
        // (or using Math.ceil would take more than 50%, or the rounding up to 1 will take more than 50%)
        const hackAmount = hackThreads * hackPerThread;

        const memoryPerThread = this.ns.getScriptRam(baseDir+"hack.js");
        const hackMemory = hackThreads * memoryPerThread;
        const securityGrowth = this.ns.hackAnalyzeSecurity( hackThreads );

        return { threads: hackThreads, time: hackTime, securityGrowth: securityGrowth, memory: hackMemory, memoryPerThread: memoryPerThread, hackAmount: hackAmount };
    }

    growInfo(growAmount = (1/(1-this.moneyToTakePercentage))): ActionInfo {
        const growth = growAmount;
        const player = this.ns.getPlayer();

        const server = this.idealServerInfo;
        const growthTime = this.hf.growTime(server, player)
        const growthThreads = Math.ceil(this.growThreads(server, growth, player)) + 2;

        const memoryPerThread = this.ns.getScriptRam(baseDir+"grow.js");
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

    weakenInfo(amountToReduce: number): ActionInfo {
        const security = amountToReduce;
        const player = this.ns.getPlayer();
        const server = this.idealServerInfo;
        const weakenTime = this.hf.weakenTime(server, player);

        const coreBonus = 1 + (this.sourceServerCores - 1) / 16;
        const weakenPerThread = 0.05 * coreBonus * this.ns.getBitNodeMultipliers().ServerWeakenRate;
        const weakenThreads = Math.ceil(security / weakenPerThread);

        const memoryPerThread = this.ns.getScriptRam(baseDir+"weaken.js");
        const weakenMemory = weakenThreads * memoryPerThread;

        return { threads: weakenThreads, time: weakenTime, securityGrowth: (-1 * security), memory: weakenMemory, memoryPerThread: memoryPerThread };
    }

    // -------

    /** Reasonably likely to be a unique port value for the attack between 10,000 and 100,000,000, based on source and target */
    uniquePort(): number {
        const sourceAndTarget = this.sourceHostName+this.targetServerName;
        let hash = 0;
        for (let i = 0; i < sourceAndTarget.length; i++) {
            hash = ((hash << 5) - hash) + sourceAndTarget.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash) % 99_990_000 + 10_000;
    }

    getPort(): number { return this.port; }

}

export type AttackInfo = { time: number };
export type TimingInfo = { simultaneousAttacks: number, pauseBetweenAttacks: number, maximumSimultaneousAttacks: number };
export type CycleInfo = { time: number, timeIncludingBuffer: number, memory: number, hackInfo: ActionInfo, firstWeakenInfo: ActionInfo, growthInfo: ActionInfo, secondWeakenInfo: ActionInfo };
export type ActionInfo = { threads: number, time: number, securityGrowth: number, memory: number, memoryPerThread: number, hackAmount?: number };
