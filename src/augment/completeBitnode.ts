import {NS} from '@ns'
import {manuallyConnectTo} from "@/basic/installBackdoors";
import {checkPort, DO_NOT_RESTART} from "@/libPorts";

/// Complete the bitnode (if the requirements have been met, and automatically start the next iteration of BN 12

export async function main(ns : NS) : Promise<void> {
    // Before the Red Pill is available, it's not possible to find world daemon, so the rest would fail
    const hasRedPill = ns.singularity.getOwnedAugmentations(false).includes("The Red Pill");
    ns.print("Don't have Red Pill, so cannot check world daemon")
    if (!hasRedPill) { return }

    const requiredHacking = ns.getBitNodeMultipliers().WorldDaemonDifficulty * 3000;
    const currentHacking = ns.getPlayer().skills.hacking;
    const enoughPortsOpen = ns.getServer("w0r1d_d43m0n").openPortCount == 5;

    if (hasRedPill && enoughPortsOpen && currentHacking >= requiredHacking) {
        const doNotRestart = checkPort(ns, DO_NOT_RESTART) !== null;
        if (doNotRestart) {
            ns.toast("Not hacking world daemon - do not restart is set")
            return;
        }

        ns.tprint("Hacking World Daemon!");
        ns.run("/reporting/logProgress.js", 1, "completeBitnode")
        await manuallyConnectTo(ns, "w0r1d_d43m0n");
        await ns.singularity.installBackdoor();

        // Gives some time for the "Bitnode completed" scroll to complete
        window.setTimeout(() => startNewNode(), 30_000);
    }
}

function startNewNode() {
    const doc = eval("document");
    // Click on the link for Bitnode 12
    doc.querySelector("button[aria-label*='BitNode-12']").click();
    // Press the Enter button
    doc.querySelector("button[aria-label*='enter']").click();
    // Bootstrap in the new Bitnode 
    window.setTimeout(() => runTerminalCommand("run bootstrap.js"), 2000);
}

export function runTerminalCommand(command: string): void {
    const doc = eval("document");
    const terminalInput = doc.getElementById("terminal-input");
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({ target: { value: command } });
    terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
}
