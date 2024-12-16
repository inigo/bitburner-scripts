import { doAttack } from "/attack/libAttack";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await doAttack(ns, "Hack", async (t) => ns.hack(t, { "stock" : false }) );
}
