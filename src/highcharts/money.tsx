/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {domDocument, domWindow, React, ReactDOM} from "@/react/libReact";
import {MoneySource, NS} from "@ns";
const { useState, useEffect } = React;

function ChartHolder({ns, chartId, eventName}: { ns: NS, chartId: string, eventName: string }) {
    useEffect(() => {
        const updateChart = () => {
            updateExistingChart(ns, chartId);
        };
        domWindow.addEventListener(eventName, updateChart);

        // Clean up event listener when component unmounts
        return () => domWindow.removeEventListener(eventName, updateChart);
    }, [eventName]);

    return (
        <>
            <div id={ chartId } style={{"position": "absolute", "border": "solid 2px green",
                "width": "800px", "height": "800px", "backgroundColor": "lightgray",
                "padding": "10px", "display": "block", "left": "-1200px", "top": "0px",
                "box-shadow": "4px 4px 10px red"}}>

            </div>
        </>
    );
}


function createChartData(ns: NS) {
    const moneySources = ns.getMoneySources();
    const sanitizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const toDataEntry = (parent: string, name: string, value: number, id?: string) => {
        return {
            parent: parent,
            "id": id ?? sanitizeName(parent + "_" + name),
            name: name,
            value: Math.pow(value, 0.2),
            displayValue: ns.formatNumber(value, 1)
        };
    }

    const toDataArray = (m: MoneySource, parent: string) => [
        toDataEntry(parent, "Contracts", m.codingcontract),
        toDataEntry(parent, "Gang", m.gang),
        toDataEntry(parent, "Hacking", m.hacking),
        toDataEntry(parent, "Hacknet", m.hacknet),
        toDataEntry(parent, "Bladeburner", m.bladeburner),
        toDataEntry(parent, "Casino", m.casino),
        toDataEntry(parent, "Sleeves", m.sleeves),
        toDataEntry(parent, "Stock", m.stock),
        toDataEntry(parent, "Work", m.work),
    ].filter(o => o.value > 0);

    const dataArray = [
        {id: 'root', name: 'All money earned', value: 1, hideValue: true},
        toDataEntry('root', 'Current', moneySources.sinceInstall.total, 'current'),
        toDataEntry('root', 'In Bitnode', moneySources.sinceStart.total, 'all'),
        ...toDataArray(moneySources.sinceInstall, "current"),
        ...toDataArray(moneySources.sinceStart, "all"),
    ]
    return dataArray;
}

function updateExistingChart(ns: NS, chartId: string) {
    const dataArray = createChartData(ns);
    const createdData = dataArray.map(o => JSON.stringify(o)).join(", \n");

    const updateChart = new Function(`
        const newData = [ ${createdData} ];
        const existingChart = Highcharts.charts.find(c => c && c?.container?.parentElement?.id == '${chartId}');
        if (existingChart) {
            console.log("Updating chart");
            existingChart.series[0].setData(newData);
        } 
    `);
    updateChart();
}

async function drawChart(ns: NS, chartId: string) {
    // https://www.highcharts.com/docs/chart-and-series-types/sunburst-series
    const dataArray = createChartData(ns);

    const createdData = dataArray.map(o => JSON.stringify(o)).join(", \n");

    const chartInit = new Function(`

  const data = [ ${createdData} ];
  
  const chart = Highcharts.chart('${chartId}', {
    colors: ['transparent'].concat(Highcharts.getOptions().colors.slice(3)),
    series: [{
        type: 'sunburst',
        data: data,
        levels: [{
            level: 1,
            levelIsConstant: false,
        }, {
            level: 2,
            colorByPoint: true
        },
        {
            level: 3,
            colorVariation: {
                key: 'brightness',
                to: -0.7
            },
            levelSize: {
                unit: 'weight',
                value: 3
            }
        }],
        allowDrillToNode: true,
        cursor: 'pointer',
        borderWidth: 2,
        dataLabels: {
            formatter: function () {
                return this.hideValue ? this.point.name : this.point.name + ': $' + this.point.displayValue;
            },
            style: {
                fontSize: '20px',
            }
        }
    }],
    title: {
        text: 'Money Earned'
    },
    tooltip: {
        pointFormat: '<b>{point.name}</b>: {point.displayValue}'
    }
  });
  
`);
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

export async function loadHighchartsLibrary(ns: NS) {
    if (([... domDocument.querySelectorAll('script[src*="highcharts"]')].length < 2)) {
        ns.tprint("Loading highcharts.js");
        const script = domDocument.createElement('script');
        script.src = "https://code.highcharts.com/highcharts.js";
        script.onload = () => console.log('Loaded highcharts.js');
        script.onerror = (e) => console.error('Failed to load highcharts.js:', e);
        domDocument.head.appendChild(script);

        // https://code.highcharts.com/js/modules/sunburst.js
        // https://code.highcharts.com/modules/sunburst.js

        const script2 = domDocument.createElement('script');
        script2.src = "https://code.highcharts.com/modules/sunburst.js";
        script2.onload = () => console.log('Loaded highcharts sunburst js');
        script2.onerror = (e) => console.error('Failed to load highcharts sunburst:', e);
        domDocument.head.appendChild(script2);

        // Give the JS time to load - calling too soon will fail
        await ns.sleep(1000);
    }
}