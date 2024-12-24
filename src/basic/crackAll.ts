/// Run cracking executables (e.g. BruteSSH) against all available servers

import { NS } from '@ns'
import { crackAll } from "@/basic/libCrack"; 

export async function main(ns: NS): Promise<void> {
	ns.disableLog("getServerNumPortsRequired");
	crackAll(ns);
}