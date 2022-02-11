/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';
import { listCities, JobPosition, OfficeRole } from 'corp/libCorporation'
import { OfficeControl } from 'corp/libOffice'
import { formatMoney } from 'libFormat'
import { spendHashesOnPurchases } from "hacknet/libHashes";
import { waitForNextCorporationTick } from 'corp/libCorporation';
import { manageCorporation } from 'corp/manageCorp';

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");

    ns.corporation.createCorporation("Bats Inc", false);    

    // const strategy: StartupStrategy = new AgricultureStrategy();
    const strategy: StartupStrategy = new SoftwareStrategy();
    await strategy.startCorporation(ns);
    await strategy.dump(ns);
    await strategy.initialUpgradeOffices(ns);
    await manageCorporation(ns, strategy.industry);
}

interface StartupStrategy {
    industry: string;
    startCorporation(ns: NS): Promise<void>;
    dump(ns: NS): Promise<void>;
    initialUpgradeOffices(ns: NS): Promise<void>    
}

/**
 * Create a corporation, with "Agriculture" - $1.61t
 */
class AgricultureStrategy implements StartupStrategy {
    readonly division: string;
    readonly industry: string;
    constructor() {
        this.division = "GrowBats";
        this.industry = "Agriculture";
    }

    async startCorporation(ns: NS): Promise<void> {
        const division = this.division;
        const industry = this.industry;

        ns.corporation.expandIndustry("Tobacco", "SmokeBats");

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

    async dump(ns: NS): Promise<void> {
        const division = this.division;
        const industry = this.industry;

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
    async initialUpgradeOffices(ns: NS): Promise<void> {
        const industry = "Tobacco";
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
}



/**
 * Create a corporation, with "Software" - $3.39t, $3.6t, ...  $4.5t with extra coffee
 */
 class SoftwareStrategy implements StartupStrategy {
    readonly division: string;
    readonly industry: string;
    constructor() {
        this.division = "MicroBats";
        this.industry = "Software";
    }

    async startCorporation(ns: NS): Promise<void> {
        const division = this.division;
        const industry = this.industry;

        if (!ns.corporation.getCorporation().divisions.some(d => d.type == industry)) {
            ns.corporation.expandIndustry(industry, division);
        }

        if (!ns.corporation.hasUnlockUpgrade("Smart Supply")) {
            ns.corporation.unlockUpgrade("Smart Supply");
        }

        while (ns.corporation.getUpgradeLevel("Smart Storage") < 5) {
            ns.corporation.levelUpgrade("Smart Storage"); 
        }

        // Set up each office to produce and sell output
        const offices = listCities().map(city => new OfficeControl(ns, city, industry));    
        for (const o of offices) {
            ns.print("Setting up office in "+o.city);
            if (o.city!="Sector-12") { o.setupOffice(); }
            o.setWarehouseSize(900);
            o.enableSmartSupply();
            o.setOfficeSize(3);
            // Being profitable means that employees are happier, which increases investment
            // Although selling means that the warehouse fills up much more slowly
            o.sellAllMaterials(1, "PROD*0.6");            
        }

        if (ns.corporation.getDivision(division).research < 3) {
            const o = new OfficeControl(ns, "Sector-12", industry);
            await o.assignEmployees([ { position: JobPosition.RandD, weight: 1 }]);

            const waitForTicks = waitForNextCorporationTick(ns);
            while (ns.corporation.getDivision(division).research < 3) {
                await waitForTicks.next();
            }
            await o.assignEmployees([ { position: JobPosition.Unassigned, weight: 1 }]);
        }

        for (const o of offices) {
            const weights = [ { position: JobPosition.Engineer, weight: 1 }
                , { position: JobPosition.Operations, weight: 1 }
                , { position: JobPosition.Management, weight: 1 } ];
            await o.assignEmployees(weights);
        }

        ns.print("Waiting for warehouses to be full - this will take a while");
        while(! offices.every(o => o.isWarehouseFull()) ) {
            await ns.sleep(10000);
        }
        ns.print("Warehouses now full");
    }

    async dump(ns: NS): Promise<void> {
        const division = this.division;
        const industry = this.industry;

        const offices = listCities().map(city => new OfficeControl(ns, city, industry));    

        ns.print("Switching all employees to Business (in two steps, because changing roles is slow)");
        for (const o of offices) {
            o.stopSellingAllMaterials();
            await o.assignEmployees([ { position: JobPosition.Unassigned, weight: 1 } ]);
        }    
        for (const o of offices) {
            await o.assignEmployees([ { position: JobPosition.Business, weight: 1 } ]);
        }    

        const exchangeTargets = [ { name: "Sell for Corporation Funds" } ];
        while(spendHashesOnPurchases(ns, exchangeTargets)) {
            ns.print("Exchanging hashes for corporation funds");
        }    

        const waitForTicks = waitForNextCorporationTick(ns);        
        await waitForTicks.next();

        ns.print("Buying adverts, and getting investment");
        const offerBeforeAdverts = ns.corporation.getInvestmentOffer().funds;
        while (ns.corporation.getHireAdVertCost(division) <= ns.corporation.getCorporation().funds) {
            ns.corporation.hireAdVert(division);
        }

        for (const o of offices) {
            o.sellAllMaterials(1);            
        }        

        ns.print("Waiting for an increased offer, and will then accept it");
        ns.print("Before tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));

        await waitForTicks.next();
        ns.print("After first tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));
        await waitForTicks.next();    
        ns.print("After second tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));    
        // await waitForTicks.next();    
        // ns.print("After third tick, offer is " + formatMoney(ns, ns.corporation.getInvestmentOffer().funds));    

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
    async initialUpgradeOffices(ns: NS): Promise<void> {
        const industry = "Software";
        const o = new OfficeControl(ns, "Sector-12", industry);
        ns.print("Expanding head office for "+industry);
        o.setOfficeSize(63);
        o.fillOffice();    
        ns.print("Assigning employees to roles in head office");
        await o.assignEmployeesByRole(OfficeRole.Product);

        for (const city of listCities().filter(s => s!="Sector-12")) {
            ns.print("Expanding branch office in "+city+" for "+industry);
            const o = new OfficeControl(ns, city, industry);
            o.setupOffice();        
            o.setOfficeSize(20);
            o.fillOffice();
            ns.print("Assigning employees to roles in "+city);
            await o.assignEmployeesByRole(OfficeRole.Manufacturing);
        }
    }
}
