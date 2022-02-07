/// Continually commit a crime
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	const crime = (ns.args[0] as string) ?? "Homicide";
	await loopCrime(ns, crime);
}

/** Repeatedly do a crime */
async function loopCrime(ns: NS, crime: string): Promise<void> {
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