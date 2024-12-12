import { checkReportedFragments } from "stanek/libFragment";
import { fmt } from "/libFormat.js";
import { NS } from '@ns';

/// Charge all the active fragments - run with a large number of threads. Needs reportFragments to have been run first 

export async function main(ns: NS): Promise<void> {
	const maxIterations: number = ns.args.find(arg => Number.isInteger(arg)) as number ?? Infinity;

	let hasWarned = false;
	let count = 0;
	while (count < maxIterations) {
		const allFrags = checkReportedFragments(ns);
		const fragsToBoost = allFrags.filter(f => f.name!="boost");
		if (fragsToBoost.length==0) { 
			if (!hasWarned) {
				// Don't do it automatically, because that would use valuable memory
				ns.tprint("WARN No fragments found in Stanek's Gift - may need to run reportFragments?")
				hasWarned = true;
			}
			await ns.sleep(1000); 
		}
		for (const f of fragsToBoost) {
			try {
				await ns.stanek.chargeFragment(f.x, f.y);
			} catch (e) {
				ns.print(fmt(ns)`Could not charge fragment ${f} - probably removed`);
			}
		}
		if (fragsToBoost.length > 0) { count++; }
		await ns.sleep(1);
	}
}