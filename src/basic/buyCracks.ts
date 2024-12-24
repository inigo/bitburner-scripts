/// Use the Tor router to buy all available crack files (e.g. BruteSSH.exe)

import { NS } from '@ns'
import {buyCracks, reportCrackStatus} from "@/basic/libCrack"; 

export async function main(ns: NS): Promise<void> {
	try {
		buyCracks(ns);
		await reportCrackStatus(ns);
	} catch (error) {
		ns.print("Could not buy cracks - need access to the Singularity API");
	}
	
}