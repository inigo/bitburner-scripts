import { NS } from '@ns'
import { receiveAttackTarget } from "spread/libSpread";
import { findAllHackableServers } from "libServers";
import { toIdealServer } from "attack/libAttack";
import { AttackController } from 'attack/libController';

export class TargetFinder {
    constructor(readonly ns: NS) {
    }

    listBestTargets(paybackPeriodInMinutes = 60, serverRam: number = this.ns.getServerMaxRam("home"), serverCores = 1, moneyToTakePercent = 0.5): TargetInfo[] {
        const targets = findAllHackableServers(this.ns);
        const attacks = [ ... this.listRunningAttacks(), receiveAttackTarget(this.ns)?.targetServer ];
        const player = this.ns.getPlayer();
        const targetDetails = targets.map(t => {
            const attack = new AttackController(this.ns, t, serverRam, serverCores, moneyToTakePercent);
            const timingInfo = attack.timingInfo();
            const memoryPerAttack = attack.infoPerCycle().memory;
            const maxMoney = this.ns.getServerMaxMoney(t);
            const bestMoneyPerAttack = Math.round(maxMoney * moneyToTakePercent);
    
            const chance = this.ns.formulas.hacking.hackChance(toIdealServer(this.ns, t), player);
            const actualMoneyPerAttack = bestMoneyPerAttack * chance;
    
            const attacksPerSecond = 1000 * timingInfo.simultaneousAttacks / attack.infoPerCycle().time;
            const incomePerSecond = actualMoneyPerAttack * attacksPerSecond;
    
            const totalMemory = (memoryPerAttack * timingInfo.simultaneousAttacks) + this.ns.getScriptRam("attack.js", "home") 
    
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
    
    listRunningAttacks(): string[] {
        const servers = [... this.ns.getPurchasedServers(), "home"];
        const attackedServers = servers.flatMap(s => this.ns.ps(s).filter(p => p.filename=="/attack/attack.js").map(p => p.args[0]) );
        const distinctTargets = [...new Set(attackedServers)];
        return distinctTargets;	
    }
    
}

export type TargetInfo = { name: string, incomeWithinPeriodPerSecond: number, incomePerSecond: number, 
                            maxMoney: number, totalMemory: number, time: number, threads: number, chance: number, 
                            initialPrimeTime: number, isAttacked: boolean };
