import {NS} from '@ns'
import {manuallyConnectTo} from "@/basic/installBackdoors";

/// Complete the bitnode (if the requirements have been met, and automatically start the next iteration of BN 12

export async function main(ns : NS) : Promise<void> {
    const requiredHacking = ns.getBitNodeMultipliers().WorldDaemonDifficulty * 3000;
    const currentHacking = ns.getPlayer().skills.hacking;
    const hasRedPill = ns.singularity.getOwnedAugmentations(true).includes("The Red Pill");
    const enoughPortsOpen = ns.getServer("w0r1d_d43m0n").openPortCount == 5;

    if (hasRedPill && enoughPortsOpen && currentHacking >= requiredHacking) {
        ns.run("/reporting/logProgress.js", 1, "completeBitnode")
        await manuallyConnectTo(ns, "w0r1d_d43m0n");
        await ns.singularity.installBackdoor();

        // Gives some time for the "Bitnode completed" scroll to complete
        window.setTimeout(() => startNewNode(), 12_000);        
    }
}

function startNewNode() {
    const doc = eval("document");
    // Click on the link for Bitnode 12
    doc.querySelector("button[aria-label*='BitNode-12']").click();
    // Press the Enter button
    doc.querySelector("button[aria-label*='enter']").click();
    // Bootstrap in the new Bitnode 
    window.setTimeout(() => runTerminalCommand("run bootstrap.js"), 1000);
}

export function runTerminalCommand(command: string): void {
    const doc = eval("document");
    const terminalInput = doc.getElementById("terminal-input");
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({ target: { value: command } });
    terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
}
