/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as ports from "libPorts";
import { NS, Fragment } from '@ns';

/** Create a filename to save/load a Stanek configuration */
export function toFilename(ns: NS, name: string): string {
	const width = ns.stanek.giftWidth();
	return "/stanek/"+name+"-"+width+".txt"
}

export function checkReportedFragments(ns: NS): FullFragmentInfo[] {
	return ports.checkPort(ns, ports.ACTIVE_FRAGMENTS_PORT, JSON.parse) ?? [];
}

export async function reportFragments(ns: NS): Promise<void> {
	const frags = ns.stanek.activeFragments().map(f => addFragmentInfo(f as CombinedFragment));
	await ports.setPortValue(ns, ports.ACTIVE_FRAGMENTS_PORT, JSON.stringify(frags));
}

export function addFragmentInfo(f: CombinedFragment): FullFragmentInfo {
	return {...f, name: lookupFragmentTypeDescription(f.type)! };
}

function allTypes(): FragmentTypeDefinition[] {
	return [
		{type: 3, name: "hackGrowWeakenSpeed", emoji: "⌨️" }
		, {type: 4, name: "hackPower", emoji: "⌨️" }
		, {type: 5, name: "growPower", emoji: "⌨️" }
		, {type: 6, name: "hackingSkill", emoji: "⌨️" }
		, {type: 12, name: "hacknetProduction", emoji: "🖥️" }
		, {type: 13, name: "hacknetCost", emoji: "🖥️" }
		, {type: 14, name: "reputation", emoji: "👪" }
		, {type: 15, name: "workMoney", emoji: "👔" }		
		, {type: 18, name: "boost", emoji: "⬆️" }		
	];
}

// The fragment we actually get from Bitburner is one of these - which is a combination of Fragment and ActiveFragment
export interface CombinedFragment extends Fragment { 
	avgCharge: number;
	numCharge: number;
	rotation: number;
	x: number;
	y: number;
	id: number;
	highestCharge: number;
 }
export interface FullFragmentInfo extends CombinedFragment { name: string }
export interface FragmentTypeDefinition {  type: number; name: string, emoji: string }
export interface SimpleFragment { name: string, id: number, x: number, y: number, rotation: number }

function lookupFragmentTypeDescription(type: number) {
	return allTypes().find(t => t.type === type)?.name;
}

export function lookupFragmentTypeIcon(type: number): (string | null) {
	return allTypes().find(t => t.type === type)?.emoji ?? null;
}