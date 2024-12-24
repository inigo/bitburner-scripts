/* eslint-disable @typescript-eslint/no-non-null-assertion */
/// Cheat at the casino - by exploiting the repetition in the random number generator - to earn $2b
import { fmt } from "@/libFormat";
import * as dom from "@/casino/libDom";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	const doc = dom.getDocument();

	if (ns.getPlayer().city!="Aevum") {
		ns.singularity.travelToCity("Aevum");
	}
	ns.singularity.stopAction();
	await ns.sleep(100);
	dom.selectSidebarOption(doc, "City");
	dom.goToLocationInCity(doc, "Iker Molina Casino");
	dom.clickButton(doc, "Play coin flip");

	setBet(doc, 0);

	const maxBet = 10000;

	const results = [];
	let prediction = null;
	let correctPrediction = 0;
	let noBetSet = true;

	const startTime = new Date().getTime();

	for (let i=0; i<201029; i++) {
		if (prediction!=null && noBetSet) {
			setBet(doc, maxBet);
			noBetSet = false;
		}

		try {
			const isHead = playCoinflip(doc, prediction ?? true);
			ns.print("Result : "+ ((isHead) ? "head" : "tail"));		
			if (prediction!=null) {
				if (isHead==prediction) correctPrediction++; else correctPrediction--;
			} 
			results.push(isHead);
		} catch (err) {
			ns.print("Coinflipping interrupted - ending");
			ns.exit();
			return;
		}

		if (results.length>1028) {
			const cyclePlace = results.length - 1024 - 1;
			prediction = results.at(cyclePlace+1);
		}
		// Allow some ticks for the normal game functions, so the game doesn't lock up
		if (i % 1000 == 0) { await ns.sleep(2); }
	}

	const gain = correctPrediction*maxBet;
	const endTime = new Date().getTime();
	const timeElapsed = endTime - startTime;
	ns.tprint(fmt(ns)`Made ${correctPrediction} correct guesses earning £${gain} in ${timeElapsed}s`);
	dom.selectSidebarOption(doc, "Terminal");
}

function playCoinflip(doc: Document, chooseHead: boolean): boolean {
	const toPress = chooseHead ? "Head!" : "Tail!";
	dom.clickButton(doc, toPress);
	const resultIsWin = isWin(doc);
	return resultIsWin ? chooseHead : !chooseHead;
}

function setBet(doc: Document, amount: number): void {
	const input = doc.querySelector("input");
	dom.setValue(input!, ""+amount);
}

function isWin(doc: Document): boolean {
	return doc.querySelector("h3")?.textContent === " win!";
}
