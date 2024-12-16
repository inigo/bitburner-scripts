import { reportGangInfo } from "/crime/libGang";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	if (ns.gang.inGang()) {
		await reportGangInfo(ns)
	}
}