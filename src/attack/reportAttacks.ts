import { NS } from '@ns'
import { reportAttackStatus } from '/attack/libAttack.js'

export async function main(ns : NS) : Promise<void> {
    await reportAttackStatus(ns);
}