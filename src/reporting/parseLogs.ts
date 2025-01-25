import {NS} from '@ns'
import path from "path";
import fs from "fs";

export async function main(ns: NS): Promise<void> {
    const csvContent = ns.read("/events.txt");
    const analysis = analyzeBitNode(csvContent);
    analysis.forEach(analysis => {
        ns.tprint(`Level: ${analysis?.level} - timeToGang: ${analysis?.timeToGang}, timeToCorporation: ${analysis?.timeToCorporationStart}, timeToCorporationPublic: ${analysis?.timeToCorporationPublic}, totalDuration: ${analysis?.totalDuration}`);
    });
}

interface GameEvent {
    bitNode: number;
    bitNodeLevel: number;
    timeSinceStart: number;
    timeSinceAug: number;
    homeServerSize: number;
    gangSize: number;
    gangTerritory: number;
    corpIncome: number;
    corpFundingRound: number;
    corpIsPublic: boolean;
    eventType: string;
}

function parseCSV(csvContent: string): GameEvent[] {
    const lines = csvContent.trim().split('\n');
    return lines.map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return {
            bitNode: Number(values[0]),
            bitNodeLevel: Number(values[1]),
            timeSinceStart: Number(values[3]),
            timeSinceAug: Number(values[5]),
            homeServerSize: Number(values[8]),
            gangSize: Number(values[10]),
            gangTerritory: Number(values[11]),
            corpIncome: Number(values[13]),
            corpFundingRound: Number(values[14]),
            corpIsPublic: values[15] === 'true',
            eventType: values[17]
        };
    });
}

function groupByLevel(events: GameEvent[]): Map<number, GameEvent[]> {
    return events.reduce((map, event) => {
        const events = map.get(event.bitNodeLevel) || [];
        events.push(event);
        map.set(event.bitNodeLevel, events);
        return map;
    }, new Map<number, GameEvent[]>());
}

function analyzeTimings(events: GameEvent[]) {
    const startEvent = events.find(e => e.eventType === 'bitNodeStarted');
    const gangEvent = events.find(e => e.eventType === 'gangStarted');
    const corporationStartedEvent = events.find(e => e.eventType === 'corporationStarted');
    const corporationPublicEvent = events.find(e => e.eventType === 'corporationPublic');
    const bitnodeCompleteEvent = events.find(e => e.eventType === 'completeBitnode');

    if (!startEvent) return null;

    const msToHours = (ms: number) => Number((ms / 3600000).toFixed(2));

    return {
        level: startEvent.bitNodeLevel,
        totalDuration: bitnodeCompleteEvent ?
            msToHours(bitnodeCompleteEvent?.timeSinceStart - startEvent.timeSinceStart) :
            (msToHours(corporationPublicEvent?.timeSinceStart - startEvent.timeSinceStart) + 0.5),
        timeToGang: msToHours(gangEvent?.timeSinceStart - startEvent.timeSinceStart),
        timeToCorporationStart: msToHours(corporationStartedEvent?.timeSinceStart - startEvent.timeSinceStart),
        timeToCorporationPublic: msToHours(corporationPublicEvent?.timeSinceStart - startEvent.timeSinceStart),
    };
}

export function analyzeBitNode(csvContent: string) {
    const events = parseCSV(csvContent);
    const bitNode12 = events.filter(e => e.bitNode === 12);
    const groupedEvents = groupByLevel(bitNode12);

    return Array.from(groupedEvents.values())
        .map(analyzeTimings)
        .filter(Boolean);
}


/*if (require.main === module) {
    const fs = require('fs');
    const path = require('path');

    async function main() {
        const csvPath = path.join(__dirname, '../events.txt');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const analysis = await analyzeBitNode(csvContent);
        // console.log(JSON.stringify(analysis, null, 2));

        analysis.forEach(analysis => {
            console.log(`Level: ${analysis?.level} - timeToGang: ${analysis?.timeToGang}, timeToCorporation: ${analysis?.timeToCorporationStart}, timeToCorporationPublic: ${analysis?.timeToCorporationPublic}, totalDuration: ${analysis?.totalDuration}`);
        })
    }

    main().catch(console.error);
}*/
