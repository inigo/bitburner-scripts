import { sellAllShares, reportShareStatus, pauseTrading } from "@/tix/libTix"; 
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	await pauseTrading(ns, 120);
	sellAllShares(ns);
	await reportShareStatus(ns);
}