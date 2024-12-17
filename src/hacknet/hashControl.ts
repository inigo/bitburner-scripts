import {NS} from '@ns'
import {HashInfo, listHashOptions, lookupHashAlias, setHashSpend} from "/hacknet/libHashes";

/// Explicitly set the target for buying hashes

export function autocomplete(): string[] {
    return listHashOptions().flatMap(o => o.aliases);
}

export async function main(ns: NS): Promise<void> {
    const targetNames = ns.args
        .map(s => s as string)
        .map(lookupHashAlias)
        .filter((h): h is HashInfo => h !== null)
        .map(h => h.name);
    const targets = targetNames.map(t => { return { name: t }; });

    const setManually = targets.length > 0; // Setting no target reverts to automatic mode

    await setHashSpend(ns, targets, setManually);
}
