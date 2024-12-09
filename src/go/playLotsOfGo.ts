import {NS} from '@ns'
import {startGame} from "/go/playGo";

export async function main(ns: NS): Promise<void> {
    let n = 0;
    while (n < 100) {
        await startGame(ns);
        n++;
    }
}
