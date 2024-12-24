import { NS } from '@ns'

/// Launch Stanek reputation boosting

export async function main(ns: NS): Promise<void> {
    // These might not work, if they haven't been backdoored yet
    ns.run("/stanek/boostReputation.js", 1, "blade");
    ns.run("/stanek/boostReputation.js", 1, "fulcrumtech");
    ns.run("/stanek/boostReputation.js", 1, "omnitek");

    // Kill existing spread attacks - because they might be depending on hacks running on the servers that we've just killed
    ns.run("/spread/spreadAttackController.js", 1, "kill");
}