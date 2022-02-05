import { checkReportedFragments } from "stanek/libFragment";
import { fmt } from "/libFormat.js";
import { NS } from '@ns';

/// Charge all the active fragments - run with a large number of threads. Needs reportFragments to have been run first 

export async function main(ns: NS): Promise<void> {
	const repOnly = ns.args[0] == "reputation";
	let hasWarned = false;
	while (true) {
		const allFrags = checkReportedFragments(ns);
		const fragsToBoost = allFrags.filter(f => repOnly ? f.name=="boost" : f.name!="boost");
		if (fragsToBoost.length==0) { 
			if (!hasWarned) {
				ns.tprint("WARN No fragments found in Stanek's Gift - may need to run reportFragments?")
				hasWarned = true;
			}
			await ns.sleep(1000); 
		}
		for (const f of fragsToBoost) {
			try {
				await ns.stanek.charge(f.x, f.y);
			} catch (e) {
				ns.print(fmt(ns)`Could not charge fragment ${f} - probably removed`);
			}
		}
		await ns.sleep(1);
	}
}