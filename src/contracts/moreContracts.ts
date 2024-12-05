import {NS} from "@ns";


export function solveVigenereCipher(ns: NS, data: string[]): string {
    const plainText = data[0];
    const keyword = data[1];
    const encryptionKey = (keyword.length < plainText.length) ? keyword.repeat(50).substring(0, plainText.length) : keyword;

    ns.tprint("Encrypting "+plainText+" with key "+encryptionKey);

    const answer = [];
    for (let i = 0; i < encryptionKey.length; i++) {
        const p = plainText.charCodeAt(i) - 65;
        const k = encryptionKey.charCodeAt(i) - 65;
        const e = String.fromCharCode(((p + k) % 26) + 65);
        answer.push(e);
    }
    return answer.join("");
}
