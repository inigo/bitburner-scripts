import { setGangInstructions } from "@/crime/libGang";
import { NS } from '@ns';

/// Set the objective of the gang - this doesn't force individuals to do one thing, because there are overrides like "not enough money", but it will influence their tasks

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return ["money", "territory", "respect", "general", "training"];
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	const goal = (ns.args[0] as string) ?? "general";
	const stage = (ns.args[1] as string) ?? "early";
	const instructions = { goal: goal, stage: stage };
	await setGangInstructions(ns, instructions);
}