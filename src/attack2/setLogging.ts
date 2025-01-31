import {setLogging} from "@/attack2/libAttack";
import {NS} from '@ns'

/// Set whether attack logging is enabled for servers - helpful when debugging the attack code

// noinspection JSUnusedGlobalSymbols
export function autocomplete(): string[] {
    return ["none", "all", "home"];
}

// noinspection JSUnusedGlobalSymbols
export async function main(ns: NS): Promise<void> {
    const value = (ns.args[0] ?? "") as string;
    if (value == "") {
        ns.tprint("Usage: run setLogging.js none|all|home");
        return;
    }
    await setLogging(ns, value);
}