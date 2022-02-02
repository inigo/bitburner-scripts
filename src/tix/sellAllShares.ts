import { sellAllShares } from "tix/libTix"; 
import * as ports from "libPorts";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	await ports.setPortValue(ns, ports.SHARE_VALUE_PORT, 0);
	await ports.setPortValue(ns, ports.PAUSE_SHARE_TRADING, 60);
	sellAllShares(ns);
}