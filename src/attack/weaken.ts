import { doAttack } from "@/attack/libAttack";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await doAttack(ns, "Weaken", async (t: string, additionalMsec: number) => ns.weaken(t, { "stock" : false, "additionalMsec": additionalMsec }) );
}
