import { NS } from '@ns'
import {ContractInfo, listContracts} from "@/metacontracts/libContracts";
import {
    extractCodeBlock,
    generateAdditionalPrompt,
    generatePrompt,
    getClaudeResponse, SolveStatus
} from "@/metacontracts/libFunctionWriter";
import {extractFunction, listFunctionNames} from "@/metacontracts/libFunctionHelper";

const CONTRACT_PORT = 19;
const SCRIPT_MAX_DURATION_MS = 60_000;
const MAX_ATTEMPTS = 5;

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    await solveAllContracts(ns);
}

async function solveAllContracts(ns: NS) {
    for (const c of listContracts(ns)) {
        if (c.contractType=="Compression III: LZ Compression") continue;
        await solveContract(ns, c);
        // @todo Only solving one at a time currently
        break;
    }
}

async function solveContract(ns: NS, contract: ContractInfo) {
    const filename = toSolverFileName(contract);

    if (! ns.fileExists(filename)) {
        await createInitialSolver(ns, contract);
    } else {
        ns.print(`Existing script to solve ${contract.contractType} is ${filename}`);
    }

    let answer = null;
    let solveStatus: SolveStatus = "Pending";

    const startTimeMs = new Date().getTime();
    const pid = ns.run(filename, 1, JSON.stringify(contract.data));

    ns.print(`Calling script - will loop for up to ${SCRIPT_MAX_DURATION_MS / 1000} seconds`);
    while (new Date().getTime() - startTimeMs < SCRIPT_MAX_DURATION_MS) {
        const emptyPort = "NULL PORT DATA";
        const portContents = ns.readPort(CONTRACT_PORT);
        if (portContents!=emptyPort) {
            answer = portContents;
            break;
        }
        await ns.asleep(100);
    }

    if (ns.isRunning(pid)) {
        ns.kill(pid);
    }
    if (answer == null) {
        ns.toast(`No answer reached for ${contract.filename}`, "error");
        solveStatus = "NoAnswer";
    } else {
        ns.print(`Hoping that answer for ${contract.filename} - ${contract.contractType} with data ${contract.data} is ${answer}`);
        const result = ns.codingcontract.attempt(answer, contract.filename, contract.server);
        const isSuccess = (result ?? "").length > 0;

        if (isSuccess) {
            ns.toast(`Solved '${contract.contractType}' contract: ${result}`, "success");
            ns.print("Successfully solved");
            solveStatus = "Correct";
            ns.exit();
        } else {
            solveStatus = "Incorrect";
            ns.toast(`Incorrect answer for ${contract.filename}`, "error");
            ns.print("Was incorrect answer");
        }
    }

    const previousAttempts = listFunctionNames(ns, filename).length;
    if (previousAttempts > MAX_ATTEMPTS) {
        ns.toast(`Too many previous attempts to solve this type of function  ${contract.contractType} - not creating another solver`);
    } else {
        ns.print(`There have only been ${previousAttempts} attempts to solve this type of function, so trying again`);
        // This will be run next time we call this script
        await createAdditionalSolver(ns, contract, previousAttempts, answer, solveStatus);
    }

}


async function createInitialSolver(ns: NS, contract: ContractInfo) {
    const filename = toSolverFileName(contract);
    const functionName = toSolverFunctionName(contract);
    const prompt = generatePrompt(contract, functionName);
    ns.toast("Calling LLM to generate function to solve "+contract.contractType);
    const response = await getClaudeResponse(prompt);
    const generatedCode = extractCodeBlock(response);
    const wrappedCode = delimitCode(functionName, generatedCode);
    const preambleCode = getPreambleScript();
    ns.write(filename, preambleCode + wrappedCode);
}

async function createAdditionalSolver(ns: NS, contract: ContractInfo, previousAttempts: number, previousAnswer: any, solveStatus: "Incorrect" | "NoAnswer") {
    const filename = toSolverFileName(contract);
    const functionName = toSolverFunctionName(contract, previousAttempts);

    const previousAttemptName = listFunctionNames(ns, filename).at(-1)!;
    const previousFunction = extractFunction(ns, filename, previousAttemptName);

    const prompt = generateAdditionalPrompt(contract, functionName, previousFunction, previousAnswer, solveStatus, previousAttempts);
    ns.tprint("Additional prompt is " + prompt);
    ns.toast("Calling LLM to generate additional function to solve "+contract.contractType);
    const response = await getClaudeResponse(prompt);
    const generatedCode = extractCodeBlock(response);
    const wrappedCode = delimitCode(functionName, generatedCode);
    ns.write(filename, wrappedCode, "a");
}


function toSolverFunctionName(contract: ContractInfo, previousAttempts = 0): string {
    return `solve${normalize(contract.contractType)}${previousAttempts + 1}`;
}

function toSolverFileName(contract: ContractInfo): string {
    return `/metacontracts/solve${normalize(contract.contractType)}.js`;
}

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents from accented characters
        .replace(/[^a-zA-Z0-9]/g, ''); // Remove all non-alphanumeric characters
}

function getPreambleScript(): string {
    const port = CONTRACT_PORT;
    return `
import {getAppropriateFunctionName, getData, reportSuccess} from "/metacontracts/libFunctionHelper.js";    

export async function main(ns) {
    const data = getData(ns);
    const fnToCall = getAppropriateFunctionName(ns);
    const result = eval(fnToCall + "(data)")
    reportSuccess(ns, result, ${port});
}

`;
}

// These delimiters are picked up by getAppropriateFunctionName in the preamble script
// This allows us to have multiple solve functions in one file, and append new functions without changing existing code
function delimitCode(functionName: string, code: string) {
    return `
// ~~~ START ${functionName}     
    
${code}

`;
}
