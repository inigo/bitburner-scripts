/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { listContracts } from "@/contracts/libContracts";
import { NS } from '@ns'
import {
	solveArrayJumpingII,
	solveCaesarCipher,
	solveHammingCode,
	solveLempelZiv,
	solveLzCompression,
	solveRleCompression,
	solveTotalWaysToSum,
	solveVigenereCipher,
	solveSquareRoot
} from "@/contracts/moreContracts";

export async function main(ns: NS): Promise<void> {
	solveAllContracts(ns);
}

function solveAllContracts(ns:NS) {
	for (const c of listContracts(ns)) {
		const contract = new Contract(c.filename, c.server, c.contractType, c.data);
		solveContract(ns, contract);
	}
}

class Contract { 
   constructor(readonly filename: string, readonly server: string, readonly contractType: string, readonly inputData: any[]) { 
   } 
}

export function solveContract(ns: NS, contract: Contract): void {
	const solutions = new Map([   
		["Find Largest Prime Factor", (input: number) => solveFindLargestPrimeFactor(ns, input)]
		, ["Merge Overlapping Intervals", (input: number[]) => solveMergeOverlappingIntervals(ns, input)]
		, ["Array Jumping Game", (input: number[]) => solveArrayJumpingGame(ns, input)]
		, ["Subarray with Maximum Sum", (input: number[]) => solveSubarrayWithMaximumSum(ns, input)]
		, ["Unique Paths in a Grid I", (input: number[]) => solveUniquePathsInAGridI(ns, input)]
		, ["Sanitize Parentheses in Expression", (input: string) => solveSanitizeParenthesesInExpression(ns, input)]
		, ["Generate IP Addresses", (input: string) => solveGenerateIpAddresses(ns, input)]
		, ["Spiralize Matrix", (input: number[][]) => solveSpiralizeMatrix(ns, input)]
		, ["Minimum Path Sum in a Triangle", (input: number[][]) => solveMinimumPathSumTriangle(ns, input)]
		, ["Find All Valid Math Expressions", (input: number[]) => solveFindAllValidMathExpressions(ns, input)]
		, ["Encryption II: Vigenère Cipher", (input: string[]) => solveVigenereCipher(ns, input)]
		, ["Compression II: LZ Decompression", (input: string) => solveLempelZiv(ns, input)]
		, ["Array Jumping Game II", (input: number[]) => solveArrayJumpingII(ns, input)]
		, ["HammingCodes: Integer to Encoded Binary", (input: string) => solveHammingCode(ns, input)]
		, ["Compression I: RLE Compression", (input: string) => solveRleCompression(ns, input)]
		, ["Encryption I: Caesar Cipher", (input: any[]) => solveCaesarCipher(ns, input)]
		, ["Compression III: LZ Compression", (input: any[]) => solveLzCompression(ns, input)]
		, ["Total Ways to Sum II", (input: [number, number[]]) => solveTotalWaysToSum(ns, input)]
		, ["Total Ways to Sum", (input: number) => solveTotalWaysToSumOne(ns, input)]
		, ["Square Root", (input: string) => solveSquareRoot(ns, input)]

		, ["Algorithmic Stock Trader I", (input: number[]) => solveAlgorithmicStockTrader(ns, input, 1) ]
		, ["Algorithmic Stock Trader II", (input: number[]) => solveAlgorithmicStockTrader(ns, input, 20) ]
		, ["Algorithmic Stock Trader III", (input: number[]) => solveAlgorithmicStockTrader(ns, input, 2) ]
		, ["Algorithmic Stock Trader IV", (input: number[][]) => solveAlgorithmicStockTrader(ns, input[1], input[0]) ]
	]);  

	if (solutions.has(contract.contractType)) {
		ns.print("Attempting contract "+contract.filename+" of type "+contract.contractType);
		const answer = solutions.get(contract.contractType)(contract.inputData);
		if (answer!=null) {
			ns.print("Answer for "+contract.filename+" - "+contract.contractType+" with data "+contract.inputData+" is "+answer);
			const result = ns.codingcontract.attempt(answer, contract.filename, contract.server, { returnReward: true });
			const isSuccess = (result ?? "").length > 0;

			if (isSuccess) {
				ns.toast("Solved '"+contract.contractType+"' contract: "+result, "success");
			} else {
				ns.toast("Incorrect answer for "+contract.filename, "error");
			}
		} else {
			ns.toast("Could not solve "+contract.filename, "warning");	
		}
	} else {
		ns.print("No solutions for contract "+contract.filename, "warning");
	}
}

function solveFindAllValidMathExpressions(ns: NS, data: number[]) {
	// Convert a string like 3*10+12*5-4-1+4 into the correct value
	function evaluateExpression(s: string): number {
		let answer = s;
		while (answer.includes("*")) {
			answer = answer.replace(/(\d+)\*(\d+)/, (_, a, b) => (parseInt(a) * parseInt(b)));
		}
		// Test for negative is more complicated because of negative numbers
		while (answer.includes("+") || /\d+\-\d+/.test(answer)) {
			// We need a non-capturing group for a leading -, because of negative numbers
			answer = answer.replace(/^((?:-)?\d+)([\+-])(\d+)/, (_, a, op, b) => (op=="+") ? parseInt(a) + parseInt(b) : parseInt(a) - parseInt(b) );
		}
		return parseInt(answer);
	}

	const operators = ["+", "-", "*", ""];
	function createCandidates(s: string): string[] {
		if (s.length==1) return [s];
		return operators.flatMap(o => createCandidates(s.substring(1)).map(c => s.at(0) + o + c));
	}

	function hasLeadingZero(s: string): boolean {
		return /[^\d]0\d+/.test(s);
	}

	const [sourceNumber, target] = data;
	const candidates = createCandidates(sourceNumber);
	return candidates
			.filter(s => !hasLeadingZero(s))
			.filter(c => evaluateExpression(c)==target);
}


function solveMinimumPathSumTriangle(ns: NS, data: number[][]) {
	const rows = data.length;
	const results = [];
	// Each route is a series of binary decisions about left or right, so use bitwise AND to decide which route to take
	for (const route of range(0, 2**(rows-1))) {
		let currentPosition = 0;
		let runningTotal = 0;
		for (const row of range(0, rows)) {
			runningTotal += data.at(row).at(currentPosition);
			const addition = (((2 ** row) & route) == (2**row)) ? 1 : 0;
			currentPosition += addition;
		}
		results.push(runningTotal);
	}
	return Math.min(...results);
}

function solveGenerateIpAddresses(ns: NS, data: number[]) {
	const isValidFn = (val: string) => {
		const parts = val.split("\\.");
		if (parts.length!=4) return false;
		if (parts.some(s => s.length==0)) return false;
		if (parts.some(s => s.startsWith("0") && s!="0")) return false;
		if (parts.map(s => parseInt(s)).some(s => s<0 || s>255)) return false;
		return true;
	}
	function* createCandidates(val: string): Generator<string, void, unknown> {
		for (let i=1; i<=3; i++) {
			for (let j=1; j<=3; j++) {
				for (let k=1; k<=3; k++) {
					yield val.substring(0,i)+"."+
							val.substring(i, i+j)+"."+
							val.substring(i+j, i+j+k)+"."+
							val.substring(i+j+k);
				}
			}
		}
	}

	const candidates = [... createCandidates(data) ];
	return [... new Set(candidates.filter(isValidFn)) ];
}


function solveSanitizeParenthesesInExpression(ns: NS, data: string) {
	const simpleSanitize = (s: string) => s.replace(/^\)+/, "").replace(/\(+$/,"")
	const isValidFn = (val: string) => {
		let openBrackets = 0;
		for(const s of val) {
			if (s=="(") openBrackets++;
			if (s==")") openBrackets--;
			if (openBrackets<0) return false;
		}
		return openBrackets==0;
	}
	const createPermutations = (val: string): string[] => {
		const firstBracketPos = val.search(/[\(\)]/);
		if (firstBracketPos==-1) { return [val]; }
		const beforeFirstBracket = val.substring(0, firstBracketPos);
		const includingFirstBracket = val.substring(0, firstBracketPos+1);
		const afterFirstBracket = val.substring(firstBracketPos+1);
		return createPermutations(afterFirstBracket).flatMap(s => [ beforeFirstBracket+s, includingFirstBracket + s ]);
	}

	const text = simpleSanitize(data);
	const candidates: string[] = createPermutations(text).filter(isValidFn);
	const longestCandidate = candidates.sort((a,b) => a.length - b.length).reverse().at(0)?.length;
	const filteredCandidates = candidates.filter(s => s.length==longestCandidate);
	return [...new Set(filteredCandidates)];
}

function solveUniquePathsInAGridI(ns: NS, data: number[]) {
	const [rows, cols] = data;
	return [...range(0, cols-1)].map(i => rows+i).reduce((a,b) => a*b) / factorial(cols-1);
}

function factorial(i: number) {
	return i === 0 ? 1 : i * factorial(i-1);
}

function solveSubarrayWithMaximumSum(ns: NS, data: number[]) {
	return Math.max(... data.flatMap( (_, i) => [...range(0, data.length)].map( j => data.slice(i,j+1).reduce((a,b) => a+b, 0) )));
}

function solveMergeOverlappingIntervals(ns: NS, data: number[][]) {
	const sortedIntervals = data.sort((a, b) => a[0] - b[0]);

	const vals = a => [... range(a[0], a[1]+1)];
	const intersection = (arr1: number[], arr2: number[]) => arr1.filter(x => arr2.includes(x));
	const isOverlapping = (ivlA: number[], ivlB: number[]) => intersection(vals(ivlA), vals(ivlB)).length > 0;
	
	const merge = function(ivl: number[], allItems: number[]): number[][] {
		const overlaps = allItems.filter(otherIvl => isOverlapping(ivl, otherIvl));

		if (overlaps.length > 1) {
			const endValues = overlaps.flatMap(a => [a[0], a[1]]);
			const mergedEntry = [ Math.min(... endValues), Math.max(... endValues) ];
			return allItems.filter(a => !overlaps.includes(a)).concat([mergedEntry]);
		}
		return [];
	}

	let merged: number[][] = sortedIntervals;
	let stillChanging = true;
	while (stillChanging) {
		stillChanging = false;
		for (const ivl of merged) {
			const mergeResults = merge(ivl, merged);
			if (mergeResults.length>0) {
				merged = mergeResults;
				stillChanging = true;
				break;
			}
		}
	}

	return merged.sort((a, b) => a[0] - b[0]);
}

function solveFindLargestPrimeFactor(ns: NS, data: number) {
	// From SO: https://stackoverflow.com/a/36360681
	const largestPrimeFactor = function(val: number, divisor = 2): number { 
		const square = (val: number) => Math.pow(val, 2);
		while ((val % divisor) != 0 && square(divisor) <= val) {
			divisor++;
		}
		return square(divisor) <= val ? largestPrimeFactor(val / divisor, divisor) : val;
	}
	return largestPrimeFactor(data);
}

function solveArrayJumpingGame(ns: NS, data: number[]) {
	let currentPosition = 0;
	while (currentPosition < data.length) {		
		const jumpLength = data.at(currentPosition)!;
		if ((currentPosition + jumpLength) > data.length) return 1;
		if (jumpLength==0) return 0;

		const jumpOptions = data.slice(currentPosition+1, currentPosition+jumpLength+1);
		const distances = jumpOptions.map((o, i) => o - (jumpOptions.length-i));
		const bestDistance = Math.max(... distances);
		const positionOfBestDistance = distances.indexOf(bestDistance);
		currentPosition += positionOfBestDistance + 1;
	}
	return 1;
}

function solveSpiralizeMatrix(ns: NS, data: number[][]) {
	const directions = ["right", "down", "left", "up"];

	let answer: number[] = [];
	const input = data;
	let direction = "right";

	let loop = 0;

	while (input.flat().length>0) {
		if (direction==="right") {
			const row = input.shift();
			answer = answer.concat(row);
		} else if (direction=="down") {
			input.forEach(row => answer.push(row.pop()!));
		} else if (direction=="left") {
			const row = input.pop()!;
			answer = answer.concat(row.reverse());
		} else if (direction=="up") {
			// ES6 arrays don't have reverse iterators
			for (let i = input.length-1; i>=0; i--) {
				const row = input[i]!;
				answer.push(row.shift()!);
			}
		}
		
		direction = directions.at( (directions.indexOf(direction) + 1) % 4)!;
		if (loop++ > 1000) {  ns.tprint("Loop"); ns.exit(); }
	}
	return answer;
}

function splitArray(ns: NS, arr: number[], fn = (curr: number, prev: number) => curr > prev) {
	const splits = [ ];
	for (let i = 0; i<arr.length; i++) {
		const curr = arr[i];
		const prev = arr[i-1];

		if (fn(curr, prev)) {
			splits.at(-1)!.push( curr );
		} else {
			splits.push( [curr] );
		}
	}
	return splits;
}

function solveAlgorithmicStockTrader(ns: NS, data: number[], maxCount = 2) {

	const findOffsets = (arrOfArrays: number[][]) => arrOfArrays.reduce((acc, curr) => acc.concat(curr.length + acc.at(-1)!), [0]);

	const startingPlaces = splitArray(ns, data, (curr, prev) => curr > prev);
	const startingPos = findOffsets(startingPlaces);

	const endingPlaces = splitArray(ns, data, (curr, prev) => curr < prev);
	const endingPos = findOffsets(endingPlaces); 

	const findSolutions = function*(count = 0, limitStart = -1, incValue = 0): Generator<AlgorithmicStockTradeSolution, void, unknown> {
		for (const start of startingPos.filter(p => p > limitStart)) {
			for (const end of endingPos.filter(p => p > start)) {
				const value = data.at(end)! - data.at(start)!;
				if (value > 0) {
					const response = { value : value + incValue, finishedAt: end, count: count };
					yield response;
				}
			}
		}
	}
	const filterPoorSolutions = (curr: AlgorithmicStockTradeSolution, i: number, arr: AlgorithmicStockTradeSolution[]) => ! arr.some(other => other.value > curr.value && other.finishedAt <= curr.finishedAt);

	const initialSolutions = [ ... findSolutions(0, -1) ].filter(filterPoorSolutions);
	let solutions = initialSolutions;
	ns.print(ns.sprintf("Solutions : %j", solutions));
	if (maxCount > 1) {
		for (let count = 1; count < maxCount; count++) {
			const newSolutions = solutions.filter(s => s.count==count-1)
					.flatMap(s => [... findSolutions(count, s.finishedAt, s.value)] )
					.filter(filterPoorSolutions);
			solutions = solutions.concat(newSolutions);
		}
		ns.print(ns.sprintf("Solutions : %j", solutions));
	}
	const maxValue = Math.max( ... solutions.map(s => s.value) );
	if (maxValue < 0) return 0;
	return maxValue;
}

type AlgorithmicStockTradeSolution = { value: number, finishedAt: number, count: number };

function* range(begin: number, end: number, interval = 1) {
    for (let i = begin; i < end; i += interval) {
        yield i;
    }
}