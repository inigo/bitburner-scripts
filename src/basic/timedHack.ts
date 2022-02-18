import { NS } from '@ns'

/**
 * Run a hack cycle (weaken, grow, hack) against a specified server, stopping after a period. 
 * Args are target, maxMoney, minSecurity, and optional "stopAfterDelay" 
 */
export async function main(ns : NS) : Promise<void> {
	const target = ns.args[0] as string;
    const maxMoney = ns.args[1] as number;
    const minSecurity = ns.args[2] as number;

	const stopAfterDelay = ns.args.includes("stopAfterDelay");

	const startTime = new Date().getTime()

    while(true) {
        await doHackCycle(ns, target, maxMoney, minSecurity);

		if (stopAfterDelay) {
			const currentTime = new Date().getTime();
			const timeElapsed = currentTime - startTime;
			if (timeElapsed> 1 * 60 * 1000) break;
		}
    }
	ns.print("Stopping hack script");
}

async function doHackCycle(ns: NS, target: string, maxMoney: number, minSecurity: number) {	
    const moneyThresh = maxMoney * 0.6;
    const securityThresh = minSecurity + 5; 

	if (ns.getServerSecurityLevel(target) > securityThresh) {
		await ns.weaken(target);
	} 
	else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
		await ns.grow(target);
	} else {
		await ns.hack(target, { "stock" : true });
	}
}