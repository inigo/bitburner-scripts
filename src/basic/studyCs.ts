import {LocationName, NS, StudyTask, UniversityClassType} from '@ns'

/**
 * Study CS at the university to improve hacking skill, if Singularity functions are available
 */
export async function main(ns : NS) : Promise<void> {
	try {
		while (ns.getHackingLevel() < 10) {
			const studyTask: StudyTask | null = ns.singularity.getCurrentWork()?.type == "CLASS" ? ns.singularity.getCurrentWork() as StudyTask : null;
			if (studyTask?.classType != UniversityClassType.computerScience || studyTask?.location != LocationName.Sector12RothmanUniversity) {
				ns.singularity.universityCourse("Rothman University", UniversityClassType.computerScience);
			}
			await ns.sleep(2000);
		}
	} catch(error) {
		ns.tprint("No Singularity - manually go to university");
	}
}
