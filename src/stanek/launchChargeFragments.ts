import { NS } from '@ns';
import { reportFragments, addFragmentInfo, CombinedFragment, toFilename } from "stanek/libFragment";
import { loadFragments } from "stanek/loadFragments";

export async function main(ns: NS): Promise<void> {
	const maxIterations = ns.args.find(arg => Number.isInteger(arg)) ?? 100;

	const hasStanek = ns.getOwnedAugmentations().includes("Stanek's Gift - Genesis");
	if (!hasStanek) {
		ns.print("Does not have Stanek's Gift - nothing to do")
		return;
	}

	if (ns.stanek.activeFragments().length==0) {
		loadFragments(ns, toFilename(ns, "hacking"));
	}

	const ramPerThread = ns.getScriptRam("/stanek/chargeFragments.js");
	const totalRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");

	const fragCharges = ns.stanek.activeFragments()
					.map(f => addFragmentInfo(f as CombinedFragment))
					.filter(f => f.name!="boost")
					.map(f => f.numCharge);
	const minFragCharge = Math.min(... fragCharges);

	if (fragCharges.length==0) {
		ns.print("No fragments available, so nothing to do");
	} if (minFragCharge >= maxIterations) {
		ns.print("Fragments already charged to or above "+maxIterations+" - nothing to do");
	} else {
		ns.tprint("Charging Stanek fragments by "+maxIterations);
		const preciseThreads = totalRam / ramPerThread;
		await reportFragments(ns);	
		ns.run("/stanek/chargeFragments.js", preciseThreads, ... ns.args);	
	}

}