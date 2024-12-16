import { NS } from "@ns";
import { Dashboard } from "/react/components/Dashboard/Dashboard";
import {ReactDOM, React, domDocument} from "/react/libReact";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("asleep");
    ReactDOM.render(
        <React.StrictMode>
            <Dashboard ns={ns} />
        </React.StrictMode>,
        domDocument.getElementById("overview-extra-hook-1") // there are 3 empty elements provided for players to include their own ui under overview window named (.overview-extra-hook-0, ...-1 ,...-2).
    );

    // noinspection InfiniteLoopJS
    while (true) {
        await ns.asleep(1000);
    }
}