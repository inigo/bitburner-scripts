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

    while (n < 20) {
        try {
            await startGame(ns, Opponent.Unknown, 13);
        } catch (e) {
            ns.print("Attempting to play unknown opponent - expecting to fail if not yet unlocked");
        }
    }

    while (n < 100) {
        const opponent = availableOpponents[n % availableOpponents.length];
        await startGame(ns, opponent, 13);
        n++;
    }
}
