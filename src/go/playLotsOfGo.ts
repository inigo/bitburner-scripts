import {NS} from '@ns'
import {Opponent, startGame} from "/go/playGo";

export async function main(ns: NS): Promise<void> {
    let n = 0;

    const availableOpponents = [
        Opponent.Tetrads,
        Opponent.Netburners,
        Opponent.Daedalus,
        Opponent.TheBlackHand,
        Opponent.Illuminati,
    ];

    while (n < 100) {
        const opponent = availableOpponents[n % availableOpponents.length];
        await startGame(ns, opponent, 13);
        n++;
    }
}
