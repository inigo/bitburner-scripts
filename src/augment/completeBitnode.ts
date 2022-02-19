import { NS } from '@ns'
import { manuallyConnectTo } from "basic/installBackdoors"; 

export async function main(ns : NS) : Promise<void> {
    const requiredHacking = ns.getBitNodeMultipliers().WorldDaemonDifficulty * 3000;
    const currentHacking = ns.getPlayer().hacking;
    const hasRedPill = ns.getOwnedAugmentations(true).includes("The Red Pill");
    const enoughPortsOpen = ns.getServer("w0r1d_d43m0n").openPortCount == 5;

    if (hasRedPill && enoughPortsOpen && currentHacking >= requiredHacking) {
        await manuallyConnectTo(ns, "w0r1d_d43m0n");
        await ns.installBackdoor();
    }
    // Gives some time for the "Bitnode completed" scroll to complete
    window.setTimeout(() => startNewNode(), 12_000);
}

function startNewNode() {
    const doc = eval("document");

    // Click on the link for Bitnode 12
    [... doc.querySelectorAll("span")].map(f => getReactProps(f)).filter(e => e).filter( e => e.onClick)[4].onClick();
    // Press the Enter button
    doc.querySelector("button").click();
    // Bootstrap in the new Bitnode 
    window.setTimeout(() => runTerminalCommand("run bootstrap.js"), 1000);
}

function runTerminalCommand(command: string) {
    const doc = eval("document");
    const terminalInput = doc.getElementById("terminal-input");
    terminalInput.value= command;
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({target:terminalInput});
    terminalInput[handler].onKeyDown({keyCode:13,preventDefault:()=>null});
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getReactFiber(element: HTMLElement) {
    const key = Object.keys(element).find(key => key.startsWith("__reactFiber")) as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (element as Record<string, any>)[key];
}

function getReactProps(element: HTMLElement) {
    const key = Object.keys(element).find(key => key.startsWith("__reactProps")) as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (element as Record<string, any>)[key];
}
