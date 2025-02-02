import { NS } from '@ns'
import {listContracts} from "@/metacontracts/libContracts";

/// List all available contracts.
export async function main(ns : NS) : Promise<void> {
	const isVerbose = ns.args.includes("-v");
	[...listContracts(ns)]
		.forEach(c => ns.tprint(`${c.server} has '${c.filename}' of type '${c.contractType}'` 
									+ (isVerbose ? `:\n\n${c.data}` : "")));
}
