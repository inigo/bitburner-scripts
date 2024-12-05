import { NS } from '@ns'
import {solveLempelZiv, solveVigenereCipher} from "/contracts/moreContracts";

export async function main(ns: NS): Promise<void> {
    // testVigenereCipher(ns);
    testLempelZiv(ns);
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


export function testLempelZiv(ns: NS): void {
    function checkAnswer(ns: NS, data: string, correctAnswer: string) {
        const answer = solveLempelZiv(ns, data);
        if (answer === correctAnswer) {
            ns.tprint("Correct answer for "+data+" was '"+answer+"'");
        } else {
            ns.tprint("Incorrect answer for "+data+" was '"+answer+"' but expected '"+correctAnswer+"'");
        }
    }

    // checkAnswer(ns, "", "");
    // checkAnswer(ns, "2ab", "ab");
    // checkAnswer(ns, "5aaabb450723abb", "aaabbaaababababaabb");
    checkAnswer(ns, "93gYZyqbSx02VU648xVvyKLMX571P593Dl33533K8276TOH1kI39", "3gYZyqbSx48xVvyx48xVPVvyx4Dl3x4D3K83xTOH1kI83x");
}

