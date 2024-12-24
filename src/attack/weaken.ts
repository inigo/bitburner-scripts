import { doAttack } from "@/attack/libAttack";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await doAttack(ns, "Weaken", async (t) => ns.weaken(t, { "stock" : false }) );
}
