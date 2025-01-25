/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {domDocument, domWindow, React, ReactDOM} from "@/react/libReact";
import {MoneySource, NS} from "@ns";
import {analyzeBitNode} from "@/reporting/parseLogs";

const { useEffect } = React;

function ChartHolder({ns, chartId, eventName}: { ns: NS, chartId: string, eventName: string }) {
    return (
        <>
            <div id={ chartId } style={{"position": "absolute", "border": "solid 2px green",
                "width": "1400px", "height": "1400px", "backgroundColor": "lightgray",
                "padding": "10px", "display": "block", "left": "-1600px", "top": "0px",
                "box-shadow": "4px 4px 10px red"}}>

            </div>
        </>
    );
}


function createChartData(ns: NS) {
    const csvContent = ns.read("/events.txt");
    const analysis = analyzeBitNode(csvContent);

    return analysis.filter(d => d?.totalDuration ).map((d) => {
        return { level: d.level, timeToGang: d.timeToGang, timeToCorporation: d.timeToCorporationStart, total: d.totalDuration }
    });
}

async function drawChart(ns: NS, chartId: string) {
    // https://api.highcharts.com/highcharts/
    const dataArray = createChartData(ns);

    const createdData = dataArray.map(o => JSON.stringify(o)).join(", \n");

    const chartInit = new Function(`

  const data = [ ${createdData} ];
  
  Highcharts.chart('${chartId}', {
    chart: {
        type: 'column'
    },
    title: {
        text: 'Time taken to complete bitnode',
        align: 'left'
    },
    xAxis: {
        categories: data.map( d => d.level )
    },
    yAxis: {
        min: 0,
        title: {
            text: 'Hours'
        }
    },
    legend: {
        reversed: true
    },
    plotOptions: {
        series: {
            // stacking: 'normal',
            dataLabels: {
                enabled: false
            }
        }
    },
    series: [{
        name: 'Time to gang',
        data: data.map( d => d.timeToGang ),
        color: '#3357FF'
    }, {
        name: 'Time to corporation',
        data: data.map( d => d.timeToCorporation ),
        color: '#33FF57'
    }, {
        name: 'Total',
        data: data.map( d => d.total ),
        color: '#FF5733'
    }]
});
  
`);
    ns.tprint(chartInit);

    chartInit();

}

export async function main(ns: NS): Promise<void> {
    await loadHighchartsLibrary(ns);

    const uniqueId = `${ns.pid}-${Date.now()}`;
    const chartId = `highchartgraph-money-id-${uniqueId}`;
    const eventName = `highchartgraph-close-${uniqueId}`;

    ns.tprint(`Creating div with ID ${chartId}`);

    mountComponent(ns, chartId, eventName);
    await drawChart(ns, chartId);

    // noinspection InfiniteLoopJS
    while (true) {
        domWindow.dispatchEvent(new Event(eventName));
        await ns.asleep(10_000);
    }
}


export function mountComponent(ns: NS, chartId: string, eventName: string): void {
    const hookNode = domDocument.getElementById("overview-extra-hook-2") !;

    ReactDOM.render(
        <React.StrictMode>
            <ChartHolder ns={ns} chartId={chartId} eventName={eventName}/>
        </React.StrictMode>,
        hookNode
    );

    ns.atExit(() => {
        ReactDOM.unmountComponentAtNode(hookNode);
    });
}

export async function loadHighchartsLibrary(ns: NS): Promise<void> {
    if (([... domDocument.querySelectorAll('script[src*="highcharts"]')].length < 2)) {
        ns.tprint("Attempting to load highcharts.js");
        const script = domDocument.createElement('script');
        script.src = "https://code.highcharts.com/highcharts.js";
        script.onload = () => console.log('Loaded highcharts.js');
        script.onerror = (e) => console.error('Failed to load highcharts.js:', e);
        domDocument.head.appendChild(script);

        // Give the JS time to load - calling too soon will fail
        await ns.sleep(500);
    }
}