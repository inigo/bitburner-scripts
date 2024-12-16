import { NS } from '@ns';
import { buyWithShares } from "/tix/libShareSelling"; 
import { killAttacks } from '/attack/killAttacks.js';

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");

    if (isInCorporation(ns)) {
        const isScriptRunning = () => ns.ps("home").some(p => p.filename=="corp/manageStartup.js" || p.filename=="corp/manageCorp.js");
        if (isScriptRunning()) {
            ns.print("Already in corporation - nothing to do");
        } else {
            ns.print("In corporation but corp management script is not running");
            ns.run("/corp/manageStartup.js"); // This will fail if not a startup
            if (!isScriptRunning()) {
                ns.run("/corp/manageCorp.js"); // This will fail if a startup
            }
        }
        
        return;
    } 
    const selfFund = (ns.getResetInfo().currentNode!=3);
    const cost = selfFund ? 150_000_000_000 : 0;
    const corp = eval("ns.corporation");
    const started = await buyWithShares(ns, cost, () => corp.createCorporation("Bats Inc", selfFund));
    
    if (started) {
        ns.tprint("Starting corporation");
        const memoryNeeded = ns.getScriptRam("/corp/manageStartup.js");
        const maxRam = ns.getServerMaxRam("home");
        const memoryAvailable = maxRam - ns.getServerUsedRam("home");
        if (memoryAvailable >= memoryNeeded) {
            ns.run("/corp/manageStartup.js");
        } else if (maxRam < memoryNeeded * 1.5) {
            ns.print("Not enough RAM to run corp script, even if nothing was running");
        } else {
            ns.print("Killing running attacks, to get enough memory to launch corp script");
            await killAttacks(ns);
            await ns.sleep(500);
            ns.run("/corp/manageStartup.js");
        }
    } else {
        ns.print("Could not start corporation");
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isInCorporation(ns: NS): boolean {
    try {
        const corp = eval("ns.corporation");
        const corpExists = corp.getCorporation();
        return (corpExists!=null);
    } catch (err) {
        return false;
    }
}