import { doAttack } from "@/attack/libAttack";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await doAttack(ns, "Grow", async (t: string, additionalMsec: number) => ns.grow(t, { "stock" : true, "additionalMsec": additionalMsec }) );
}
