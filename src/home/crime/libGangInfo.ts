import { NS, GangGenInfo } from '@ns';
import * as ports from "/libPorts";

/** Used by the dashboard */
export function lookupGangTaskIcon(task: string): string {
    return listGangTasks().find(n => n.name.toLowerCase() === task.toLowerCase())?.emoji ?? "🦹";
}

function listGangTasks(): TaskDescription[] {
	return [
		{ name: "Train Combat", emoji: "🏋️" }
      , { name: "Train Charisma", emoji: "🤝" }
      , { name: "Terrorism", emoji: "🥷" }
      , { name: "Territory Warfare", emoji: "⚔️" }
	];
}
type TaskDescription = {name: string, emoji: string };


export function retrieveGangInfo(ns: NS): (GangReport | null) {
	return ports.checkPort(ns, ports.GANG_REPORTS_PORT, JSON.parse) as (GangReport | null);
}

export type GangMemberReport = { name: string, task: string}
export type GangReport = { gangInfo: GangGenInfo, factionRep: number, members: GangMemberReport[]  }
