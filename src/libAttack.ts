import { NS } from '@ns';


export async function doAttack(ns: NS, filename: string, attackFn: ((serverName: string) => Promise<void>)): Promise<void> {
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

const LOGGING_PORT = 2;

/** Set whether logging is enabled for a particular server. */
export async function setLogging(ns: NS, logStatus: string): Promise<void> {
	ns.clearPort(LOGGING_PORT);
	await ns.writePort(LOGGING_PORT, logStatus);
}
 
/** Check whether this particular server should do logging */
export function shouldLog(ns: NS): boolean {
	const cmdString = ns.peek(LOGGING_PORT);
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
export function killMatchingScripts(ns: NS, host: string, filenames: string[], target: string): void {
	const matchesTargetFn = (args: string[]) => (target=="all") ? true : args.includes(target);
	return ns.ps(host).filter(p => filenames.includes(p.filename))
            .filter(p => matchesTargetFn(p.args))
            .forEach(p => ns.kill(p.pid));
}