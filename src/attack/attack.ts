import {NS} from '@ns'
import {log, reportOnServer, runningAttacks} from "@/attack/libAttack";
import {AttackController} from "@/attack/libController";
import {fmt} from "@/libFormat";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers];
}

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const target: string = ns.args[0] as string;
    return await manageAttacks(ns, target);
}


export async function manageAttacks(ns: NS, hackTarget: string): Promise<void> {
    if (hackTarget==null) {
        ns.tprint("ERROR no hack target provided");
        ns.exit();
    }

    const host = ns.getHostname();
    // When running on home, reserve some memory for other scripts and utilities
    const spareRamBuffer = (host=="home") ? 100 : 0;
    const availableRam = ns.getServerMaxRam(host) - spareRamBuffer;

    const bufferTimeWithinAttack = 60; // Works on fast computer 30;
    const bufferTimeBetweenAttacks = 90; // Works on fast computer 50;

    while (true) {
        killAttacks(ns, hackTarget);
        ns.toast(`Priming ${host} for attack on ${hackTarget}`, "info");

        const cores = ns.getServer(host).cpuCores;

        const primingController = new AttackController(ns, hackTarget, availableRam, cores, bufferTimeWithinAttack, bufferTimeBetweenAttacks);
        await primingController.primeServer();

        const attackController = new AttackController(ns, hackTarget, availableRam, cores, bufferTimeWithinAttack, bufferTimeBetweenAttacks);
        const timing = attackController.timingInfo();

        ns.toast(fmt(ns)`Launching ${timing.simultaneousAttacks} simultaneous attacks on ${hackTarget} from ${host} with a pause of ${timing.pauseBetweenAttacks}s between each`, "info");

        let attacksSoFar = 0;
        let potentiallyUnbalanced = 0;

        const maxMoney = ns.getServerMaxMoney(hackTarget);
        const minSecurity = ns.getServerMinSecurityLevel(hackTarget);
        const hostMaxRam = ns.getServerMaxRam(host);
        while (true) {
            if (runningAttacks(ns, hackTarget) < timing.simultaneousAttacks) {
                await attackController.launchAttackCycle(attacksSoFar++);
                await ns.sleep(timing.pauseBetweenAttacks);
            } else {
                ns.print("Waiting for port write");
                await ns.nextPortWrite(attackController.getPort());
            }

            reportOnServer(ns, hackTarget);

            // Check for unbalanced here
            if  ((ns.getServerMoneyAvailable(hackTarget) < (ns.getServerMaxMoney(hackTarget) / 4)) ||
                (ns.getServerSecurityLevel(hackTarget) > (ns.getServerBaseSecurityLevel(hackTarget) * 2))) {
                log(ns, "INFO Insufficient money or too much security server - either unbalanced, or other scripts running");
                potentiallyUnbalanced++;
            } else {
                potentiallyUnbalanced = 0;
            }

            const rebalanceThreshold = 10;
            if (potentiallyUnbalanced > rebalanceThreshold) {
                log(ns, `WARN Server ${hackTarget} still unbalanced - rebalancing`);
                ns.tprint(`Server ${hackTarget} unbalanced - rebalancing`);
                break;
            }

            if ((ns.getServerMaxMoney(hackTarget)!=maxMoney) || (ns.getServerMinSecurityLevel(hackTarget)!=minSecurity)) {
                log(ns, `INFO server ${hackTarget} stats have changed - probably due to hashes - rebalancing`);
                break;
            }

            if ((ns.getServerMaxRam(host)!=hostMaxRam)) {
                log(ns, "INFO host max memory has changed due to server upgrade - rebalancing");
                break;
            }
        }
        restartControlNotRunning(ns);
    }

}


function restartControlNotRunning(ns: NS) {
    const controlScriptRunning = (ns.ps("home").some(p => p.filename==="launchAll.js" || p.filename==="bootstrap.js"));
    if (!controlScriptRunning) {
        ns.exec("/bootstrap.js", "home", 1);
    }
}


function killAttacks(ns: NS, target: string): void {
    const host = ns.getHostname();
    const scriptsToKill = ns.ps(host)
        .filter(p => /attack(.*)\/(grow|weaken|hack).*$/.test(p.filename))
        .filter(p => p.args.includes(target) );
    scriptsToKill.forEach(p => ns.kill(p.filename, host, ... p.args) );
}
