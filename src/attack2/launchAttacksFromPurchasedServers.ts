import { NS } from '@ns'
import { TargetFinder }  from "@/attack2/libTargets";
import { filesNeededForAttack } from "@/attack2/libAttack"

export async function main(ns : NS) : Promise<void> {
    const purchasedServersWithoutAttacks = ns.getPurchasedServers()
                    .filter(s => ! ns.scriptRunning("/attack2/attack.js", s))
                    .filter(s => ns.getServerUsedRam(s) < 128 );
    for (const server of purchasedServersWithoutAttacks) {
        await launchAttack(ns, server);
    }
}

export async function launchAttack(ns: NS, server: string): Promise<void> {
    const availableRam = ns.getServerMaxRam(server);
    const targetFinder = new TargetFinder(ns);
	const viableTargets = targetFinder.listBestTargets(30, availableRam, 1).filter(t => ! t.isAttacked);

    if (viableTargets.length==0) {
        ns.print(`No viable targets to attack from ${server}`);
        return;
    }

    const serverToAttack = viableTargets[0].name;
    ns.print(`Launching attack from ${server} on ${serverToAttack}`)
    await ns.scp(filesNeededForAttack(), server, "home");
	ns.exec("/attack2/attack.js", server, 1, serverToAttack);
}