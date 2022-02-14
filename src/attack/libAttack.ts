import { NS, Server } from '@ns';
import * as ports from "libPorts.js";
import { fmt } from "libFormat";

export async function doAttack(ns: NS, filename: string, attackFn: ((serverName: string) => Promise<number>)): Promise<void> {
    const target = (ns.args[0] as string);
    const expectedEndTime: number = (ns.args[1] as number);
    const timeForAction: number = (ns.args[2] as number);
    const batchId: string = (ns.args[3] as string);

    const calculatedDelay: number = (expectedEndTime - new Date().getTime()) - timeForAction;
    if (calculatedDelay > 0) {
        await ns.sleep(calculatedDelay);        
    }
    
    const beforeAction = new Date().getTime();
    await attackFn(target);
    const afterAction = new Date().getTime();
    const timeTakenForAction = Math.ceil(afterAction - beforeAction);
    
    const actualEndTime = new Date().getTime();
    const timeDiff = Math.ceil(actualEndTime - expectedEndTime);

    const logMessage = `Batch ${batchId} - ${filename} completed with time diff of ${timeDiff} - action took ${ns.tFormat(timeTakenForAction, true)} not ${ns.tFormat(timeForAction, true)}`;
    if (shouldLog(ns)) { 
        ns.tprint(logMessage);
    }
}

/**
 * Comms functions to send and receive targets to the nodes.
 */

/** Set whether logging is enabled for a particular server. */
export async function setLogging(ns: NS, logStatus: string): Promise<void> {
    await ports.setPortValue(ns, ports.LOGGING_PORT, logStatus);
}
 
/** Check whether this particular server should do logging */
export function shouldLog(ns: NS): boolean {
	const cmdString = ports.checkPort(ns, ports.LOGGING_PORT);
    return cmdString=="all" || (ns.getHostname()==cmdString);
}

export function log(ns: NS, message: string): void {
    ns.print(message);
    if (shouldLog(ns)) {
        ns.tprint(message);
    }
}

/** 
 * Process control.
 */
export function killMatchingScripts(ns: NS, host: string, filenames: string[], target: string): number {
	const matchesTargetFn = (args: string[]) => (target=="all") ? true : args.includes(target);
	return ns.ps(host).filter(p => filenames.includes(p.filename))
            .filter(p => matchesTargetFn(p.args))
            .map(p => ns.kill(p.pid)).length;
}

/*
 * Other utilities 
 */


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
	const scripts = ns.ps();
	const growScripts = scripts.filter(p => p.filename=="/attack/grow.js" && p.args.includes(target));
	const hackScripts = scripts.filter(p => p.filename=="/attack/hack.js" && p.args.includes(target));
	const weaken1Scripts = scripts.filter(p => p.filename=="/attack/weaken.js" && p.args.includes(target) && p.args.includes("weaken1") );
	const weaken2Scripts = scripts.filter(p => p.filename=="/attack/weaken.js" && p.args.includes(target) && p.args.includes("weaken2") );
	return Math.max(growScripts.length, hackScripts.length, weaken1Scripts.length, weaken2Scripts.length);
}

export function filesNeededForAttack(): string[] {
    return [
        "/attack/attack.js"
        , "/attack/listTargets.js"
        , "/attack/grow.js"
        , "/attack/weaken.js"
        , "/attack/hack.js"
        , "/attack/libAttack.js"
        , "/attack/libController.js"
        , "/attack/libTargets.js"
        , "/libPorts.js"
        , "/libFormat.js"
        , "/libServers.js"
    ]
}