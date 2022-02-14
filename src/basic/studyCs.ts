import { NS } from '@ns'

/**
 * Study CS at the university to improve hacking skill, if Singularity functions are available
 */
export async function main(ns : NS) : Promise<void> {
	try {
		while (ns.getHackingLevel() < 10) {
			const player = ns.getPlayer();
			if (player.workType != "Studying or Taking a class at university") {
				ns.universityCourse("Rothman University", "Study Computer Science");
			}
			await ns.sleep(2000);
		}
	} catch(error) {
		ns.tprint("No Singularity - manually go to university");
	}
}
