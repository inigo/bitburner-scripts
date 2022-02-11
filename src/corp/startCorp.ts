/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';
import { listCities, JobPosition, OfficeRole } from 'corp/libCorporation'
import { OfficeControl } from 'corp/libOffice'
import { formatMoney } from 'libFormat'
import { spendHashesOnPurchases } from "hacknet/libHashes";
import { waitForNextCorporationTick } from 'corp/libCorporation';

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");

    const industry = "Agriculture";
    const division = "GrowBats";
    ns.corporation.createCorporation("Bats Inc", false);    

    ns.corporation.expandIndustry("Tobacco", "SmokeBats");

    await startCorporation(ns, industry, division);
    await dump(ns, industry, division);

    
    await initialUpgradeOffices(ns, "Tobacco")
}

/**
 * Create a corporation, with "Agriculture"
 */
async function startCorporation(ns: NS, industry: string, division: string): Promise<void> {
    if (!ns.corporation.getCorporation().divisions.some(d => d.type == industry)) {
        ns.corporation.expandIndustry(industry, division);
    }

    // Unlock Smart Supply, so we don't need to worry about buying inputs
    if (!ns.corporation.hasUnlockUpgrade("Smart Supply")) {
        ns.corporation.unlockUpgrade("Smart Supply");
    }

    // Set up each office to produce and sell output
    const offices = listCities().map(city => new OfficeControl(ns, city, industry));    
    for (const o of offices) {
        ns.print("Setting up office in "+o.city);
        if (o.city!="Sector-12") { o.setupOffice(); }
        o.setWarehouseSize(300);
        o.enableSmartSupply();
        o.setOfficeSize(3);
        const weights = [ { position: JobPosition.Engineer, weight: 1 }
                        , { position: JobPosition.Operations, weight: 1 }
                        , { position: JobPosition.Management, weight: 1 } ];
        await o.assignEmployees(weights);

        o.sellAllMaterials(1);
    }

    ns.print("Waiting for warehouses to be full - this will take a while");
    while(! offices.every(o => o.isWarehouseFull()) ) {
        await ns.sleep(10000);
    }
    ns.print("Warehouses now full");
}

async function dump(ns: NS, industry: string, division: string): Promise<void> {
    const offices = listCities().map(city => new OfficeControl(ns, city, industry));    

    ns.print("Switching all employees to Business (in two steps, because changing roles is slow)");
    for (const o of offices) {
        await o.assignEmployees([ { position: JobPosition.Unassigned, weight: 1 } ]);
    }    
    for (const o of offices) {
        await o.assignEmployees([ { position: JobPosition.Business, weight: 1 } ]);
    }    


    const exchangeTargets = [ { name: "Sell for Corporation Funds" } ];
    while(spendHashesOnPurchases(ns, exchangeTargets)) {
        ns.print("Exchanging hashes for corporation funds");
    }    

    ns.print("Buying adverts, and getting investment");
    const offerBeforeAdverts = ns.corporation.getInvestmentOffer().funds;
    while (ns.corporation.getHireAdVertCost(division) <= ns.corporation.getCorporation().funds) {
        ns.corporation.hireAdVert(division);
    }


    ns.print("Waiting for an increased offer, and will then accept it");
    ns.print("Before tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));
    const waitForTicks = waitForNextCorporationTick(ns);
    await waitForTicks.next();
    ns.print("After first tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));
    await waitForTicks.next();    
    ns.print("After second tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));    
    while (ns.corporation.getInvestmentOffer().funds < offerBeforeAdverts * 10) {
        await ns.sleep(50);
    }
    const message = "Accepting corporation offer of "+formatMoney(ns, ns.corporation.getInvestmentOffer().funds);
    ns.print(message);
    ns.tprint(message);
    ns.toast(message);
    ns.corporation.acceptInvestmentOffer();
    ns.print("Phase I complete");
}


/**
 * Initial office setup, after expanding into a new industry (assuming reasonably well funded - several $100b )
 */
 async function initialUpgradeOffices(ns: NS, industry: string): Promise<void> {
    const o = new OfficeControl(ns, "Sector-12", industry);
    ns.print("Expanding head office for "+industry);
    o.setOfficeSize(63);
    o.setWarehouseSize(200);
    o.fillOffice();    
    o.enableSmartSupply();
    ns.print("Assigning employees to roles in head office");
    await o.assignEmployeesByRole(OfficeRole.Product);

    for (const city of listCities().filter(s => s!="Sector-12")) {
        ns.print("Expanding branch office in "+city+" for "+industry);
        const o = new OfficeControl(ns, city, industry);
        o.setupOffice();        
        o.setOfficeSize(20);
        o.fillOffice();
        o.setWarehouseSize(200);
        o.enableSmartSupply();
        ns.print("Assigning employees to roles in "+city);
        await o.assignEmployeesByRole(OfficeRole.Manufacturing);
    }
}