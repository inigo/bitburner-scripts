import { NS } from '@ns'
import {solveArrayJumpingII, solveHammingCode, solveLempelZiv, solveLzCompression, solveRleCompression, solveVigenereCipher} from "@/contracts/moreContracts";

export async function main(ns: NS): Promise<void> {
    // testVigenereCipher(ns);
    // testLempelZiv(ns);
    // testArrayJumpingII(ns);
    // testHammingCode(ns);
    // testRleCompression(ns);
    testLzCompression(ns);
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



export function testArrayJumpingII(ns: NS): void {
    function checkAnswer(ns: NS, data: number[], correctAnswer: number) {
        const answer = solveArrayJumpingII(ns, data);
        if (answer === correctAnswer) {
            ns.tprint("Correct answer for "+data+" was '"+answer+"'");
        } else {
            ns.tprint("Incorrect answer for "+data+" was '"+answer+"' but expected '"+correctAnswer+"'");
        }
    }

    // checkAnswer(ns, "", "");
    // checkAnswer(ns, "2ab", "ab");
    // checkAnswer(ns, "5aaabb450723abb", "aaabbaaababababaabb");
    checkAnswer(ns, [3,5,1,4,0,1,2,2,0], 3);
}


export function testHammingCode(ns: NS): void {
    function checkAnswer(ns: NS, data: string, correctAnswer: string) {
        const answer = solveHammingCode(ns, data);
        if (answer === correctAnswer) {
            ns.tprint("Correct answer for "+data+" was '"+answer+"'");
        } else {
            ns.tprint("Incorrect answer for "+data+" was '"+answer+"' but expected '"+correctAnswer+"'");
        }
    }

    checkAnswer(ns, "8", "11110000");
    checkAnswer(ns, "21", "1001101011");
    checkAnswer(ns, "391237518164", "1001001110110001001111001001011010001101010100");
}


export function testRleCompression(ns: NS): void {
    function checkAnswer(ns: NS, data: string, correctAnswer: string) {
        const answer = solveRleCompression(ns, data);
        if (answer === correctAnswer) {
            ns.tprint("Correct answer for "+data+" was '"+answer+"'");
        } else {
            ns.tprint("Incorrect answer for "+data+" was '"+answer+"' but expected '"+correctAnswer+"'");
        }
    }

    checkAnswer(ns, "aaaaabccc", "5a1b3c");
    checkAnswer(ns, "aAaAaA", "1a1A1a1A1a1A");
    checkAnswer(ns, "111112333", "511233");
    checkAnswer(ns, "zzzzzzzzzzzzzzzzzzz", "9z9z1z");
}


export function testLzCompression(ns: NS): void {
    function checkAnswer(ns: NS, data: string, correctAnswer: string) {
        const answer = solveLzCompression(ns, data);
        if (answer === correctAnswer) {
            ns.tprint("Correct answer for "+data+" was '"+answer+"'");
        } else {
            ns.tprint("Incorrect answer for "+data+" was '"+answer+"' but expected '"+correctAnswer+"'");
        }
    }

    checkAnswer(ns, "abracadabra", "7abracad47");
    checkAnswer(ns, "mississippi", "4miss433ppi");
    checkAnswer(ns, "aAAaAAaAaAA", "3aAA53035");
    checkAnswer(ns, "2718281828", "627182844");
    checkAnswer(ns, "abcdefghijk", "9abcdefghi02jk");
    checkAnswer(ns, "2718281828", "627182844");
    checkAnswer(ns, "aaaaaaaaaaaa", "3aaa91");
    checkAnswer(ns, "aaaaaaaaaaaaa", "1a91031");
    checkAnswer(ns, "aaaaaaaaaaaaaa", "1a91041");
}