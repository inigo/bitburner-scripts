import { NS } from '@ns';

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