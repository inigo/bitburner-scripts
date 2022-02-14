import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	try {
		ns.upgradeHomeRam();
	} catch (error) {
		ns.print("Cannot upgrade RAM - no Singularity functions");
	}
}