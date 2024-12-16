import {NS} from "@ns";
import {React} from "react/libReact";
import {Button} from "/react/components/Button";

const { useState, useEffect } = React;

function doSomething(ns: NS) {
    // alert("Hello there gain "+ns.tprint);
    try {
        ns.tprint("Hello");
    } catch (error) {
        // This will throw a ScriptDeath once the "asleep" in the main function has timed out
        alert(error);
    }
}

export async function main(ns: NS): Promise<void> {

    const color = getColorFromNumber(ns.pid);
    const node = <div style={{ color }}>
        <span style={{ fontFamily: "Impact" }}>Hello world</span>
        <table border={1} cellPadding={10}>
            <tr>
                <td>This is a button:</td>
                <td><Button title="Click me" onButtonClick={() => doSomething(ns)} bg={"green"}  /></td>
            </tr>
        </table>
    </div>
    ns.tprintRaw(node);
    await ns.asleep(15000);
    ns.tprintRaw(<div style={{color}}>Closed {ns.pid}</div>);
}

function getColorFromNumber(number: number): string {
    const colors = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "cyan", "magenta"];
    return colors[number % 10];
}