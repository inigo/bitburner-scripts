import { checkReportedFragments } from "stanek/libFragment";

/// Reset all the current fragments in Stanek's Gift - e.g. after a RAM increase

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	const allFrags = checkReportedFragments(ns);
	ns.stanek.clearGift();
	allFrags.forEach(f => ns.stanek.placeFragment(f.x, f.y, f.rotation, f.id) );
}