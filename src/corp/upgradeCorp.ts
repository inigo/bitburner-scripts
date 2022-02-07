/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS, Division } from '@ns'
import { OfficeControl, listCities, OfficeRole, listEmployeeUpgrades, doCount } from 'corp/libCorporation'

export async function main(ns : NS) : Promise<void> {
    await upgradeCorporation(ns, "Tobacco", "Burnbats");
}

async function upgradeCorporation(ns: NS, industry: string, division: string) {
    await initialUpgradeOffices(ns, division, industry);
    while (true) {
        await buyAllImprovements(ns, division, industry);
        await manageProducts(ns, division, industry);
        await ns.sleep(5000);
    }
}

async function initialUpgradeOffices(ns: NS, division: string, industry: string): Promise<void> {
    const o = new OfficeControl(ns, division, "Sector-12", industry);
    o.setOfficeSize(63);
    o.setWarehouseSize(200);
    o.fillOffice();    
    o.enableSmartSupply();
    await o.assignEmployeesByRole(OfficeRole.Product);

    for (const city of listCities().filter(s => s!="Sector-12")) {
        const o = new OfficeControl(ns, division, city, industry);
        o.setupOffice();        
        o.setOfficeSize(20);
        o.fillOffice();
        o.setWarehouseSize(200);
        o.enableSmartSupply();
        await o.assignEmployeesByRole(OfficeRole.Manufacturing);
    }
}


function manageProducts(ns: NS, division: string) {
    ns.print("Managing products");

    const divisionInfo: Division = ns.corporation.getCorporation().divisions.find(d => d.name == division)!;
    const productNames = divisionInfo.products;
    const existingProducts = productNames.map(p => ns.corporation.getProduct(division, p));
    const completeProducts = existingProducts.filter(p => p.developmentProgress >= 99.9);
    ns.print("There are "+completeProducts.length+" complete products");

    const allProductsComplete = (completeProducts.length == existingProducts.length);

    if (allProductsComplete && completeProducts.length==3) {
        // Assuming the products are ordered by age?
        const oldestProduct = completeProducts.at(0) !;
        ns.print("Retiring oldest product "+oldestProduct.name);
        ns.corporation.discontinueProduct(division, oldestProduct.name);
    }
    if (allProductsComplete) {
        ns.print("Starting research on new product");
        const funds = ns.corporation.getCorporation().funds;
        const productInvestment = Math.floor(funds / 10);
        const productName = "Some product "+new Date().getTime();
        ns.corporation.makeProduct(division, "Sector-12", productName, productInvestment, productInvestment);
    }

    completeProducts.filter(p => p.sCost=="MP" || p.sCost==null || p.sCost==0).forEach(p => setProductPrice(ns, division, p.name));
}

function setProductPrice(ns: NS, division: string, productName: string) {
    ns.print("Setting product price for "+productName);
    ns.corporation.sellProduct(division, "Sector-12", productName, "MAX", "MP*2", true);
}


interface Improvement {
    getCost(): number;
    apply(): Promise<void>;
}

abstract class UpgradeImprovement implements Improvement {
    constructor(private ns: NS, private improvements: string[]) {}
    getCost(): number { return this.improvements.map(u => this.ns.corporation.getUpgradeLevelCost(u) ).reduce((a,b) => a+b); }
    apply() { 
        this.ns.print("Applying updates "+this.improvements);
        return Promise.resolve( this.improvements.forEach(u => this.ns.corporation.levelUpgrade(u))); 
    }
}

class EmployeeBoostImprovement extends UpgradeImprovement implements Improvement {
    constructor(ns: NS) { super(ns, listEmployeeUpgrades()) }
}

class WilsonAnalyticsImprovement extends UpgradeImprovement implements Improvement {
    constructor(ns: NS) { super(ns, ["Wilson Analytics"])}
}

class DreamSenseImprovement extends UpgradeImprovement implements Improvement {
    constructor(ns: NS) { super(ns, ["DreamSense"])}
}

class ProjectInsightImprovement extends UpgradeImprovement implements Improvement {
    constructor(ns: NS) { super(ns, ["Project Insight"])}
}

class SmartFactoriesImprovement extends UpgradeImprovement implements Improvement {
    constructor(ns: NS) { super(ns, ["Smart Factories", "ABC SalesBots"])}
}

class AdVertImprovement implements Improvement {
    constructor(private ns: NS, private division: string) { }
    getCost(): number { return this.ns.corporation.getHireAdVertCost(this.division); }
    apply() { 
        this.ns.print("Applying update - AdVerts");
        return Promise.resolve( this.ns.corporation.hireAdVert(this.division) ); 
    }    
}

class EnlargeMainOfficeImprovement implements Improvement {
    private office: OfficeControl;
    constructor(private ns: NS, private division: string, private industry: string) { 
        this.office = new OfficeControl(this.ns, this.division, "Sector-12", this.industry);
    }
    getCost(): number {  return this.office.increaseOfficeSizeCost(15); }
    async apply() { 
        this.ns.print("Applying update - increasing main office size");
        await this.office.increaseOfficeSize(15); 
        await this.office.assignEmployeesByRole(OfficeRole.Product);
        return Promise.resolve(); 
    }
}


class EnlargeSecondaryOfficesImprovement implements Improvement {
    private offices: OfficeControl[];
    private sizeIncrease = 6;
    constructor(private ns: NS, private division: string, private industry: string) { 
        const cities = listCities().filter(s => s != "Sector-12");
        this.offices = cities.map(city => new OfficeControl(this.ns, this.division, city, this.industry));
    }
    getCost(): number { return this.offices.map(o => o.increaseOfficeSizeCost(this.sizeIncrease)).reduce((a,b) => a+b); }
    async apply() { 
        this.ns.print("Applying update - increasing secondary office sizes");
        for (const o of this.offices) {
            await o.increaseOfficeSize(this.sizeIncrease); 
            await o.assignEmployeesByRole(OfficeRole.Manufacturing);
        }
        return Promise.resolve(); 
    }
}

async function buyAllImprovements(ns: NS, division: string, industry: string) {
    const getLeastExpensive = (): number => Math.min( ... listImprovements(ns, division, industry).map(imp => imp.improvement.getCost()));

    let buySuccessful = true;
    while (ns.corporation.getCorporation().funds > (getLeastExpensive() * 2) && buySuccessful) {
        buySuccessful = await buyBestImprovement(ns, division, industry);
    }
}

async function buyBestImprovement(ns: NS, division: string, industry: string): Promise<boolean> {
    const imp = bestImprovement(ns, division, industry);
    if (imp!=null) {
        if (imp.getCost() < ns.corporation.getCorporation().funds) {
            await imp.apply();
            return true;
        } else {
            return false;
        }
    }
    return false;
}

function bestImprovement(ns: NS, division: string, industry: string): (Improvement | undefined) {
    const improvements = listImprovements(ns, division, industry);
    const orderedImprovements = improvements.sort((a, b) =>  (a.improvement.getCost() / a.importance) -  (b.improvement.getCost() / b.importance) );
    return orderedImprovements.at(0)?.improvement;
}


function listImprovements(ns: NS, division: string, industry: string): WeightedImprovement[] {
    return [
        { importance: 1.5, improvement: new WilsonAnalyticsImprovement(ns) }
        , { importance: 1, improvement: new EnlargeMainOfficeImprovement(ns, division, industry) }        
        , { importance: 0.7, improvement: new AdVertImprovement(ns, division) }
        , { importance: 0.7, improvement: new EmployeeBoostImprovement(ns) }        
        , { importance: 0.5, improvement: new EnlargeSecondaryOfficesImprovement(ns, division, industry) }
        , { importance: 0.5, improvement: new ProjectInsightImprovement(ns) }
        , { importance: 0.2, improvement: new SmartFactoriesImprovement(ns) }        
        , { importance: 0.1, improvement: new DreamSenseImprovement(ns) }
    ]

}

type WeightedImprovement = { improvement: Improvement, importance: number };