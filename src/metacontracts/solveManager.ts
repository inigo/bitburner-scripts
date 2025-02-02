import { findAllServers } from "@/libServers";
import { NS } from '@ns'
import {ContractInfo, listContracts} from "@/metacontracts/libContracts";
import {extractCodeBlock, generatePrompt, getClaudeResponse} from "@/metacontracts/libFunctionWriter";

const CONTRACT_PORT = 19;

export async function main(ns: NS): Promise<void> {
    await solveAllContracts(ns);
}

async function solveAllContracts(ns: NS) {
    for (const c of listContracts(ns)) {
        await solveContract(ns, c);
        break;
    }
}

async function solveContract(ns: NS, contract: ContractInfo) {
    const filename = toSolverFileName(contract);

    if (! ns.fileExists(filename)) {
        const functionName = toSolverFunctionName(contract);
        const prompt = generatePrompt(contract, functionName);
        ns.toast("Calling LLM to generate function");
        const response = await getClaudeResponse(prompt);
        const generatedCode = extractCodeBlock(response);
        const preambleCode = getWrapperScript(functionName);
        // @todo Write clear code separators between functions, with a name, so it is easier to parse out
        ns.write(filename, preambleCode + generatedCode);
    }

    let answer = null;
    const startTimeMs = new Date().getTime();
    ns.run(filename, 1, JSON.stringify(contract.data));
    while (new Date().getTime() - startTimeMs < 60_000) {
        ns.print("Checking for results")
        const emptyPort = "NULL PORT DATA";
        const portContents = ns.readPort(CONTRACT_PORT);
        if (portContents!=emptyPort) {
            answer = portContents;
            break;
        }
        await ns.asleep(100);
    }

    // @todo If script is still running, kill it

    if (answer!=null) {
        ns.print(`Answer for ${contract.filename} - ${contract.contractType} with data ${contract.data} is ${answer}`);
        const result = ns.codingcontract.attempt(answer, contract.filename, contract.server);
        const isSuccess = (result ?? "").length > 0;

        if (isSuccess) {
            ns.toast(`Solved '${contract.contractType}' contract: ${result}`, "success");
        } else {
            ns.toast(`Incorrect answer for ${contract.filename}`, "error");
        }
    } else {
        ns.toast(`Could not solve ${contract.filename}`, "warning");
        // @todo Call LLM again, passing in the existing function, to get a better one
    }

}

function toSolverFunctionName(contract: ContractInfo): string {
    return `solve${normalize(contract.contractType)}`;
}

function toSolverFileName(contract: ContractInfo): string {
    return `/metacontracts/solve${normalize(contract.contractType)}.js`;
}

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents from accented characters
        .replace(/[^a-zA-Z0-9]/g, ''); // Remove all non-alphanumeric characters
}

function getWrapperScript(functionName: string): string {
    // @todo use eval, with a passed-in function name (or perhaps ns.read the script to find the function name)
    const port = CONTRACT_PORT;
    return `

export async function main(ns) {
    const dataArg = ns.args[0];
    const data = JSON.parse(dataArg);
    
    const result = ${functionName}(data);
    ns.toast("Solved with "+JSON.stringify(result));
    ns.writePort(${port}, result);
}

`;
}