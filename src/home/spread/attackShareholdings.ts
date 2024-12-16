import { NS } from '@ns'
import { sendAttackTarget } from "/spread/libSpread";

export async function main(ns : NS) : Promise<void> {
    const stockServerLookup = buildStockServerLookup();
    const ownedStocks = getMostOwnedStocks(ns);
    const serversForStocks = ownedStocks
            .map(sym => stockServerLookup.get(sym) as (string | null))
            .filter(s => s!=null)
            .map(s => (s as string))
            .filter(s => ns.hasRootAccess(s))
            .filter(s => ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel());
    ns.print(ns.sprintf("Most owned stocks are %j and servers are %j", ownedStocks, serversForStocks));
    const mostOwned = serversForStocks[0];

    ns.toast("Setting attack target to be "+mostOwned);
    const target = mostOwned ?? "joesguns";
    await sendAttackTarget(ns, target);
}

function buildStockServerLookup() {
    return new Map([
        [ "ECP", "ecorp" ],
        [ "MGCP", "megacorp" ],
        [ "BLD", "blade" ],
        [ "CLRK", "clarkinc" ],
        [ "OMTK", "omnitek" ],
        [ "FSIG", "4sigma" ],
        [ "KGI", "kuai-gong" ],
        [ "FLCM", "fulcrumtech" ],
        [ "STM", "stormtech" ],
        [ "DCOMM", "defcomm" ],
        [ "HLS", "helios" ],
        [ "VITA", "vitalife" ],
        [ "ICRS", "icarus" ],
        [ "UNV", "univ-energy" ],
        [ "AERO", "aerocorp" ],
        [ "OMN", "omnia" ],
        [ "SLRS", "solaris" ],
        [ "GPH", "global-pharm" ],
        [ "NVMD", "nova-med" ],
        [ "WDS", null ],
        [ "LXO", "lexo-corp" ],
        [ "RHOC", "rho-construction" ],
        [ "APHE", "alpha-ent" ],
        [ "SYSC", "syscore" ],
        [ "CTK", "comptek" ],
        [ "NTLK", "netlink" ],
        [ "OMGA", "omega-net" ],
        [ "FNS", "foodnstuff" ],
        [ "JGN", "joesguns" ],
        [ "SGC", "sigma-cosmetics" ],
        [ "CTYS", "catalyst" ],
        [ "MDYN", "microdyne" ],
        [ "TITN", "titan-labs" ],
    ]);
}

function getMostOwnedStocks(ns: NS) {
    const valueFn = (s: string): number => {
        const position = ns.stock.getPosition(s);
        return position[0] * position[1];
    };
    const symbols = ns.stock.getSymbols();
    const owned = symbols.filter(s => ns.stock.getPosition(s)[0] > 0)
            .sort((a, b) =>  valueFn(b) - valueFn(a) );
    return owned;
}