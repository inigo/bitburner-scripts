import { reportSleeveTasks } from "@/sleeve/libSleeve";
import { NS } from '@ns'

/// Update the information in the dashboard about what each sleeve is working on 

export async function main(ns: NS): Promise<void> {
	await reportSleeveTasks(ns);
}