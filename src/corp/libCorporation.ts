/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {  NS } from '@ns'
import * as ports from 'libPorts';

export async function* waitForNextCorporationTick(ns: NS): AsyncGenerator<undefined, void, unknown> {
    const getState = () => ns.corporation.getCorporation().state;
    // States are "START", "PURCHASE", "PRODUCTION", "SALE", "EXPORT"
    const weightTime = 200;

    let lastState = getState();
    while (true) {        
        while (getState()!="START") {
            await ns.sleep(weightTime);
        }
        lastState = getState();
        yield;
        while (getState()==lastState) {
            await ns.sleep(weightTime);
        }
    }
}

export function listPositions(): string[] {
    return ["Operations", "Engineer", "Management", "Business", "Research & Development", "Training", "Unassigned" ];
}

export function listCities(): string[] {
    return [ "Sector-12", "Volhaven", "Chongqing", "New Tokyo", "Ishima", "Aevum" ];
}

export function doCount(i: number): number[] {
    return [...Array(i).keys()];
}

export function listEmployeeUpgrades(): string[] {
    return [ "Nuoptimal Nootropic Injector Implants", "Speech Processor Implants", "Neural Accelerators", "FocusWires" ];
}

export function findDivisionName(ns: NS, industry: string): string {
    const divisions = ns.corporation.getCorporation().divisions;
    return divisions.filter(d => d.type == industry).map(d => d.name).at(0) !;
}

export type JobCounts = { position: string, currentCount: number, desiredCount: number };
// Should restrict this to JobPositions values
export type JWeight = { position: JobPosition, weight: number };
export enum JobPosition {
    Operations = "Operations",
    Engineer = "Engineer",
    Management = "Management",
    Business = "Business",
    RandD = "Research & Development",
    Training = "Training",
    Unassigned = "Unassigned"
}

export enum OfficeRole { 
    Product, // The one city that creates new products
    Research, // Pure research - early game before products are available
    Manufacturing // Manufacturing and selling products
}

export async function setCorporationInstructions(ns: NS, instructions: CorporationInstructions): Promise<void> {
    await ports.setPortValue(ns, ports.CORP_CONTROL_PORT, instructions);
}

export function retrieveCorporationInstructions(ns: NS): (CorporationInstructions | null) {
    return ports.checkPort(ns, ports.CORP_CONTROL_PORT, JSON.parse);
}

export type CorporationInstructions = { prepareForInvestment: boolean };