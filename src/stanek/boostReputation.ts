import { NS } from '@ns';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers];
}

export async function main(ns: NS): Promise<void> {
    const server = (ns.args[0] as string);

    await ns.scp([ "libFormat.js", "/stanek/libFragment.js", "/stanek/chargeFragments.js"], server)
    ns.killall(server);

    const ram = ns.getServerMaxRam(server)
    const scriptRam = ns.getScriptRam("/stanek/chargeFragments.js", server);

    const threads = Math.floor(ram / scriptRam);
    ns.exec("/stanek/chargeFragments.js", server, threads, "reputation");
}
