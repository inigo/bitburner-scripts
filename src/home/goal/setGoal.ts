import {NS} from '@ns'
import {getBitnodeAndGoal, Goal, listGoals} from "/goal/libGoal";
import {setGoal} from "/goal/libGoalSetting";

//! Set the primary goal of the Bitnode - i.e. the path that we will take to win. Typically "hacking", but "stocks" is better in BN 8 and "bladeburner" may be better.
//! 

export function autocomplete() : string[] {
    return listGoals();
}

export async function main(ns: NS): Promise<void> {
    const goal = ns.args[0] as string;
    if (! listGoals().includes(goal)) {
        ns.tprint(`Invalid goal '${goal}'. Valid goals are ${listGoals().join(', ')}.`);
        return;
    }

    const [bitnodeForPreviousGoal, previousGoal] = getBitnodeAndGoal(ns);
    if (previousGoal) {
        ns.tprint(`Previous goal was ${previousGoal}, set for bitnode ${bitnodeForPreviousGoal}.`);
    }
    setGoal(ns, goal as Goal);
    const [bitnode, newGoal] = getBitnodeAndGoal(ns);
    ns.tprint(`New goal for bitnode ${bitnode} is ${newGoal}`);
}