import {NS} from '@ns'
import {
    extractFunction,
    getAppropriateFunctionName,
    getData,
    listFunctionNames,
    reportSuccess
} from "@/metacontracts/libFunctionHelper";

export async function main(ns: NS): Promise<void> {
    const data = getData(ns);
    const fnToCall = getAppropriateFunctionName(ns);
    const result = eval(fnToCall+"(data)");
    reportSuccess(ns, result, 123123);

    // const functionBody = extractFunction(ns, ns.self().filename, "mySecondOne");
    // ns.tprint(functionBody);

    // const fns = listFunctionNames(ns, "metacontracts/solveCompressionIIILZCompression.js");
    // ns.tprint(fns.join(" and "));

    const functionNames = listFunctionNames(ns, "/metacontracts/solveUniquePathsinaGridI.js");
    ns.tprint(`Last function is '${functionNames.at(-1)}'`);

    const previousFn = extractFunction(ns, "/metacontracts/solveUniquePathsinaGridI.js", "solveUniquePathsinaGridI1");
    ns.tprint("Extracted function:")
    ns.tprint(previousFn);
}

const preventTypescriptCompilerFromRemovingComments1 = `
// ~~~ START myFirstOne
`;

function myFirstOne(data: any) {
    return "My first one! with "+data;
}

const preventTypescriptCompilerFromRemovingComments2 = `
// ~~~ START mySecondOne
`;

function mySecondOne(data: any) {
    return "My second one! with "+data;
}

