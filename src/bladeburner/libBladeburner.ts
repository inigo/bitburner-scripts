/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {BladeburnerActionName, BladeburnerActionType, BladeburnerSkillName, NS} from '@ns';

export function manageBladeburner(ns: NS): void {
	// pick city

	const action = selectAction(ns);
	const preferOverclock = action.type=="Operations" && action.meanSuccessChance > 0.8;
	upgradeSkills(ns, preferOverclock);

	const currentAction = ns.bladeburner.getCurrentAction();
	if (!currentAction || currentAction.name != action.name) {
		ns.print("Best action is "+action.name+" - switching to that from former action "+(currentAction?.name ?? "none"));
		ns.bladeburner.startAction(action.type, action.name);
	}
}

export function upgradeSkills(ns: NS, preferOverclock: boolean): void {
	const skills = listInterestingSkills();

	const maxedOverclock = (ns.bladeburner.getSkillLevel("Overclock")>=90);
	const cheapestSkills = skills
			.filter(s => s != "Overclock" || !maxedOverclock)
			.filter(s => s != "Tracer" || ns.bladeburner.getSkillLevel("Tracer") <= 15 ) // Tracer more than 15 provides diminishing returns
			.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a) - ns.bladeburner.getSkillUpgradeCost(b));
	
	const overclockBias = (preferOverclock && !maxedOverclock) ? 3 : 1;
	
	for (const skill of cheapestSkills) {
		const skillCost = ns.bladeburner.getSkillUpgradeCost(skill) * (skill=="Overclock" ? 1 : overclockBias);
		if (skillCost <= ns.bladeburner.getSkillPoints()) {
			ns.toast("Upgrading "+skill);
			ns.print("Upgrading "+skill+" - it is the cheapest of the interesting skills (including Overclock bias)");
			ns.bladeburner.upgradeSkill(skill);
		}
	}
}

function listInterestingSkills(): `${BladeburnerSkillName}`[] {
	return [ "Overclock", "Blade's Intuition", "Cloak",
		"Short-Circuit", "Digital Observer", "Reaper",
		"Evasive System", "Tracer" ];
}

export function selectAction(ns: NS): BladeburnerAction {
	// Find action with highest rank gain
	const bestActions = evaluateActions(ns)
							.filter(a => a.remainingCount>=1)
							.filter(a => (a.type!="Black Operations" && a.meanSuccessChance >= 0.7) || (a.type=="Black Operations" && a.meanSuccessChance >= 0.99))
							.filter(a => a.name != "Incite Violence") // Generates too much chaos
							.filter(a => a.name != "Raid") // Generates too much chaos, kills too many people
							.sort((a, b) => a.repGainRate - b.repGainRate).reverse();

	const blackOpAction = bestActions.find(a => a.type=="Black Operations");
	const trainingAction = bestActions.find(a => a.name=="Training");
	const researchAction = bestActions.find(a => a.name=="Field Analysis");
	const healAction = bestActions.find(a => a.name=="Hyperbolic Regeneration Chamber");
	const diplomacyAction = bestActions.find(a => a.name=="Stealth Retirement Operation") ?? bestActions.find(a => a.name=="Diplomacy");
	const inciteAction = evaluateActions(ns).find(a => a.name=="Incite Violence");

	const currentChaos = ns.bladeburner.getCityChaos(ns.bladeburner.getCity());
	const isTooChaotic = currentChaos > 50;
	const lackingInfo = (bestActions[0].maxSuccessChance - bestActions[0].minSuccessChance) > 0.01;
	const usedUpActions = evaluateActions(ns).filter(a => a.remainingCount<1).map(a => a.name);
	const noActionsRemaining = usedUpActions.includes( "Sting Operation" as BladeburnerActionName) &&
								usedUpActions.includes( "Stealth Retirement Operation" as BladeburnerActionName) &&
								usedUpActions.includes( "Investigation" as BladeburnerActionName) &&
								usedUpActions.includes( "Assassination" as BladeburnerActionName);
	

	const action = !isTrained(ns) ? trainingAction :
					isTired(ns) ? healAction :
					isTooChaotic ? diplomacyAction :
					blackOpAction ? blackOpAction :
					noActionsRemaining ? inciteAction :
					lackingInfo ? researchAction : 
					bestActions[0];
	return action !;
}

function isTired(ns: NS): boolean {
	const [currentStamina, maxStamina ] = ns.bladeburner.getStamina();
	return (currentStamina / maxStamina) < 0.7;
}

function isTrained(ns: NS): boolean {
	const p = ns.getPlayer();
	const stats = [ p.skills.agility, p.skills.defense, p.skills.dexterity, p.skills.strength ];
	return Math.min(... stats) >= 100;
}

export function evaluateActions(ns: NS): BladeburnerAction[] {
	const general = ns.bladeburner.getGeneralActionNames().map(c => getActionStats(ns, "General", c));
	const contracts = ns.bladeburner.getContractNames().map(c => getActionStats(ns, "Contracts", c));
	const operations = ns.bladeburner.getOperationNames().map(o => getActionStats(ns, "Operations", o));
	const nextBlackOp = ns.bladeburner.getNextBlackOp();
	const blackOp = nextBlackOp && nextBlackOp.rank<=ns.bladeburner.getRank() ? [ getActionStats(ns, "Black Operations", nextBlackOp.name)] : [];
	return [...general, ...contracts, ...operations, ...blackOp];
}

function getActionStats(ns: NS, type: `${BladeburnerActionType}`, name: `${BladeburnerActionName}`): BladeburnerAction {
	const remainingCount = Math.floor(ns.bladeburner.getActionCountRemaining(type, name));
	const [minSuccessChance, maxSuccessChance] = ns.bladeburner.getActionEstimatedSuccessChance(type, name);
	const meanSuccessChance = (minSuccessChance + maxSuccessChance) / 2;
	const time = ns.bladeburner.getActionTime(type, name);
	const level = (type=="General" || type == "Black Operations") ? 0 : ns.bladeburner.getActionCurrentLevel(type, name); // Cannot get the level for non-levellable actions
	const repGain = ns.bladeburner.getActionRepGain(type, name, level);
	
	const repGainRate = (repGain / (time / 1000)) * meanSuccessChance;
	
	return { type: (type as BladeburnerActionType), name: (name as BladeburnerActionName), repGainRate, remainingCount, meanSuccessChance, minSuccessChance, maxSuccessChance, time, level, repGain };
}

type BladeburnerAction = { 
	type: BladeburnerActionType, name: BladeburnerActionName, repGainRate: number, remainingCount: number,
	meanSuccessChance: number, minSuccessChance: number, maxSuccessChance: number, 
	time: number, level: number, repGain: number
}