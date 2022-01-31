import { NS } from '@ns';

/** Repeatedly do a crime */
export async function loopCrime(ns: NS, crime: string): Promise<void> {
	let startTime = new Date().getTime();
	ns.commitCrime(crime);
	let notYetCancelled = true;
	while(notYetCancelled) {

		if (!ns.isBusy()) {
			const endTime = new Date().getTime();
			const timeTaken = endTime - startTime;
			if (timeTaken<500) {
				ns.tprint("Crime completed very quickly... probably cancelled. Ending loop.");
				notYetCancelled = false;
			} else  {
				startTime = new Date().getTime();
				ns.commitCrime(crime);
			}
		
		}
		await ns.sleep(100);
	}
}

export function findMostLucrativeCrime(ns: NS, crimes: string[]): string {
	const incomeRateFn = (c: string) => {
		const stats = ns.getCrimeStats(c);
		return stats.money / stats.time;
	}
	const lucrativeCrimes = crimes.sort((a, b) => incomeRateFn(a) - incomeRateFn(b)).reverse();
	return lucrativeCrimes[0];
}

export function listPlausibleCrimes(ns: NS): string[] {
	return listCrimes().filter(c => ns.getCrimeChance(c) > 0.9);
}

export function listCrimes(): string[] {
	return ["Shoplift",
			"Rob Store", 
			"Mug", 
			"Larceny",
			"Deal Drugs",
			"Bond Forgery",
			"Traffick Arms",
			"Homicide",
			"Grand Theft Auto",
			"Kidnap",
			"Assassination",
			"Heist"];
}