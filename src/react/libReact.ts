
export const domWindow = eval("window") as Window & typeof globalThis;
export const domDocument = eval("document") as Document & typeof globalThis;

// These constants are put there by Bitburner - not usually present in window
export const React = domWindow.React;
export const ReactDOM = domWindow.ReactDOM;