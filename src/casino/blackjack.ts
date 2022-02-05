/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { fmt } from "libFormat";
import * as dom from "casino/libDom";
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	const moneyBefore = ns.getServerMoneyAvailable("home");
	if (moneyBefore < 100_000_000) {
		ns.tprint("Insufficient funds - need a safe margin to bet with");
		ns.exit();
	}

	const decksToPlay = 1;

	const strategies: IBetStrategy[] = [
		new HiLoBetStrategy("hilo"),
		new WongHalvesBetStrategy("wongHalves"),
		new YetAnotherWongHalvesBetStrategy("yetAnotherWongHalves"),
		new WongHalvesVariantBetStrategy("wongHalvesVariant_1_25", 1.25),
		new WongHalvesVariantBetStrategy("wongHalvesVariant_1_5", 1.5),
		new WongHalvesVariantBetStrategy("wongHalvesVariant_2", 2),
		new WongHalvesAnotherVariantBetStrategy("wongHalvesAnotherVariant"),
		new WizardOfOddsStrategy("woo_2", 2, 1_000_000),
		new WizardOfOddsStrategy("woo_3", 3, 1_000_000)
	]	
	let played = 0;
	for (let i=0; i<decksToPlay; i++) {
		played += playGames(ns, 9999, strategies); // Will reset when decks shuffled
	}

	ns.tprint("-----");
	strategies.forEach(s => ns.tprint(fmt(ns)`INFO Strategy ${s.name} won £${s.getTotalWinnings()} (biggest win £${s.getBiggestWin()} and biggest loss £${s.getBiggestLoss()})`));

	const moneyAfter = ns.getServerMoneyAvailable("home");
	ns.tprint(fmt(ns)`Done - played ${played} games and gained £${moneyAfter - moneyBefore} (note incorrect if other scripts running)`);

	const doc = dom.getDocument();	
	dom.selectSidebarOption(doc, "Terminal");	
}

function playGames(ns: NS, gamesToPlay: number, strategies: IBetStrategy[]): number {
	const doc = dom.getDocument();
	dom.selectSidebarOption(doc, "City");
	dom.goToLocationInCity(doc, "Summit University");
	dom.selectSidebarOption(doc, "City");	
	dom.goToLocationInCity(doc, "Iker Molina Casino");
	dom.clickButton(doc, "Play blackjack");
	setBet(doc, 1000000);

	const decks = new Decks(ns);
	let played = 0;

	const basicGameplay = new BasicGameplay();

	for (let i = 0; i < gamesToPlay; i++) {
		ns.print("Starting new game");

		dom.clickButton(doc, "Start");

		const startingPlayerCards = getPlayerCards(doc);
		ns.print("Starting player cards are "+startingPlayerCards);
		ns.print("Starting player values are "+startingPlayerCards.map(c => c.getValue()));
		ns.print("Starting player numbers are "+startingPlayerCards.map(c => c.getNumber()));
		const startingDealerCards = getDealerCards(doc);	
		ns.print("Starting dealer cards are "+startingDealerCards);
		startingPlayerCards.forEach(c => decks.recordCard(c));
		startingDealerCards.forEach(c => decks.recordCard(c));
		
		let currentCards = startingPlayerCards;
		for (let j = 0; j < 10; j++) {
			const shouldHit = basicGameplay.shouldPlayerHit(ns, currentCards, startingDealerCards);
			const buttonToPress = shouldHit ? "Hit" : "Stay";
			ns.print("Player action is:  "+buttonToPress);
			dom.clickButton(doc, buttonToPress); // Button may not exist if blackjack

			const playerCardsNow = getPlayerCards(doc);
			const newCards = playerCardsNow.slice(currentCards.length);
			if (newCards.length>0) {
				ns.print("New cards "+newCards);
			}
			newCards.forEach(c => decks.recordCard(c));
			currentCards = playerCardsNow;
			if (!shouldHit) break;
		}

		const finalDealerCards = getDealerCards(doc);
		ns.print("Final dealer cards are:  "+finalDealerCards);
		const newDealerCards = finalDealerCards.slice(startingDealerCards.length);
		newDealerCards.forEach(c => decks.recordCard(c));
		const gameResult = getGameResult(doc);
		strategies.forEach(s => s.recordResult(gameResult));
		played++;

		strategies.forEach(s => s.chooseBet(decks));

		if (decks.hasShuffled) {
			ns.tprint("INFO Restarting, since deck has reset");
			strategies.forEach(s => ns.tprint(fmt(ns)`Strategy ${s.name} won £${s.getSessionWinnings()}`));
			strategies.forEach(s => s.newSession());
			return played;
		}

		const chosenStrategy = new WongHalvesBetStrategy("chosen-wong-halves");
		const maxBet = 100_000_000;
		const desiredBet = chosenStrategy.chooseBet(decks); 
		const betSize = Math.min(maxBet, desiredBet);
		setBet(doc, betSize);
	}
	return played;
}

class IBetStrategy {
	lastBetSize = 0;
	winningsInThisSession = 0;
	totalWinnings = 0;
	eachSessionWinnings: number[] = [];
	name: string;
	constructor(name: string) {
		this.name = name;
	}
	recordResult(r: GameResult): void {
		if (r===GameResult.Win) { 
			this.winningsInThisSession += this.lastBetSize;
			this.totalWinnings += this.lastBetSize;
		} else if (r===GameResult.Loss) {
			this.winningsInThisSession -= this.lastBetSize;
			this.totalWinnings -= this.lastBetSize;
		}
	}
	getTotalWinnings(): number { return this.totalWinnings; }
	getSessionWinnings(): number { return this.winningsInThisSession; }
	getAverageSessionWinnings(): number { return this.totalWinnings / this.eachSessionWinnings.length; }
	getBiggestLoss(): number { return Math.min(... this.eachSessionWinnings);  }
	getBiggestWin(): number { return Math.max(... this.eachSessionWinnings);  }
	getAverageSessionStdDeviation(): number { 
		if (this.eachSessionWinnings.length == 0) { return 0; }
		const mean = this.getAverageSessionWinnings();
		return Math.sqrt(this.eachSessionWinnings.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / this.eachSessionWinnings.length);
	}
	weightScoreByRemainingDecks(decks: Decks, score: number): number {
		const unplayedDecks = Math.max(decks.getUnplayedDecks(), 0.5);
		const trueScore = score / unplayedDecks;
		return trueScore;
	}
	recordBet(bet: number) {
		const maxBet = 100_000_000;
		this.lastBetSize = Math.min(maxBet, bet);
	}
	newSession(): void { 
		this.eachSessionWinnings.push(this.winningsInThisSession);
		this.lastBetSize = 0; 
		this.winningsInThisSession = 0;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	chooseBet(decks: Decks): number { return 1; }
}

class HiLoBetStrategy extends IBetStrategy {
	constructor(name: string) {
		super(name);
	}
	chooseBet(decks: Decks): number {
		const score = decks.calculateHiLoScore();
		const trueScore = this.weightScoreByRemainingDecks(decks, score);
		const bet = (trueScore <= 1) ? 1 :
			(trueScore <= 2) ? 2_000_000 :
			(trueScore <= 3) ? 4_000_000 :
			(trueScore <= 4) ? 6_000_000 : 
			(trueScore <= 5) ? 10_000_000 : 
			(trueScore <= 8) ? 20_000_000 : 
			(trueScore <= 12) ? 30_000_000 : 
			50_000_000;		
		this.recordBet(bet);
		return bet;
	}
}

class WongHalvesBetStrategy extends IBetStrategy {
	constructor(name: string) {
		super(name);
	}
	chooseBet(decks: Decks): number {
		const score = decks.calculateWongHalvesScore();
		const trueScore = this.weightScoreByRemainingDecks(decks, score);
		const bet = (trueScore <= 1) ? 1 :
			(trueScore <= 2) ? 2_000_000 :
			(trueScore <= 3) ? 4_000_000 :
			(trueScore <= 4) ? 6_000_000 : 
			(trueScore <= 5) ? 10_000_000 : 
			(trueScore <= 8) ? 20_000_000 : 
			(trueScore <= 12) ? 30_000_000 : 
			50_000_000;		
		this.recordBet(bet);
		return bet;
	}
}


class YetAnotherWongHalvesBetStrategy extends IBetStrategy {
	constructor(name: string) {
		super(name);
	}
	chooseBet(decks: Decks): number {
		const score = decks.calculateWongHalvesScore();
		const trueScore = this.weightScoreByRemainingDecks(decks, score);
		const bet = (trueScore <= 1) ? 1 :
			(trueScore <= 2) ? 1_000_000 :
			(trueScore <= 3) ? 2_000_000 :
			(trueScore <= 4) ? 4_000_000 : 
			6_000_000;		
		this.recordBet(bet);
		return bet;
	}
}


class WongHalvesVariantBetStrategy extends IBetStrategy {
	powerToRaise: number;
	constructor(name: string, powerToRaise: number) {
		super(name);
		this.powerToRaise = powerToRaise;
	}
	chooseBet(decks: Decks): number {
		const score = decks.calculateWongHalvesScore();
		const trueScore = this.weightScoreByRemainingDecks(decks, score);
		const bet = (trueScore <= 1.5) ? 1 : ((trueScore-0.5) ** this.powerToRaise) * 2_000_000;
		this.recordBet(bet);
		return bet;
	}
}

class WongHalvesAnotherVariantBetStrategy extends IBetStrategy {
	constructor(name: string) {
		super(name);
	}
	chooseBet(decks: Decks): number {
		const score = decks.calculateWongHalvesScore();
		const trueScore = this.weightScoreByRemainingDecks(decks, score);
		const bet = (trueScore <= 1.2) ? 1 : (2 ** trueScore) * 100_000;
		this.recordBet(bet);
		return bet;
	}
}

class WizardOfOddsStrategy extends IBetStrategy {
	powerToRaise: number;
	baseBet: number;
	constructor(name: string, powerToRaise = 3, baseBet = 1_000_000) {
		super(name);
		this.powerToRaise = powerToRaise;
		this.baseBet = baseBet;
	}
	chooseBet(decks: Decks): number {
		const score = decks.calculateScore();
		const bet = (score <= 1.05) ? 1 : (score**this.powerToRaise) * this.baseBet;
		this.recordBet(bet);
		return bet;
	}
}

function getGameResult(doc: Document): GameResult {
	const winString = [... doc.querySelectorAll("p.MuiTypography-body1.MuiTypography-root span")].at(-1)?.textContent as string;
	return (! winString.includes("$")) ? GameResult.Tie : 
		(winString.includes("-")) ? GameResult.Loss : GameResult.Win;
}
enum GameResult { Win = 1, Loss = -1, Tie = 0 }

function setBet(doc: Document, amount: number): void {
	const input = doc.querySelector("input");
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	dom.setValue(input!, ""+amount);
}

class BasicGameplay {
	shouldPlayerHit(ns: NS, playerCards: Card[], dealerCards: Card[]) {
		// A dealer must hit if they have 16 or lower.
		// If the dealer has a Soft 17 (Ace + 6), then they stand.
	
		const playerHand = this.toHand(ns, playerCards);
		const dealerHand = this.toHand(ns, dealerCards);
	
		ns.print("Player hand value "+playerHand.value+" from '"+playerCards+"' and dealer hand value "+dealerHand.value+" from '"+dealerCards+"'");
	
		// https://wizardofodds.com/games/blackjack/strategy/4-decks/
		// Always hit hard 11 or less.
		if (playerHand.value <= 11 && playerHand.isHard) { return true; }
		// Stand on hard 12 against a dealer 4-6, otherwise hit.
		if (playerHand.value == 12) {
			if (dealerHand.value >=4 && dealerHand.value <= 6) { return false; } else { return true; }
		}
		// Stand on hard 13-16 against a dealer 2-6, otherwise hit.
		if (playerHand.value >= 13 && playerHand.value <= 16) {
			if (dealerHand.value >=2 && dealerHand.value <= 6) { return false; } else { return true; }
		}
		// Always stand on hard 17 or more.
		if (playerHand.value >= 17 && playerHand.isHard) { return false; }
		// Always hit soft 17 or less.
		if (playerHand.value <= 17 && ! playerHand.isHard) { return true; }
		// Stand on soft 18 except hit against a dealer 9, 10, or A.
		if (playerHand.value == 18 && ! playerHand.isHard) {
			if (dealerHand.value >= 9 || ! dealerHand.isHard) { return true; } else { return false; }
		}
		// Always stand on soft 19 or more.
		return false;
	}
	toHand(ns: NS, cards: Card[]): Hand {
		let value = cards.map(c => c.getNumber()).reduce((a, b) => a+b, 0);
		const isSoft = cards.some(c => c.isAce());
		const isHard = ! isSoft;
		if (value > 21 && isSoft) value = value - 10;
		return { value : value, isHard: isHard, isSoft: isSoft  };
	}	
}
type Hand = { value: number, isHard: boolean, isSoft: boolean };



function getPlayerCards(doc: Document): Card[] {
	const playerCardHolder = getCardHolders(doc)[0];
	// This gives values like '3♦', 'J♥', 'K♣', ♠
	const playerCards: string[] = [... playerCardHolder.querySelectorAll(".MuiPaper-elevation")].map(c => c.textContent) as string[];
	return playerCards.map(c => new Card(c));
}

function getDealerCards(doc: Document): Card[] {
	const dealerCardHolder = getCardHolders(doc)[1];
	const dealerCards: string[] = [... dealerCardHolder.querySelectorAll(".MuiPaper-elevation")].map(c => c.textContent) as string[];
	return dealerCards.filter(cs => ! cs.includes("-")).map(c => new Card(c));
}

function getCardHolders(doc: Document): NodeListOf<Element> {
	return doc.querySelectorAll(".MuiPaper-elevation.MuiPaper-rounded.MuiPaper-elevation2");
}

class Decks {
	allCards: Card[] = [];
	cardLookup = new Map();
	numDecks = 5;
	sleeveSize = 52 * this.numDecks;
	ns: NS;
	hasShuffled = false;
	constructor(ns: NS) {
		this.ns = ns;
	}
	recordCard(c: Card): void {
		const cardString = c.getCardString();
		// this.ns.print("Recording "+cardString);
		const existingCount = this.cardLookup.get(cardString) ?? 0;
		if (existingCount==5) {
			this.ns.print("All decks in shoe used - resetting stats");
			this.hasShuffled = true;
			this.reset();
			this.cardLookup.set(cardString, 1);
		} else {
			this.cardLookup.set(cardString, existingCount+1);
		}
		this.allCards.push(c);
	}
	reset(): void {
		this.allCards = [];
		this.cardLookup = new Map();
	}
	cardsPlayed(): number {
		return this.allCards.length;
	}
	calculateScore() {
		// From https://wizardofodds.com/games/blackjack/effect-of-removal/
		// See also http://www.bjstrat.net/cgi-bin/cdca.cgi
		const modifiers = [
			[2,0.069],
			[3,0.082],
			[4,0.110],
			[5,0.141],
			[6,0.079],
			[7,0.041],
			[8,-0.008],
			[9,-0.040],
			[10,-0.091],
			[11,-0.094],			
		];
		const findModifier = (v: number): number => modifiers.filter(m => m[0]==v).map(m => 0 + m[1]).at(0) ?? 0;
		const score =  this.allCards.map(c => findModifier(c.getNumber())).reduce((a, b) => a + b, 1);
		return score;
	}
	calculateHiLoScore(): number {
		const hilo = (v: number): number => (v>=10) ? -1 : (v>=2 && v<=6) ? 1 : 0;
		return this.allCards.map(c => hilo(c.getNumber())).reduce((a, b) => a+b, 0);
	}
	calculateWongHalvesScore(): number {
		const wong = (v: number): number => (v>=10) ? -1 : 
							(v==2 || v==7) ? 0.5 :
							(v==3 || v==4 || v==6) ? 1 :
							(v==5) ? 1.5 :
							(v==8) ? 0 :
							(v==9) ? -0.5 :
							0;
		return this.allCards.map(c => wong(c.getNumber())).reduce((a, b) => a+b, 0);
	}
	getUnplayedDecks(): number { 
		const playedDecks = this.allCards.length / 52;
		const unplayedDecks = this.numDecks - playedDecks;
		return unplayedDecks; 
	}
}

class Card {
	cardString: string;
	suit: string;
	value: string;
	constructor(cardString: string) {
		this.cardString = cardString;
		this.suit = this.cardString.substring(this.cardString.length-1);
		this.value = this.cardString.substring(0, this.cardString.length-1);
	}
	getValue(): string { return this.value; }
	getSuit(): string { return this.suit; }
	getNumber(): number { return this.isAce() ? 11 : (!isNaN(Number.parseInt(this.value))) ? Number.parseInt(this.value) : 10; }
	isAce(): boolean { return this.value==="A"; }
	toString(): string { return "Card: "+this.cardString; }
	getCardString(): string { return this.cardString; }
}
