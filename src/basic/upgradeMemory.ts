import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	try {
		if (ns.upgradeHomeRam()) {
			if (ns.getServerMaxRam("home")<=8192) {
				// Kill running attacks, because we're likely to want to switch target at the beginning
				ns.run("/attack/killAttacks.js");
			}
		}
	} catch (error) {
		ns.print("Cannot upgrade RAM - no Singularity functions");
	}
}