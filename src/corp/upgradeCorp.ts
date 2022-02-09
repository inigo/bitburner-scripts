/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS, Division, Product } from '@ns'
import { OfficeControl, listCities, OfficeRole, listEmployeeUpgrades, doCount, findDivisionName } from 'corp/libCorporation'
import { ImprovementManager } from 'corp/libImprovements'

export async function main(ns : NS) : Promise<void> {
    ns.tprint("Division is "+findDivisionName(ns, "Pharmaceutical"));

    const division = findDivisionName(ns, "Pharmaceutical") !;
    const divisionInfo: Division = ns.corporation.getCorporation().divisions.find(d => d.name == division)!;
    ns.tprint(divisionInfo)

    // await upgradeCorporation(ns, "Tobacco", "Burnbats");
    await upgradeCorporation(ns, "Pharmaceutical");
}

async function upgradeCorporation(ns: NS, industry: string) {
    await initialUpgradeOffices(ns, industry);
    const improvementManager = new ImprovementManager(ns, industry);
    const priceManager = new ProductPriceManager(ns, industry);
    while (true) {
        await improvementManager.buyNextImprovement();
        await launchProducts(ns, industry);
        await priceManager.updateProductPrices();
        await ns.sleep(5000);
    }
}

/**
 * Initial office setup, after expanding into a new industry (assuming reasonably well funded - several $100b )
 */
async function initialUpgradeOffices(ns: NS, industry: string): Promise<void> {
    const o = new OfficeControl(ns, "Sector-12", industry);
    o.setOfficeSize(63);
    o.setWarehouseSize(200);
    o.fillOffice();    
    o.enableSmartSupply();
    await o.assignEmployeesByRole(OfficeRole.Product);

    for (const city of listCities().filter(s => s!="Sector-12")) {
        const o = new OfficeControl(ns, city, industry);
        o.setupOffice();        
        o.setOfficeSize(20);
        o.fillOffice();
        o.setWarehouseSize(200);
        o.enableSmartSupply();
        await o.assignEmployeesByRole(OfficeRole.Manufacturing);
    }
}


export class ProductPriceManager {
    private priceSetters: ProductPriceSetter[];
    readonly division: string;
    constructor(readonly ns: NS, readonly industry: string) {
        this.division = findDivisionName(ns, industry) !;
        this.priceSetters = this.getCurrentPriceSetters();
    }

    updateProductPrices(): void {
        this.priceSetters = this.getCurrentPriceSetters();
        this.priceSetters.forEach(pp => pp.update());
    }

    private getCurrentPriceSetters(): ProductPriceSetter[] {
        const completeProductNames = this.listCompletedProducts().map(p => p.name);
        const existingPricerNames = this.priceSetters.map(pp => pp.productName);
        const newPriceSetters = completeProductNames.filter(p => ! existingPricerNames.includes(p) )
                                    .map(p => new ProductPriceSetter(this.ns, this.industry, p) );
        const priceSettersWithoutOutdated = this.priceSetters.filter(pp => ! completeProductNames.includes(pp.productName));
        const updatedPriceSetters = [... priceSettersWithoutOutdated, ... newPriceSetters];
        return updatedPriceSetters;
    }

    listCompletedProducts(): Product[] {
        return this.listProducts().filter(p => p.developmentProgress >= 99.99);
    }

    listProducts(): Product[] {
        const divisionInfo: Division = this.ns.corporation.getCorporation().divisions.find(d => d.name == this.division)!;
        const productNames = divisionInfo.products;
        return productNames.map(p => this.ns.corporation.getProduct(this.division, p));
    }
}

class ProductPriceSetter {
    readonly division: string;
    constructor(readonly ns: NS, readonly industry: string, readonly productName: string) {
        this.division = findDivisionName(ns, industry) !;
    }

    update(): void {
        const existingInfo = this.retrieveProductPriceInfo();
        if (existingInfo!=null && existingInfo.isStable && this.isStillValid(existingInfo)) {
            this.ns.print("Nothing to do - existing stored price is stable and still valid")
            return;
        }
        const startingMultiplier = existingInfo?.priceMultiplier ?? 1;

        const salesInfo = this.getSalesInfo();
        const totalProduced = salesInfo.map(s => s.produced ).reduce((a,b) => a+b);
        const totalSold = salesInfo.map(s => s.sold ).reduce((a,b) => a+b);

        // Increase prices until not selling all, then drop until we are again selling all, and stop there (for now)
        const isStable = (existingInfo?.isReducing ?? false) && (totalSold >= totalProduced);
        
        if (!isStable) {
            const newMultiplier = (totalProduced > totalSold) ? Math.floor(startingMultiplier * 0.8) : Math.floor(startingMultiplier * 1.5);
            const isReducing = newMultiplier < startingMultiplier;
    
            this.setProductPrice(newMultiplier);
            this.updateProductPriceInfo(newMultiplier, isReducing, isStable);    
        } else {
            this.updateProductPriceInfo(startingMultiplier, true, true);    
        }
    }

    setProductPrice(multiplier: number): void {
        this.ns.print("Setting product price for "+this.productName+" to "+multiplier);
        this.ns.corporation.sellProduct(this.division, "Sector-12", this.productName, "MAX", "MP*"+multiplier, true);
    }

    getSalesInfo(): ProductSaleInfo[] {
        const cityData = this.ns.corporation.getProduct(this.division, this.productName).cityData;
        return listCities().map(city => {
            const quantity = cityData["Sector-12"][0];
            const produced = cityData["Sector-12"][1];
            const sold = cityData["Sector-12"][2];
            return { city, quantity, produced, sold };
        });
    }

    isStillValid(info: ProductPriceInfo): boolean {
        if (! info.isStable) { return false; }

        const now = new Date().getTime();
        const currentAwareness = this.ns.corporation.getDivision(info.division).awareness;

        const timeElapsed = now - info.time;
        const isOld = timeElapsed > 5 * 60 * 1000; // 5 minutes
        const hasAwarenessImproved = currentAwareness > (info.awareness * 2);

        return !isOld && !hasAwarenessImproved;
    }

    private updateProductPriceInfo(multiplier: number, isReducing: boolean, isStable: boolean): void { 
        const awareness = this.ns.corporation.getDivision(info.division).awareness;
        const info = { productName: this.productName, division: this.division, priceMultiplier: multiplier, time: new Date().getTime(), awareness, isReducing, isStable };
        this.storeProductPriceInfo(info);
    }
    private storeProductPriceInfo(info: ProductPriceInfo): void {
        this.getStorage().setItem(this.productKey(), JSON.stringify(info));
    }
    private retrieveProductPriceInfo(): (ProductPriceInfo | null) {
        const item = this.getStorage().getItem(this.productKey());
        return (item==null) ? null : (JSON.parse(item) as ProductPriceInfo);
    }
    private getStorage(): Storage { return eval("window").localStorage;  }
    private productKey(): string { return "product_"+this.division+"_"+this.productName; }
}

function launchProducts(ns: NS, industry: string) {
    ns.print("Managing products");
    const division = findDivisionName(ns, industry) !;
    const divisionInfo: Division = ns.corporation.getCorporation().divisions.find(d => d.name == division)!;
    const productNames = divisionInfo.products;
    const existingProducts = productNames.map(p => ns.corporation.getProduct(division, p));
    const completeProducts = existingProducts.filter(p => p.developmentProgress >= 99.9);
    ns.print("There are "+completeProducts.length+" complete products");

    const allProductsComplete = (completeProducts.length == existingProducts.length);
    const maxProducts = getMaxProducts(ns, division);

    if (allProductsComplete && completeProducts.length==maxProducts) {
        // Assumes the products are ordered by age, and that the oldest is the worst
        const oldestProduct = completeProducts.at(0) !;
        ns.print("Retiring oldest product "+oldestProduct.name);
        ns.corporation.discontinueProduct(division, oldestProduct.name);
    }
    if (allProductsComplete) {
        ns.print("Starting research on new product");
        const funds = ns.corporation.getCorporation().funds;
        const productInvestment = Math.floor(funds / 10);
        const productName = createProductName(ns);
        ns.corporation.makeProduct(division, "Sector-12", productName, productInvestment, productInvestment);
    }
}

function createProductName(ns: NS): string {
    return "Some product "+new Date().getTime();
}

function getMaxProducts(ns: NS, division: string): number {
    return 3 + (ns.corporation.hasResearched(division, "uPgrade: Capacity.I") ? 1 : 0)
             + (ns.corporation.hasResearched(division, "uPgrade: Capacity.II") ? 1 : 0);
}


type ProductPriceInfo = { productName: string, division: string, priceMultiplier: number, 
                          time: number, awareness: number, isReducing: boolean, isStable: boolean }

type ProductSaleInfo = { city: string, quantity: number, produced: number, sold: number };