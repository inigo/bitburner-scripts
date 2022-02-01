import { fmt } from "libFormat";
import * as dom from "casino/libDom";
import { NS } from '@ns';


export async function main(ns: NS): Promise<void> {
	const doc = dom.getDocument();
	let played = 0;
	const gamesToPlay = 1000;
	const moneyBefore = ns.getServerMoneyAvailable("home");
	while (played < gamesToPlay) {
		const additionalPlayed = playGames(ns, gamesToPlay-played);
		played += additionalPlayed;
	}
	const moneyAfter = ns.getServerMoneyAvailable("home");
	ns.tprint(fmt(ns)`Done - played ${played} games and gained £${moneyAfter - moneyBefore}`);
	dom.selectSidebarOption(doc, "Terminal");	
}

function playGames(ns: NS, gamesToPlay: number): number {
	const doc = dom.getDocument();
	dom.selectSidebarOption(doc, "City");
	dom.goToLocationInCity(doc, "Iker Molina Casino");
	dom.clickButton(doc, "Play blackjack");
	setBet(doc, 1000000);

	const decks = new Decks(ns);
	let played = 0;

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
			const shouldHit = shouldPlayerHit(ns, currentCards, startingDealerCards, decks);
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
		const winnings = getWinnings(doc);
		ns.tprint("Winnings: "+winnings);
		played++;

		const trueScore = getScore(ns, decks);
		if (trueScore < -3) return played;
		const betSize = chooseBet(ns, trueScore);
		setBet(doc, betSize);
	}
	return played;
}

function getWinnings(doc: Document): string {
	return [... doc.querySelectorAll("p.MuiTypography-body1.MuiTypography-root span")].at(-1)?.textContent as string;
}

function setBet(doc: Document, amount: number): void {
	const input = doc.querySelector("input");
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	dom.setValue(input!, ""+amount);
}

function chooseBet(ns: NS, trueScore: number) {
	const minBet = 1000000;
	// const maxBet = 100000000;
	// const availableMoney = ns.getServerMoneyAvailable("home");

	const betModifier = (trueScore <= 1) ? 1 :
						(trueScore <= 2) ? 2 :
						(trueScore <= 3) ? 6 :
						(trueScore <= 4) ? 8 : 12;
	ns.tprint("Bet modifier is "+betModifier);
	const bet = minBet * betModifier;
	ns.tprint("Bet is "+bet);
	return bet;
	// Card counting
// https://www.onlinegamblingsites.com/casino/blackjack/strategy/
// https://www.888casino.com/blog/blackjack-strategy-guide/blackjack-card-counting
}

function getScore(ns: NS, decks: Decks) {
	// Exact percentages - see https://www.888casino.com/blog/blackjack-strategy-guide/blackjack-card-counting
	// const score = decks.calculateHiLoScore();
	const score = decks.calculateWongHalvesScore();
	const unplayedDecks = Math.max(decks.getUnplayedDecks(), 0.5);
	const trueScore = score / unplayedDecks;
	return trueScore;
}

function toHand(ns: NS, cards: Card[]): Hand {
	let value = cards.map(c => c.getNumber()).reduce((a, b) => a+b, 0);
	const isSoft = cards.some(c => c.isAce());
	const isHard = ! isSoft;
	if (value > 21 && isSoft) value = value - 10;
	return { value : value, isHard: isHard, isSoft: isSoft  };
}
type Hand = { value: number, isHard: boolean, isSoft: boolean };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function shouldPlayerHit(ns: NS, playerCards: Card[], dealerCards: Card[], deck: Decks) {
	// https://wizardofodds.com/games/blackjack/strategy/4-decks/

    // Determine if Dealer needs to hit. A dealer must hit if they have 16 or lower.
    // If the dealer has a Soft 17 (Ace + 6), then they stay.

	// @todo If there's an A in the hand with three cards, it should be treated as less
	const playerHand = toHand(ns, playerCards);
	const dealerHand = toHand(ns, dealerCards);

	ns.print("Player hand value "+playerHand.value+" from '"+playerCards+"' and dealer hand value "+dealerHand.value+" from '"+dealerCards+"'");

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
	constructor(ns: NS) {
		this.ns = ns;
	}
	recordCard(c: Card): void {
		const cardString = c.getCardString();
		this.ns.print("Recording "+cardString);
		const existingCount = this.cardLookup.get(cardString) ?? 0;
		if (existingCount==5) {
			this.ns.print("All decks in shoe used - resetting stats");
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
