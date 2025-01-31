import { doAttack } from "@/attack2/libAttack";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await doAttack(ns, "Hack", async (t: string, additionalMsec: number) => ns.hack(t, { "stock" : false, "additionalMsec": additionalMsec }) );
}