import { addFragmentInfo, toFilename, SimpleFragment, FullFragmentInfo, CombinedFragment } from "/stanek/libFragment";
import { NS } from '@ns';

//! Save the current fragment layout to a file
export async function main(ns: NS): Promise<void> {
	const name = (ns.args[0] as string) ?? "scratch";

	const frags: SimpleFragment[] = ns.stanek.activeFragments().map(f => addFragmentInfo(f as CombinedFragment)).map(toSimpleFrag);
	const fragJson = JSON.stringify(frags, null, 2);

	const filename = toFilename(ns, name);	
	await ns.write(filename, fragJson, "w");
}

function toSimpleFrag(f: FullFragmentInfo): SimpleFragment {
	return { name: f.name, id: f.id, x: f.x, y: f.y, rotation: f.rotation };
}

