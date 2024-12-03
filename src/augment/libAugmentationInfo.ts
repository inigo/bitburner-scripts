import {Multipliers, NS} from "@ns";
import * as ports from "/libPorts";

export function retrieveAugInfo(ns: NS): (AugReport | null) {
    return ports.checkPort(ns, ports.AUG_REPORTS_PORT, JSON.parse) as (AugReport | null);
}

export type AugReport = { augCount: number, installableAugs: FullAugmentationInfo[], neurofluxCount: number  }

// @todo update - was extending AugmentationStats not Multipliers, but that no longer exists
export interface FullAugmentationInfo extends Multipliers {
    name: string;
    reqs: string[];
    cost: number;
    reputationNeeded: number;
    isHackingAugmentation: boolean;
    isReputationAugmentation: boolean;
    isHacknetAugmentation: boolean;
    isNeuroflux: boolean;
}