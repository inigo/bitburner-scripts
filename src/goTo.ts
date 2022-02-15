import { manuallyConnectTo } from "basic/installBackdoors"; 
import { NS } from '@ns'

/**
 * Switch terminal to the specified server
 */
export async function main(ns : NS) : Promise<void> {
	const destination = ns.args[0] as string;
    if (destination==null) {
        ns.tprint("Specify a server to connect to");
    } else {
        await manuallyConnectTo(ns, destination);
    }
}

export function autocomplete(data : AutocompleteData) : string[] {
    return [...data.servers];
}

