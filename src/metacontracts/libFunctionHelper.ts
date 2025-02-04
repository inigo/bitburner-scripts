/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-non-null-assertion */
import {NS} from '@ns'

const functionBoundaryString = "// ~~~ START";

export function getData(ns: NS): any {
    const dataArg = ns.args[0].toString();
    return JSON.parse(dataArg);
}

export function getAppropriateFunctionName(ns: NS): string {
    const functionNames = listFunctionNames(ns);
    return functionNames.at(-1)!;
}

// Find functions, assuming that there is a distinctive string advertising each one
// Be aware that the TypeScript compiler strips out comments
export function listFunctionNames(ns: NS, providedFilename?: string): string[] {
    const fileName = providedFilename ? providedFilename : ns.self().filename;
    const currentScript = ns.read(fileName);
    return currentScript.split(/[\n\r]+/)
        .filter(s => s.startsWith(functionBoundaryString))
        .map(s => s.replace(functionBoundaryString, "").trim());
}

export function extractFunction(ns: NS, filename: string, functionName: string): string {
    const script = ns.read(filename);

    const sections = script.split(functionBoundaryString);
    const targetSection = sections.find(s => s.trim().startsWith(functionName));
    return targetSection?.trim().substring(functionName.length).trim() ?? '';
}

export function reportSuccess(ns: NS, result: any, port: number): void {
    ns.toast("Solved with "+JSON.stringify(result));
    ns.writePort(port, result);
}