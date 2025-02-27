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

export function solveCaesarCipher(ns: NS, data: any[]): string {
    const text = data[0];
    const shift = data[1];

    // Helper function to shift a single character
    function shiftChar(char: string): string {
        // If it's a space, return it unchanged
        if (char === ' ') return char;

        // Convert to ASCII code (A = 65, Z = 90)
        const code = char.charCodeAt(0);

        // Apply the shift with wrapping
        // We add 26 before the modulo to handle negative shifts
        const newCode = ((code - 65 - shift + 26) % 26) + 65;

        // Convert back to character
        return String.fromCharCode(newCode);
    }

    // Process each character in the input string
    return text
        .split('')
        .map(shiftChar)
        .join('');
}

export function solveTotalWaysToSum(ns: NS, data: [number, number[]]): number {
    // Extract target sum and available numbers from input
    const [target, numbers] = data;

    // Create DP array to store number of ways to make each sum
    const dp = new Array(target + 1).fill(0);
    dp[0] = 1; // Base case: one way to make sum of 0

    // For each available number
    for (const num of numbers) {
        // For each possible sum from num to target
        for (let sum = num; sum <= target; sum++) {
            // Add the number of ways to make (sum - num) to current sum
            dp[sum] += dp[sum - num];
        }
    }

    // Return the number of ways to make the target sum
    return dp[target];
}

export function solveTotalWaysToSumOne(ns: NS, data: number): number {
    const target = data;

    // Create DP array to store number of ways to make each sum
    // dp[i][j] represents ways to sum to i using at least j numbers
    const dp: number[][] = Array(target + 1).fill(0)
        .map(() => Array(target + 1).fill(0));

    // Base case: one way to make 0 with 0 numbers
    dp[0][0] = 1;

    // For each number we could use (1 to target-1)
    for (let num = 1; num < target; num++) {
        // For each possible sum from num to target
        for (let sum = num; sum <= target; sum++) {
            // For each count of numbers used
            for (let count = 1; count <= sum && count <= target; count++) {
                // Add ways to make (sum - num) using (count - 1) numbers
                dp[sum][count] += dp[sum - num][count - 1];
            }
        }
    }

    // Sum up all ways using 2 or more numbers
    let totalWays = 0;
    for (let count = 2; count <= target; count++) {
        totalWays += dp[target][count];
    }

    return totalWays;
}

/** DOES NOT WORK */
export function solveLzCompression(ns: NS, data: string): string {
    // Find all possible references at a position with a maximum recursion depth
    function findReferences(str: string, pos: number): [number, number][] {
        const refs: [number, number][] = [];
        const maxLen = Math.min(9, str.length - pos);

        for (let offset = 1; offset <= Math.min(9, pos); offset++) {
            let maxMatch = 0;
            for (let i = 0; i < maxLen; i++) {
                if (str[pos + i] === str[pos - offset + i]) {
                    maxMatch++;
                } else {
                    break;
                }
            }
            if (maxMatch > 0) {
                refs.push([maxMatch, offset]);
            }
        }
        return refs.sort((a, b) => b[0] - a[0]); // Sort by length descending
    }

    // Cache to store previous results
    const cache = new Map<string, string>();

    function compress(startPos: number, isLiteral: boolean, depth: number = 0): string {
        if (depth > 100) return ''; // Prevent deep recursion
        if (startPos === data.length) return '';

        const key = `${startPos},${isLiteral}`;
        if (cache.has(key)) return cache.get(key)!;

        let bestResult = '';
        let bestLen = Infinity;

        if (isLiteral) {
            // Try different literal lengths
            for (let len = 1; len <= Math.min(9, data.length - startPos); len++) {
                const chunk = len.toString() + data.substr(startPos, len);
                const rest = compress(startPos + len, false, depth + 1);
                if (chunk.length + rest.length < bestLen) {
                    bestLen = chunk.length + rest.length;
                    bestResult = chunk + rest;
                }
            }
        } else {
            // Try references
            const refs = findReferences(data, startPos);
            if (refs.length > 0) {
                for (const [len, offset] of refs) {
                    const chunk = len.toString() + offset.toString();
                    const rest = compress(startPos + len, true, depth + 1);
                    if (chunk.length + rest.length < bestLen) {
                        bestLen = chunk.length + rest.length;
                        bestResult = chunk + rest;
                    }
                }
            }
            // If no references work, switch back to literal
            if (!bestResult) {
                bestResult = compress(startPos, true, depth + 1);
            }
        }

        cache.set(key, bestResult);
        return bestResult;
    }

    // Try each possible initial literal length to find the shortest valid encoding
    let bestResult = '';
    let bestLen = Infinity;

    for (let firstLen = 1; firstLen <= Math.min(9, data.length); firstLen++) {
        const initialChunk = firstLen.toString() + data.substr(0, firstLen);
        const rest = compress(firstLen, false);
        const result = initialChunk + rest;
        if (result.length < bestLen) {
            bestLen = result.length;
            bestResult = result;
        }
    }

    return bestResult;
}


export function solveSquareRoot(ns: NS, dataAsNo: number): string {
    const data = dataAsNo.toString();
    if (!data.match(/^\d+$/)) throw new Error("Invalid input");
    if (data === "0" || data === "1") return data;

    let left = BigInt(1);
    let right = BigInt("1" + "0".repeat(Math.ceil(data.length / 2))); // Efficient initial upper bound

    while (left <= right) {
        const mid = (left + right) / BigInt(2);
        const square = mid * mid;
        const compare = square - BigInt(data);

        if (compare === BigInt(0)) {
            return mid.toString();
        }

        if (compare < BigInt(0)) {
            if ((mid + BigInt(1)) * (mid + BigInt(1)) > BigInt(data)) {
                return mid.toString();
            }
            left = mid + BigInt(1);
        } else {
            right = mid - BigInt(1);
        }
    }

    return right.toString();
}


export function solveShortestPathInGrid(ns: NS, data: number[][]): string {
    const rows = data.length, cols = data[0].length;
    if (!rows || !cols || data[0][0] === 1 || data[rows - 1][cols - 1] === 1) return '';
    const visited = Array.from({length: rows}, () => Array(cols).fill(false));
    visited[0][0] = true;
    const queue: [number, number, string][] = [[0, 0, '']];

    const directions: [number, number, string][] = [
        [1, 0, 'D'], [-1, 0, 'U'], [0, 1, 'R'], [0, -1, 'L']
    ];

    while (queue.length) {
        const [r, c, path] = queue.shift()!;
        if (r === rows - 1 && c === cols - 1) return path;
        for (const [dr, dc, dir] of directions) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && data[nr][nc] === 0) {
                visited[nr][nc] = true;
                queue.push([nr, nc, path + dir]);
            }
        }
    }
    return '';
}

export function solveTwoColoring(ns: NS, data: any): string {
    const [n, edges] = data;
    const adj: number[][] = Array.from({ length: n }, () => []);

    // Build adjacency list
    for (const [u, v] of edges) {
        adj[u].push(v);
        adj[v].push(u);
    }

    // -1 indicates uncolored
    const colors = Array(n).fill(-1);

    // Try coloring each connected component
    for (let start = 0; start < n; start++) {
        if (colors[start] === -1) {
            // BFS or DFS, here BFS
            colors[start] = 0;
            const queue = [start];

            while (queue.length) {
                const u = queue.shift()!;
                for (const v of adj[u]) {
                    if (colors[v] === -1) {
                        colors[v] = 1 - colors[u];
                        queue.push(v);
                    } else if (colors[v] === colors[u]) {
                        // Conflict
                        return '[]';
                    }
                }
            }
        }
    }

    return `[${colors.join(',')}]`;
}

export function totalWaysToSumOne(ns: NS, data: number): number {
    // Array to store the number of ways to make each sum
    const ways: number[] = new Array(data + 1).fill(0);
    ways[0] = 1;  // Base case: one way to make sum of 0 (empty sum)

    // For each number from 1 to n
    for (let i = 1; i < data; i++) {
        // For each sum from i to n
        for (let j = i; j <= data; j++) {
            ways[j] += ways[j - i];
        }
    }

    // Return the total number of ways minus 1 (to exclude the single number itself)
    return ways[data];
}

export function uniquePathsInGridII(ns: NS, data: number[][]): number {
    if (!data || data.length === 0 || data[0].length === 0) return 0;

    const rows = data.length;
    const cols = data[0].length;

    // If start or end point is blocked, return 0
    if (data[0][0] === 1 || data[rows-1][cols-1] === 1) return 0;

    // Initialize dp array with 0s
    const dp: number[][] = Array(rows).fill(0)
        .map(() => Array(cols).fill(0));

    // Initialize first position
    dp[0][0] = 1;

    // Initialize first row
    for (let j = 1; j < cols; j++) {
        if (data[0][j] === 0) {
            dp[0][j] = dp[0][j-1];
        }
    }

    // Initialize first column
    for (let i = 1; i < rows; i++) {
        if (data[i][0] === 0) {
            dp[i][0] = dp[i-1][0];
        }
    }

    // Fill dp array
    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            if (data[i][j] === 0) {
                dp[i][j] = dp[i-1][j] + dp[i][j-1];
            }
        }
    }

    return dp[rows-1][cols-1];
}

export function encodedBinaryToInteger(ns: NS, data: string): number {
    // Convert string to array of bits
    const bits = data.split('').map(Number);
    const len = bits.length;

    // Check all parity bits
    let errorPosition = 0;
    let position = 1;
    while (position < len) {
        let parity = 0;
        for (let i = position; i < len; i++) {
            if ((i & position) !== 0) {
                parity ^= bits[i];
            }
        }
        if (parity !== 0) {
            errorPosition += position;
        }
        position <<= 1;
    }

    // Check overall parity
    let totalParity = 0;
    for (let i = 0; i < len; i++) {
        totalParity ^= bits[i];
    }

    // If error detected, correct it
    if (errorPosition !== 0 || totalParity !== 0) {
        if (errorPosition < len) {
            bits[errorPosition] ^= 1;  // Flip the erroneous bit
        }
    }

    // Extract data bits (skip parity bits)
    let result = 0;

    for (let i = 1; i < len; i++) {
        if ((i & (i - 1)) !== 0) {  // If i is not a power of 2
            result = (result << 1) | bits[i];
        }
    }

    return result;
}