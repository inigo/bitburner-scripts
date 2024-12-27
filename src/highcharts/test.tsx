import {NS} from "@ns";
import {domDocument, domWindow, React} from "@/react/libReact";
import Highcharts from "@/highcharts/highcharts";

const { useState, useEffect } = React;

function MessageComponent({ns, chartId}: { ns: NS, chartId: string }) {
    const [message, setMessage] = useState("Click me");
    const [disabled, setDisabled] = useState(false);

    useEffect(() => {
        // Set up event listener when component mounts
        const handleClose = () => {
            setMessage("Closed");
            setDisabled(true);
        };
        domWindow.addEventListener(chartId, handleClose);

        // Clean up event listener when component unmounts
        return () => {
            domWindow.removeEventListener(chartId, handleClose);
        };
    }, [chartId]); // Add eventName to dependency array since we're using it in the effect

    return (
        <>
            <div id={ chartId } style={{"width": "100%", "height": "400px", "backgroundColor": "white", "border": "1px solid black", "padding": "10px"}}>
            </div>
        </>
    );
}

export async function main(ns: NS): Promise<void> {
    const chartId = `highchartgraph-close-${ns.pid}-${Date.now()}`;


    if ([... domDocument.querySelectorAll('script[src*="highcharts"]')].length === 0) {
        ns.tprint("Loading highcharts.js");
        const script = domDocument.createElement('script');
        script.src = "https://code.highcharts.com/highcharts.js";
        script.onload = () => console.log('Loaded highcharts.js');
        script.onerror = (e) => console.error('Failed to load highcharts.js:', e);
        domDocument.head.appendChild(script);
    }

    ns.print("Starting main function");
    // Initial render with unique event name
    ns.tprintRaw(<MessageComponent ns={ns} chartId={chartId} />);

    await ns.asleep(100);


    const chartInit = new Function(`
    
  Highcharts.chart('${chartId}', {
    chart: { type: 'bar' },
    title: { text: 'Fruit Consumption' },
    xAxis: { categories: ['Apples', 'Bananas', 'Oranges'] },
    yAxis: { title: { text: 'Fruit eaten' } },
    series: [{
        name: 'Jane',
        data: [1, 0, 4]
    }, {
        name: 'John',
        data: [5, 7, 3]
    }]
  });
`);
    chartInit();


    await ns.asleep(3000);

    const event = new Event(chartId);
    // Dispatch event to notify specific component
    ns.print("Dispatching close event");
    domWindow.dispatchEvent(event);
    await ns.asleep(500);

    // Show final message
    ns.print("Script is now finishing");
    // ns.tprintRaw(<div style={{color}}>Closed {ns.pid}</div>);
}
