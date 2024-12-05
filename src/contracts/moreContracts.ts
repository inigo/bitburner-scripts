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

export function solveArrayJumpingII(ns: NS, nums: number[]): number {
    if (nums.length === 1) return 1;

    const n = nums.length;
    const dp = new Array(n).fill(Infinity);
    dp[0] = 0;

    for (let i = 0; i < n - 1; i++) {
        const maxJump = nums[i];
        for (let j = 1; j <= maxJump && i + j < n; j++) {
            dp[i + j] = Math.min(dp[i + j], dp[i] + 1);
        }
    }

    return dp[n - 1] === Infinity ? 0 : dp[n - 1];
}

export function solveHammingCode(ns: NS, data: string): string {
    // Convert decimal string to binary string without leading zeros
    const decimalNum = BigInt(data);
    const binaryStr = decimalNum.toString(2);

    // Calculate how many parity bits we need (including position 0)
    // For position 2^r, we need r where 2^r >= m + r + 1
    // where m is the length of the data
    let r = 1;
    while (Math.pow(2, r) < binaryStr.length + r + 1) {
        r++;
    }

    // Create array for final code (including all parity positions)
    const codeLength = binaryStr.length + r + 1;
    const code = new Array(codeLength).fill('0');

    // Insert data bits, skipping power-of-2 positions (which are for parity)
    let dataIndex = 0;
    for (let i = 1; i < codeLength; i++) {
        // If i is not a power of 2, it's a data position
        if ((i & (i - 1)) !== 0) {
            code[i] = binaryStr[dataIndex];
            dataIndex++;
        }
    }

    // Calculate parity bits (except position 0)
    for (let pow = 0; pow < r; pow++) {
        const parityPos = Math.pow(2, pow);
        let sum = 0;

        // Check bits according to Hamming code rule
        for (let i = parityPos; i < codeLength; i++) {
            // If the bit position has this power of 2 in its binary representation
            if ((i & parityPos) !== 0) {
                sum += parseInt(code[i]);
            }
        }

        // Set parity bit to make sum even
        code[parityPos] = (sum % 2).toString();
    }

    // Calculate overall parity (position 0)
    let totalSum = 0;
    for (let i = 1; i < codeLength; i++) {
        totalSum += parseInt(code[i]);
    }
    code[0] = (totalSum % 2).toString();

    return code.join('');
}

export function solveRleCompression(ns: NS, data: string): string {
    if (!data) return '';

    let result = '';
    let currentChar = data[0];
    let count = 1;

    for (let i = 1; i <= data.length; i++) {
        // If we're at the same character and count < 9, increment count
        if (i < data.length && data[i] === currentChar && count < 9) {
            count++;
        } else {
            // Add the current run to result and reset
            result += count.toString() + currentChar;
            if (i < data.length) {
                currentChar = data[i];
                count = 1;
            }
        }
    }

    return result;
}