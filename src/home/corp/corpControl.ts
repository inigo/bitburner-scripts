/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { setCorporationInstructions, CorporationInstructions } from "/corp/libCorporation";

//! Set instructions for the corporation control script

export function autocomplete(): string[] {
    return ["prepareForInvestment", "clear"];
}

export async function main(ns: NS): Promise<void> {
	const goal = (ns.args[0] as string) ?? null;
	const shouldPrepareForInvestment = (goal=="prepareForInvestment");

	const instructions: CorporationInstructions = { prepareForInvestment: shouldPrepareForInvestment };
	await setCorporationInstructions(ns, instructions);
}
