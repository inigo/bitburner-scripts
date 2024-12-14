import { NS } from '@ns';
import {reportFragments} from "/stanek/libFragment";

/// On a specified server, run nothing but a continuous charge of Stanek's Gift

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers];
}

export async function main(ns: NS): Promise<void> {
    const server = (ns.args[0] as string);

    await reportFragments(ns);

    await ns.scp([ "libFormat.js", "/stanek/libFragment.js", "/stanek/chargeFragments.js"], server)
    ns.killall(server);

    const ram = ns.getServerMaxRam(server)
    const scriptRam = ns.getScriptRam("/stanek/chargeFragments.js", server);

    const threads = Math.floor(ram / scriptRam);
    ns.exec("/stanek/chargeFragments.js", server, threads);
}
