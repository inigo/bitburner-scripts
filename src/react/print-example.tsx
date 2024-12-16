import {NS} from "@ns";
import {domWindow, React} from "react/libReact";
import {Button} from "/react/components/Button";

const { useState, useEffect } = React;

function MessageComponent({ns, eventName, txtColor}: { ns: NS, eventName: string, txtColor: string }) {
    const [message, setMessage] = useState("Click me");
    const [disabled, setDisabled] = useState(false);

    useEffect(() => {
        // Set up event listener when component mounts
        const handleClose = () => {
            setMessage("Closed");
            setDisabled(true);
        };
        domWindow.addEventListener(eventName, handleClose);

        // Clean up event listener when component unmounts
        return () => {
            domWindow.removeEventListener(eventName, handleClose);
        };
    }, [eventName]); // Add eventName to dependency array since we're using it in the effect

    const color = txtColor || "black";
    return (
        <div style={{color}}>
            <span style={{fontFamily: "Impact"}}>Hello world</span>
            <table border={1} cellPadding={10}>
                <tr>
                    <td>This is a button:</td>
                    <td><Button title={message}  onButtonClick={() => doSomething(ns)} bg={"green"} disabled={disabled}/></td>
                </tr>
            </table>
        </div>
    );
}

function doSomething(ns: NS) {
    try {
        ns.tprint("Hello");
    } catch (error) {
        alert(error);
    }
}

export async function main(ns: NS): Promise<void> {
    const color = getColorFromNumber(ns.pid);
    const eventName = `component-close-${ns.pid}-${Date.now()}`;

    ns.print("Starting main function");
    // Initial render with unique event name
    ns.tprintRaw(<MessageComponent ns={ns} eventName={eventName} txtColor={color} />);

    await ns.asleep(3000);

    const event = new Event(eventName);
    // Dispatch event to notify specific component
    ns.print("Dispatching close event");
    domWindow.dispatchEvent(event);
    await ns.asleep(500);

    // Show final message
    ns.print("Script is now finishing");
    // ns.tprintRaw(<div style={{color}}>Closed {ns.pid}</div>);
}

function getColorFromNumber(number: number): string {
    const colors = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "cyan", "magenta"];
    return colors[number % 10];
}