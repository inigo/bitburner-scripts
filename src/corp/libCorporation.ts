/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {  NS } from '@ns'
import * as ports from 'libPorts';

export async function* waitForNextCorporationTick(ns: NS): TickGenerator {
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

export type TickGenerator = AsyncGenerator<undefined, void, unknown>

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

export type MaterialWeight = { material: string, weight: number, size: number, pctOfWarehouse: number };

export enum OfficeRole { 
    Product, // The one city that creates new products
    Research, // Pure research - early game before products are available
    Manufacturing // Manufacturing and selling products
}

export async function setCorporationInstructions(ns: NS, instructions: CorporationInstructions): Promise<void> {
    await ports.setPortValue(ns, ports.CORP_CONTROL_PORT,  JSON.stringify(instructions) );
}

export function retrieveCorporationInstructions(ns: NS): (CorporationInstructions | null) {
    return ports.checkPort(ns, ports.CORP_CONTROL_PORT, JSON.parse);
}

export type CorporationInstructions = { prepareForInvestment: boolean };


export async function reportCompanyStatus(ns: NS): Promise<void> {
    const dividendRate = 0.9;
    const corp = ns.corporation.getCorporation();
    const profit = (corp.revenue - corp.expenses);
    const pctCompanyOwned = (corp.numShares / corp.totalShares);
    const status: CorporationStatus = {
        value: corp.funds,
        companyIncome: corp.public ? profit*(1-dividendRate) : profit,
        dividendIncome: corp.public ? (profit * dividendRate * pctCompanyOwned) : 0,
        investmentRound: (ns.corporation.getInvestmentOffer().round-1),
        isPublic: corp.public
    };
	await ports.setPortValue(ns, ports.CORP_REPORTS_PORT, JSON.stringify(status));
}

export function retrieveCompanyStatus(ns: NS): (CorporationStatus | null) {
    return ports.checkPort(ns, ports.CORP_REPORTS_PORT, JSON.parse);
}


export type CorporationStatus = { value: number, companyIncome: number, dividendIncome: number, investmentRound: number, isPublic: boolean }