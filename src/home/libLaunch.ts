import {NS} from "@ns";

export function anyScriptRunning(ns: NS, filename: string): boolean {
    const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
    return ns.ps().some(p => p.filename === cleanFilename);
}

export async function launchIfNotRunning(ns: NS, filename: string, pause = 200): Promise<boolean> {
    if (! anyScriptRunning(ns, filename)) {
        ns.run(filename);
        await ns.sleep(pause);
        return true;
    } else {
        return false;
    }
}