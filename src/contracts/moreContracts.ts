import {NS} from "@ns";


export function solveVigenereCipher(ns: NS, data: string[]): string {
    const plainText = data[0];
    const keyword = data[1];
    const encryptionKey = (keyword.length < plainText.length) ? keyword.repeat(50).substring(0, plainText.length) : keyword;

    ns.print("Encrypting "+plainText+" with key "+encryptionKey);

    const answer = [];
    for (let i = 0; i < encryptionKey.length; i++) {
        const p = plainText.charCodeAt(i) - 65;
        const k = encryptionKey.charCodeAt(i) - 65;
        const e = String.fromCharCode(((p + k) % 26) + 65);
        answer.push(e);
    }
    return answer.join("");
}

export function solveLempelZiv(ns: NS, data: string): string {
    let result = '';
    let pos = 0;
    let isDirectCopy = true;

    while (pos < data.length) {
        // Get length digit
        const length = parseInt(data[pos]);
        pos++;

        // Length of 0 means skip to next chunk
        if (length === 0) {
            isDirectCopy = !isDirectCopy;
            continue;
        }

        if (isDirectCopy) {
            // Type 1: Direct copy of next L characters
            result += data.slice(pos, pos + length);
            pos += length;
        } else {
            // Type 2: Reference copy
            const offset = parseInt(data[pos]);
            pos++;

            // Copy L characters from offset positions back
            for (let i = 0; i < length; i++) {
                result += result[result.length - offset];
            }
        }

        isDirectCopy = !isDirectCopy;
    }

    return result;
}
