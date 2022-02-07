/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';
import { OfficeControl, listCities, JobPosition } from 'corp/libCorporation'

export async function main(ns : NS) : Promise<void> {
    await startCorporation(ns);
}

/**
 * Create a corporation, with "Agriculture"
 */
async function startCorporation(ns: NS): Promise<void> {
    // Set up the corporation
    ns.corporation.createCorporation("Bats Inc", false);
    const industry = "Agriculture";
    const division = "GrowBats";
    ns.corporation.expandIndustry(industry, division);

    // Unlock Smart Supply, so we don't need to worry about buying inputs
    ns.corporation.unlockUpgrade("Smart Supply");

    // Set up each office to produce and sell output
    const offices = listCities().map(city => new OfficeControl(ns, division, city, industry));    
    for (const o of offices) {
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

    // Wait for warehouses to be full
    while(! offices.every(o => o.isWarehouseFull()) ) {
        await ns.sleep(5000);
    }

    // Switch all employees to "Business" (in two steps, because changing roles is slow)
    for (const o of offices) {
        await o.assignEmployees([ { position: JobPosition.Unassigned, weight: 1 } ]);
    }    
    for (const o of offices) {
        await o.assignEmployees([ { position: JobPosition.Business, weight: 1 } ]);
    }    

    // Buy adverts
    const offerBeforeAdverts = ns.corporation.getInvestmentOffer().funds;
    while (ns.corporation.getHireAdVertCost(division) <= ns.corporation.getCorporation().funds) {
        ns.corporation.hireAdVert(division);
    }

    // Wait for an increased offer, and then accept it
    while (ns.corporation.getInvestmentOffer().funds < offerBeforeAdverts * 2) {
        await ns.sleep(50);
    }
    ns.corporation.acceptInvestmentOffer();
}
