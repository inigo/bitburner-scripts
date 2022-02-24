import { toFilename, reportFragments, SimpleFragment } from "stanek/libFragment";
import { NS } from '@ns';

/// Load fragments into Stanek's Gift from a file

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.txts].filter(t => t.startsWith("/stanek/"))
						.map(t => t.substring("/stanek/".length))
						.map(t => t.substring(0, t.indexOf("-")))
}

export async function main(ns: NS): Promise<void> {
	const name = (ns.args[0] as string) ?? "scratch"; 
	const filename = toFilename(ns, name);	

	loadFragments(ns, filename);
	await reportFragments(ns);
}

export function loadFragments(ns: NS, filename: string) {
	const fragsJson = ns.read(filename);
	if (fragsJson=="") {
		ns.tprint("ERROR File not found - looking for "+filename);
		ns.exit();
	}
	const frags: SimpleFragment[] = JSON.parse(fragsJson)
	ns.stanek.clear();
	frags.forEach(f => ns.stanek.place(f.x, f.y, f.rotation, f.id) );
}