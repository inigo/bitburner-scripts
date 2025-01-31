// noinspection DuplicatedCode

import {NS, Server} from '@ns'
import {fmt} from "@/libFormat";
import * as ports from "@/libPorts";

export const baseDir = "/attack2/";




// ------


export function toIdealServer(ns: NS, serverName: string): Server {
    const serverInfo = ns.getServer(serverName);
    return { ... serverInfo, hackDifficulty: serverInfo.minDifficulty, moneyAvailable: serverInfo.moneyMax };
}

export function reportOnServer(ns: NS, s: string): void {
    const security = ns.getServerSecurityLevel(s);
    const minSecurity = ns.getServerMinSecurityLevel(s);
    const presentMoney = ns.getServerMoneyAvailable(s);
    const maxMoney = ns.getServerMaxMoney(s);
    log(ns, fmt(ns)`For ${s}, security level is ${security} (min is ${minSecurity}) and money is £${presentMoney} of £${maxMoney}`);
}

export function runningAttacks(ns: NS, target: string): number {
    const scripts = ns.ps()
        .filter(p => /attack(.*)\/(grow|weaken|hack)/.test(p.filename))
        .filter(p => p.args.includes(target) );

    const growScripts = scripts.filter(p => /grow/.test(p.filename) );
    const hackScripts = scripts.filter(p => /hack/.test(p.filename));
    const weaken1Scripts = scripts.filter(p => /weaken/.test(p.filename) && p.args.some(s => s.toString().endsWith("w1")) );
    const weaken2Scripts = scripts.filter(p => /weaken/.test(p.filename) && p.args.some(s => s.toString().endsWith("w2")) );
    return Math.max(growScripts.length, hackScripts.length, weaken1Scripts.length, weaken2Scripts.length);
}

export function filesNeededForAttack(): string[] {
    return [
        "/attack2/attack.js"
        , "/attack2/listTargets.js"
        , "/attack2/grow.js"
        , "/attack2/weaken.js"
        , "/attack2/hack.js"
        , "/attack2/libAttack.js"
        , "/attack2/libController.js"
        , "/attack2/libTargets.js"
        , "libPorts.js"
        , "libFormat.js"
        , "libServers.js"
    ]
}

/**
 * Process control.
 */
export function killMatchingScripts(ns: NS, host: string, filenames: string[], target: string): number {
    const matchesTargetFn = (args: string[]) => (target=="all") ? true : args.includes(target);
    return ns.ps(host).filter(p => filenames.includes(p.filename))
        .filter(p => matchesTargetFn(p.args.map(arg => String(arg))))
        .map(p => ns.kill(p.pid)).length;
}

export async function reportAttackStatus(ns: NS): Promise<void> {
    const filename = "attack/attack.js";
    const listAttackTargets = (s: string) => ns.ps(s).filter(j => j.filename==filename).map(j => j.args[0]);

    const potentialAttackers = ["home", ... ns.getPurchasedServers()];
    const targets: AttackScriptStatus[] = potentialAttackers.flatMap(s => listAttackTargets(s).filter(s => s).map(t => [s, t]))
        .map(st => {
            const [source, target] = st.map(String);
            const income = ns.getScriptIncome(filename, source, target );
            return { source, target, income };
        });
    await ports.setPortValue(ns, ports.ATTACK_REPORTS_PORT, JSON.stringify(targets));
}

export function retrieveAttackStatus(ns: NS): AttackScriptStatus[] {
    return (ports.checkPort(ns, ports.ATTACK_REPORTS_PORT, JSON.parse) as AttackScriptStatus[]) ?? [];
}

type AttackScriptStatus = { source: string, target: string, income: number };

// ------

export type DoAttackParams = { target: string, expectedEndTime: number, timeForAction: number, portToUse: number, batchId: string }

export async function doAttack(ns: NS, filename: string, attackFn: ((serverName: string, additionalMsec: number) => Promise<number>)): Promise<void> {
    const [target, expectedEndTime, timeForAction, portToUse, batchId] = ns.args as [string, number, number, number, string];

    let calculatedDelay: number = expectedEndTime==0 ? 0 :  (expectedEndTime - new Date().getTime()) - timeForAction;
    if (calculatedDelay<0) {
        ns.toast("Cannot achieve required end time - would need an extra "+calculatedDelay+" milliseconds");
        calculatedDelay = 0;
    }
    const beforeAction = new Date().getTime();
    await attackFn(target, calculatedDelay);

    if (shouldLog()) {
        const afterAction = new Date().getTime();
        const timeTakenForAction = Math.ceil(afterAction - beforeAction);

        const actualEndTime = new Date().getTime();
        const timeDiff = Math.ceil(actualEndTime - expectedEndTime);

        const logMessage = `Batch ${batchId} - ${filename} completed with time diff of ${timeDiff} after delay of ${calculatedDelay.toFixed(1)} - action took ${ns.tFormat(timeTakenForAction, true)} not ${ns.tFormat(timeForAction+calculatedDelay, true)}`;
        log(ns, logMessage);
    }
    if (portToUse!=0) {
        ns.writePort(portToUse, batchId);
    }
}

/** Check whether this particular server should do logging */
export function shouldLog(): boolean {
    return false;
}

export function log(ns: NS, message: string): void {
    ns.print(message);
    if (shouldLog()) {
        ns.tprint(message);
    }
}