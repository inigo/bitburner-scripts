import {CrimeType, NS} from '@ns';

export type Goal = "hacking" | "bladeburner" | "stocks";

export function listGoals(): string[] { return ["hacking", "bladeburner", "stocks"]; }

export const goalFilename = "/goal.txt";

export function getBitnodeAndGoal(ns: NS): [string | null, Goal | null] {
    if (!ns.fileExists(goalFilename)) return [null, null];
    const goalText = ns.read(goalFilename);

    const match = new RegExp("^([0-9]+x[0-9]+): (\\w+)$").exec(goalText);
    if (!match) return [null, null];
    const recordedBitnode = match[1];
    const goal = match[2];
    if (! listGoals().includes(goal)) {
        ns.print("Unknown goal: "+goal);
        return [null, null];
    }
    return [recordedBitnode, goal as Goal];
}

export function getGoal(ns: NS): Goal {
    const [, goal] = getBitnodeAndGoal(ns);
    return goal ?? "hacking";
}