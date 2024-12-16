import { NS } from "@ns";
import { Button } from "react/components/Button";
import { MonitorInput } from "react/components/Dashboard/MonitorInput";
import { ToggleSection } from "react/components/Dashboard/ToggleSection";

import {React} from "/react/libReact";


export interface IDashboardProps {
    ns: NS;
}
export const Dashboard = ({ ns }: IDashboardProps) => {
    const killAllClicked = async () => {
        alert("Killing stuff");
    };

    const runClicked = async () => {
        alert("Running stuff");
    };
    return (
        <div
            style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexGrow: 1,
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                }}
            >
                <Button
                    bg="red"
                    title="Launch"
                    onButtonClick={killAllClicked}
                />
                <Button
                    bg="green"
                    title="Change"
                    onButtonClick={runClicked}
                />
            </div>
            <MonitorInput ns={ns} />
            <ToggleSection ns={ns} />
        </div>
    );
};
