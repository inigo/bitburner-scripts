import {NS} from '@ns'
import * as ports from "@/libPorts";

/// Prevent scripts from buying augments and applying them - call with either true or false (defaults to true)

export async function main(ns: NS) {
    const value = ns.args[0] as string;

    if (value!="false") {
        ns.tprint("Setting 'do not restart'. Scripts can no longer apply augmentations. Call this script again with 'false' to reset");
        await ports.setPortValue(ns, ports.DO_NOT_RESTART, true);
    } else {
        ns.tprint("Clearing 'do not restart'. Scripts can now apply augmentations");
        await ports.setPortValue(ns, ports.DO_NOT_RESTART, false);
    }
}
