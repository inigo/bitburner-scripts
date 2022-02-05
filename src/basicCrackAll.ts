/// Run cracking executables (e.g. BruteSSH) against all available servers

import { NS } from '@ns'
import {crackAll} from "libCrack"; 

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	ns.disableLog("getServerNumPortsRequired");
	crackAll(ns);
}