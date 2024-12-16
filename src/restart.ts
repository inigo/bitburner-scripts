import { NS } from '@ns';

export function autocomplete(data : AutocompleteData) : string[] {
    return [...data.scripts];
}

export async function main(ns: NS): Promise<void> {
    const targetScript = ns.args[0] as string;
    const remainingArgs = ns.args.slice(1);

    const server = "home";

    if (ns.scriptRunning(targetScript, server)) {
        ns.scriptKill(targetScript, server);
        ns.tprint(`Killed existing instance`);
    }

    const isTail = remainingArgs.includes("tail"); // Cannot be --tail, since that's treated specially
    const nonTailArgs = remainingArgs.filter(arg => arg !== "tail");

    const threadCount = 1;
    const pid = ns.exec(targetScript, server, threadCount, ...nonTailArgs);
    const argText = (nonTailArgs.length > 0) ? " with arguments: " + nonTailArgs.join(", ") : "";
    ns.tprint(`PID: ${pid} - ${targetScript}${argText}`);
    if (isTail) {
        ns.tail(pid);
    }
}
