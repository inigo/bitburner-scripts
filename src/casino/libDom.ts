/* eslint-disable @typescript-eslint/no-non-null-assertion */

export function getDocument(): Document {
    return eval("document");
}

export function selectSidebarOption(doc: Document, name: string): void {
	const path = `//*[@role='button' and contains(.,'${name}')]`;
	evaluateXpath(doc, path).click();
}

export function goToLocationInCity(doc: Document, name: string): void {
    evaluateCss(doc, `*[aria-label='${name}']`).click();
}

export function clickButton(doc: Document, text: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const button: any = evaluateXpath(doc, `//*[@type='button' and contains(., '${text}')]`);
    if (button) { 
        button[Object.keys(button)[1]].onClick({ isTrusted : true }); 
        button.click();
    }
}

export function evaluateCss(doc: Document, selector: string): HTMLElement {
	return doc.querySelector(selector) as HTMLElement;
}

export function evaluateXpath(doc: Document, xpath: string): HTMLElement {
	return doc.evaluate(xpath, getDocument().getElementById("root") as Node, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
}

export function setValue(input: HTMLElement, value: string): void {
    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setNativeValue(element: HTMLElement, value: string): void {
    const valueSetter = (Object.getOwnPropertyDescriptor(element, 'value') as PropertyDescriptor).set !;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = (Object.getOwnPropertyDescriptor(prototype, 'value') as PropertyDescriptor).set !;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    } else {
        valueSetter.call(element, value);
    }
}