import {ContractInfo} from "@/metacontracts/libContracts";
import {anthropicApiKey} from "@/metacontracts/apiKey";

export function generatePrompt(contract: ContractInfo, functionName: string): string {

    const p = `
You are tasked with writing a JavaScript function to solve this problem, 
called ${contract.contractType}:

----

${contract.description}

----

The initial arguments that the function must work for are:

${JSON.stringify(contract.data)}

The function should have this signature:

function ${functionName}(data) 

Your task is to implement the function that solves this problem. Follow these guidelines:

1. The function should work for the given initial input and any other valid input.
2. Implement an efficient algorithm to solve the problem. 
3. The function should return a single value.
4. Do not use any external libraries.
5. You may use internal functions if needed, but the main function should be a single function as specified in the signature.
6. Prioritize accuracy and readability over extreme optimization, but still aim for efficiency, especially for large inputs.
7. Use clear and descriptive variable names.
8. Avoid unnecessary comments, but include a brief comment at the beginning of the function describing your approach.

Write your complete function implementation, including the explanation comment, inside <code> tags. 
Ensure that your function works correctly for the given initial value and would work for other valid inputs as well.

Do not return any other text apart from the function implementation.
    `;
    return p;
}

export function generateAdditionalPrompt(contract: ContractInfo, functionName: string, previousFunction: string, previousAnswer: any, solveStatus: SolveStatus, previousAttempts: number): string {

    const originalPrompt = generatePrompt(contract, functionName);

    const previousFailureReason = toFailureText(solveStatus, previousAnswer);
    const retryText = (previousAttempts % 3 == 0) ?
        "Definitely do not use the same approach as this function. You must try a completely different way of solving the problem." :
        "Bear in mind that this function was not a success. You may be able to build on it to get a better answer, but it may be a good idea to try a different approach."

    const newPrompt = `

${originalPrompt}

The previous attempt at implementing this function was a failure. 

${previousFailureReason}

The previous function that failed was:

---

${previousFunction}

---

${retryText}

    `;
    return newPrompt;
}

function toFailureText(solveStatus: SolveStatus, previousAnswer: any) {
    if (solveStatus == "Incorrect") {
        return "It gave an incorrect answer of "+previousAnswer?.toString()+".";
    } else if (solveStatus == "NoAnswer") {
        return "It did not give a correct answer quickly enough. Please write a version that is more efficient.";
    } else {
        return "";
    }
}



/**
 * Before this will work, you must create a file apiKey.ts containing:
 * `export const anthropicApiKey = "YOUR_CLAUDE_API_KEY";`
 *
 */
export async function getClaudeResponse(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': `${anthropicApiKey}`,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'user', content: [ { "type": "text", "text" : prompt }] }],
            max_tokens: 8192,
            temperature: 1
        })
    });

    if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

export function extractCodeBlock(text: string): string {
    const match = text.match(/<code>([\s\S]*?)<\/code>/);
    return match ? match[1].trim() : '';
}

export type SolveStatus = 'Pending' | 'NoAnswer' | 'Correct' | 'Incorrect';




async function main() {
    const description = "Given the following integer array, find the contiguous subarray (containing at least one number) which has the largest sum and return that sum. 'Sum' refers to the sum of all the numbers in the subarray.";
    const prompt = generatePrompt({ contractType: "Sub Array With Maximum Sum", description: description, data: [7,-2,-9,-5,-8,-4], server: "localhost", filename: "testContract.cct" }, "solveSubArrayWithMaximumSum");
    console.log(prompt);
    const response = await getClaudeResponse(prompt);
    console.log(response);
    const code = extractCodeBlock(response);
    console.log("-----\n"+code);
}

// main().catch(console.error);