import { NS } from '@ns'
import {solveVigenereCipher} from "/contracts/moreContracts";

export async function main(ns: NS): Promise<void> {
    testVigenereCipher(ns);
}

export function testVigenereCipher(ns: NS): void {
    function checkAnswer(ns: NS, data: string[], correctAnswer: string) {
        const answer = solveVigenereCipher(ns, data);
        if (answer === correctAnswer) {
            ns.tprint("Correct answer for "+data+" was "+answer);
        } else {
            ns.tprint("Incorrect answer for "+data+" was "+answer+" but expected "+correctAnswer);
        }
    }

    checkAnswer(ns, ["DASHBOARD", "LINUX" ], "OIFBYZIEX");
    checkAnswer(ns, ["FLASHLOGINMACROPRINTLOGIC", "FIRMWARE" ], "KTREDLFKNVDMYRFTWQEFHOXMH");
}

