import { NS } from '@ns';
import {reportFragments} from "@/stanek/libFragment";

/// On a specified server, run nothing but a continuous charge of Stanek's Gift

// noinspection JSUnusedGlobalSymbols
export function autocomplete(data : AutocompleteData) : string[] {
    return [...data.servers];
}

export async function main(ns: NS): Promise<void> {
    const server = (ns.args[0] as string);

    await reportFragments(ns);

    ns.scp([ "libFormat.js", "/stanek/libFragment.js", "/stanek/chargeFragments.js"], server)
    ns.killall(server);

    const ram = ns.getServerMaxRam(server)
    const scriptRam = ns.getScriptRam("/stanek/chargeFragments.js", server);

    const threads = Math.floor(ram / scriptRam);
    if (threads > 0) {
        ns.exec("/stanek/chargeFragments.js", server, threads);
    } else {
        ns.toast(`Not boosting reputation from ${server} because it's not owned`)
    }
}
