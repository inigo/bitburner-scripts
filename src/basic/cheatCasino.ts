import { NS } from '@ns'

/**
 * Cheat money from the casino until there's enough to buy 512GB of memory, and cash to buy programs.
 */
export async function main(ns : NS) : Promise<void> {
    ns.run("/sleeve/sleeveControl.js", 1, "crime");

    await acquireMoneyToTravel(ns);

    ns.run("/casino/coinFlip.js");
    while (ns.getServerMaxRam("home") < 512) {
        ns.singularity.upgradeHomeRam();
        while (anyScriptRunning(ns, "/casino/coinFlip.js")) {
            await ns.sleep(1000);
        }	
        ns.run("/casino/coinFlip.js");
    }

    ns.run("/sleeve/sleeveControl.js", 1, "clear");
}

async function acquireMoneyToTravel(ns: NS):Promise<void>  {
    const money = () => ns.getServerMoneyAvailable("home");

    if (money() < 200_000) {
        // Wait briefly in case we get enough money to travel e.g. via sleeves or a gang
        await ns.sleep(2000);
        while (money() < 200_000) {
            const time = ns.singularity.commitCrime("Mug");
            await ns.sleep(time);
            while (ns.singularity.isBusy()) {
                await ns.sleep(100);
            }
        }            
    }
}

function anyScriptRunning(ns: NS, filename: string): boolean {
	return ns.ps().some(p => p.filename == filename);
}