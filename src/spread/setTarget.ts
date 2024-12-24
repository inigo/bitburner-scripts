import { sendAttackTarget } from "@/spread/libSpread";
import { NS } from '@ns'

/// Change the target of servers launched by spreadAttackController

export async function main(ns : NS) : Promise<void> {
	const target = (ns.args[0] as string);
	await sendAttackTarget(ns, target);
}

export function autocomplete(data : AutocompleteData): string[] {
    return [...data.servers];
}