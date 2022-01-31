import { GangOtherInfo, NS } from '@ns';

/// Work out when the "increase power" gang tick occurs, and switch the gang to "Territory Warfare" for it

export async function main(ns: NS): Promise<void> {
	ns.disableLog("sleep");
	ns.disableLog("gang.setMemberTask");

	if (! ns.gang.inGang()) {
		ns.print("Not in gang - nothing to do");
		ns.exit();
	}
	
	if (ns.gang.getGangInformation().territory > 0.995) {
		ns.print("Gang already controls all territory - nothing to do");
		ns.exit();
	}

	while (true) {
		const powerInterval = await findPowerInterval(ns);
		if (powerInterval.interval < 50) {
			ns.tprint("Error finding power interval - aborting to avoid loop");
			ns.exit();
		}		
		await intermittentlyToggleWarfare(ns, powerInterval);
	}

}

async function findPowerInterval(ns: NS): Promise<PowerInterval> {	
	let gangsToCompare = ns.gang.getOtherGangInformation();
	ns.print("Starting to look for change")
	let startTime = null;
	while (true) {
		const currentGangs = ns.gang.getOtherGangInformation();
		if (! areGangsEqual(gangsToCompare, currentGangs)) {
			if (startTime==null) {
				startTime = new Date().getTime();
				ns.print("First change found");
				gangsToCompare = currentGangs;
			} else {
				const now = new Date().getTime();
				const interval = now - startTime;
				ns.print("Second change is after "+interval+"ms");
				return { interval, timeOfNextTick: now+interval };
			}
		} 
		await ns.sleep(50);
	}	
}

type PowerInterval = { interval: number, timeOfNextTick: number };

async function intermittentlyToggleWarfare(ns: NS, powerInterval: PowerInterval): Promise<void> {
	// Bonus time sometimes goes up to a few milliseconds, so checking for "not 0" doesn't work
	const originallyFast = ns.gang.getBonusTime() > 100;
	const waitForTickInterval = originallyFast ? 100 : 500;
	const now = new Date().getTime();
	const timeToWait = powerInterval.timeOfNextTick - now;
	ns.print("Waiting for "+timeToWait+"ms before next tick");
	await ns.sleep(timeToWait - (waitForTickInterval / 2));

	while (true) {
		const loopStart = new Date().getTime();
		const otherGangs = ns.gang.getOtherGangInformation();
		const isCurrentlyFast = ns.gang.getBonusTime() > 100;

		if (isCurrentlyFast != originallyFast) {
			ns.print("WARN Bonus time has started or finished - need to adjust timing");
			return;
		}

		const names = ns.gang.getMemberNames();
		const originalInfo = names.map(name => ns.gang.getMemberInformation(name));

		const isSafe = ns.gang.getGangInformation().territoryClashChance==0;
		if (isSafe) { names.forEach(name => ns.gang.setMemberTask(name, "Territory Warfare") ); }
		ns.print("INFO Waiting for tick");
		await ns.sleep(waitForTickInterval);
		ns.print("INFO Tick done");
		if (isSafe) { originalInfo.forEach(info => ns.gang.setMemberTask(info.name, info.task) ); }

		const afterTickOtherGangs = ns.gang.getOtherGangInformation();
		if (areGangsEqual(otherGangs, afterTickOtherGangs)) {
			ns.print("WARN Gang power did not change when expected - have lost synch");
			return;
		}
		const timeTakenInLoop = new Date().getTime() - loopStart;
		await ns.sleep(powerInterval.interval - timeTakenInLoop);
	}	
}

function areGangsEqual(otherGangs1: GangOtherInfo, otherGangs2: GangOtherInfo) {
	return JSON.stringify(otherGangs1)==JSON.stringify(otherGangs2);
}