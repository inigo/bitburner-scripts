import {NS} from "@ns";
import {React} from "react/libReact";

export async function main(ns: NS): Promise<void> {
    const node = <div><span style={{ color: 'red', fontFamily: "Impact" }}>Hello</span> world</div>
    ns.tprintRaw(node);
}