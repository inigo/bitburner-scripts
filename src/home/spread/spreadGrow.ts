import { growLoop }  from "/spread/libSpread";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	await growLoop(ns);
}
