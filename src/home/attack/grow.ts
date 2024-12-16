import { doAttack } from "/attack/libAttack";
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await doAttack(ns, "Grow", async (t) => ns.grow(t, { "stock" : true }) );
}
