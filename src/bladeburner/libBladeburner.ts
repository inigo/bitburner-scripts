/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';

export function manageBladeburner(ns: NS): void {
	// pick city

	const action = selectAction(ns);
	const preferOverclock = action.type=="Operation" && action.meanSuccessChance > 0.8;
	upgradeSkills(ns, preferOverclock);

	const currentAction = ns.bladeburner.getCurrentAction();
	if (currentAction.name != action.name) {
		ns.bladeburner.startAction(action.type, action.name);
	}
}

export function upgradeSkills(ns: NS, preferOverclock: boolean): void {
	const skills = listInterestingSkills();

	const maxedOverclock = (ns.bladeburner.getSkillLevel("Overclock")>=90);
	const cheapestSkills = skills
			.filter(s => s != "Overclock" || !maxedOverclock)
			.filter(s => s != "Tracer" || ns.bladeburner.getSkillLevel("Tracer") <= 15 )
			.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a) - ns.bladeburner.getSkillUpgradeCost(b));
	
	const overclockBias = (preferOverclock && !maxedOverclock) ? 3 : 1;
	
	for (const skill of cheapestSkills) {
		const skillCost = ns.bladeburner.getSkillUpgradeCost(skill) * (skill=="Overclock" ? 1 : overclockBias);
		if (skillCost <= ns.bladeburner.getSkillPoints()) {
			ns.toast("Upgrading "+skill);
			ns.bladeburner.upgradeSkill(skill);
		}
	}
}

function listInterestingSkills(): string[] {
	return [ "Overclock", "Blade's Intuition", "Cloak", 
			"Short-Circuit", "Digital Observer",  "Reaper", 
			"Evasive System", "Tracer" ];
}

export function selectAction(ns: NS): BladeburnerAction {
	// Find action with highest rank gain
	const bestActions = evaluateActions(ns)
							.filter(a => a.remainingCount>0)
							.filter(a => a.meanSuccessChance >= 0.7)
							.filter(a => a.name != "Incite Violence") // Generates too much chaos
							.filter(a => a.name != "Raid") // Generates too much chaos, kills too many people
							.sort((a, b) => a.repGainRate - b.repGainRate).reverse();

	const trainingAction = bestActions.find(a => a.name=="Training"); 
	const researchAction = bestActions.find(a => a.name=="Field Analysis"); 
	const healAction = bestActions.find(a => a.name=="Hyperbolic Regeneration Chamber");
	const diplomacyAction = bestActions.find(a => a.name=="Stealth Retirement Operation") ?? bestActions.find(a => a.name=="Diplomacy");
	const inciteAction = evaluateActions(ns).find(a => a.name=="Incite Violence");

	const currentChaos = ns.bladeburner.getCityChaos(ns.bladeburner.getCity());
	const isTooChaotic = currentChaos > 50;
	const lackingInfo = (bestActions[0].maxSuccessChance - bestActions[0].minSuccessChance) > 0.01;
	const usedUpActions = evaluateActions(ns).filter(a => a.remainingCount==0).map(a => a.name);
	const noActionsRemaining = usedUpActions.includes("Sting Operation") &&
								usedUpActions.includes("Stealth Retirement Operation") &&
								usedUpActions.includes("Investigation") &&
								usedUpActions.includes("Assassination");
	

	const action = !isTrained(ns) ? trainingAction :
					!isHealthy(ns) ? healAction :
					isTooChaotic ? diplomacyAction :
					noActionsRemaining ? inciteAction : 
					lackingInfo ? researchAction : 
					bestActions[0];
	return action !;
}

function isHealthy(ns: NS): boolean {
	const [currentStamina, maxStamina ] = ns.bladeburner.getStamina();
	const isTired = (currentStamina / maxStamina) < 0.7;
	return !isTired;
}

function isTrained(ns: NS): boolean {
	const p = ns.getPlayer();
	const stats = [ p.agility, p.defense, p.dexterity, p.strength, p.charisma ];
	return Math.min(... stats) >= 100;
}

export function evaluateActions(ns: NS): BladeburnerAction[] {
	const general = ns.bladeburner.getGeneralActionNames().map(c => getActionStats(ns, "General", c));
	const contracts = ns.bladeburner.getContractNames().map(c => getActionStats(ns, "Contract", c));
	const operations = ns.bladeburner.getOperationNames().map(o => getActionStats(ns, "Operation", o));
	return [... general, ... contracts, ... operations];
}

function getActionStats(ns: NS, type: string, name: string): BladeburnerAction {
	const remainingCount = ns.bladeburner.getActionCountRemaining(type, name);
	const [minSuccessChance, maxSuccessChance] = ns.bladeburner.getActionEstimatedSuccessChance(type, name);
	const meanSuccessChance = (minSuccessChance + maxSuccessChance) / 2;
	const time = ns.bladeburner.getActionTime(type, name);
	const level = ns.bladeburner.getActionCurrentLevel(type, name);
	const repGain = ns.bladeburner.getActionRepGain(type, name, level);
	
	const repGainRate = (repGain / (time / 1000)) * meanSuccessChance;
	
	return { type, name, repGainRate, remainingCount, meanSuccessChance, minSuccessChance, maxSuccessChance, time, level, repGain };
}

type BladeburnerAction = { 
	type: string, name: string, repGainRate: number, remainingCount: number,
	meanSuccessChance: number, minSuccessChance: number, maxSuccessChance: number, 
	time: number, level: number, repGain: number
}