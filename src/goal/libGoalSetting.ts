import {NS, SourceFileLvl} from "@ns";
import {getBitnodeAndGoal, Goal, goalFilename} from "/goal/libGoal";

export function isCurrentGoalValid(ns: NS): boolean {
    const [recordedBitnode, goal] = getBitnodeAndGoal(ns);
    if (recordedBitnode == null || goal == null) return false;
    if (recordedBitnode != bitNodeStr(ns)) {
        ns.print(`Goal is for a different bitnode: recorded bitnode is ${recordedBitnode} but current is ${bitNodeStr(ns)}. Previous goal was ${goal}.`);
        return false;
    }
    return true;
}

export function setGoal(ns: NS, goal: Goal): void {
    const goalText = `${bitNodeStr(ns)}: ${goal}`;
    ns.write(goalFilename, goalText, "w");
}

function bitNodeStr(ns: NS): string {
    const [bitNodeNumber, level] = bitNode(ns);
    return `${bitNodeNumber}x${level}`;
}

function bitNode(ns: NS): [number, number] {
    const bitNodeNo = ns.getResetInfo().currentNode;
    // We can't explicitly tell what level bitnode we're in (I think?) but can infer based on what source files we already have
    const ownedSourceFiles = ns.singularity.getOwnedSourceFiles();
    const level = Math.max(... ownedSourceFiles.filter((sf: SourceFileLvl) => sf.n == bitNodeNo).map((sf: SourceFileLvl) => sf.lvl), 0) + 1;
    return [bitNodeNo, level];
}
