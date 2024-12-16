/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {NS, Division, Product, CityName} from '@ns';
import {listCities, findDivisionName, listDivisions} from '/corp/libCorporation';
import { ProductNamer } from '/corp/libNamer';

/**
 * Launch new products repeatedly, so there is always one product under development.
 */
export class ProductLauncher {
    readonly division: string;
    private productNamer: ProductNamer;
    constructor(readonly ns: NS, readonly industry: string) {
        this.division = findDivisionName(ns, industry) !;
        this.productNamer = new ProductNamer();
    }

    launchProducts(allowRetiring: boolean): void {
        const divisionInfo: Division = listDivisions(this.ns).find(d => d.name == this.division)!;
        const productNames = divisionInfo.products;
        // @todo update - previously didn't need to pass in a city name - seems odd that developmentProgress is per city??? is it???
        const existingProducts = productNames.flatMap(p => listCities().map(c => this.ns.corporation.getProduct(this.division, c, p)));
        const completeProducts = existingProducts.filter(p => p.developmentProgress >= 99.9);
    
        const allProductsComplete = (completeProducts.length == existingProducts.length);
        // @todo update - haven't changed this, but since we're doing it per city, this number might be wrong?
        const maxProducts = this.getMaxProducts();
    
        if (allProductsComplete && completeProducts.length==maxProducts && allowRetiring) {
            // Assumes the products are ordered by age, and that the oldest is the worst
            const oldestProduct = completeProducts.at(0) !;
            this.ns.print("Retiring oldest product "+oldestProduct.name);
            this.ns.corporation.discontinueProduct(this.division, oldestProduct.name);
        }
        if (allProductsComplete && completeProducts.length < maxProducts) {
            this.ns.print("Starting research on new product");
            const funds = this.ns.corporation.getCorporation().funds;
            const productInvestment = Math.floor(funds / 10);
            const productName = this.productNamer.getUniqueName( completeProducts.map(p=>p.name) );
            this.ns.corporation.makeProduct(this.division, "Sector-12", productName, productInvestment, productInvestment);
        }
    }
    
    getMaxProducts(): number {
        return 3 + (this.ns.corporation.hasResearched(this.division, "uPgrade: Capacity.I") ? 1 : 0)
                 + (this.ns.corporation.hasResearched(this.division, "uPgrade: Capacity.II") ? 1 : 0);
    }
}

/**
 * 
 */
export class ProductPriceManager {
    private priceSetters: ProductPriceSetter[] = [];
    readonly division: string;
    constructor(readonly ns: NS, readonly industry: string) {
        this.division = findDivisionName(ns, industry) !;
        this.priceSetters = this.getCurrentPriceSetters();
    }

    toString(): string {
        return "Price manager in "+this.industry+" with price setters "+this.priceSetters;
    }

    updateProductPrices(): void {
        this.priceSetters = this.getCurrentPriceSetters();
        this.priceSetters.forEach(pp => pp.update());
    }

    private getCurrentPriceSetters(): ProductPriceSetter[] {
        const completeProductNames = this.listCompletedProducts().map(p => p.name);
        const existingPricerNames = this.priceSetters.map(pp => pp.productName);
        // Base the starting price of a new product on the highest price for an existing product, so we don't start from scratch each time
        // Will work better if new products are better, and if the highest price is stable, but neither is necessary
        const highestExistingPriceMultiplier = Math.max(1, ... this.priceSetters.map(pp => pp.getLastPrice()));
        const newPriceSetters = completeProductNames.filter(p => ! existingPricerNames.includes(p) )
                                    .map(p => new ProductPriceSetter(this.ns, this.industry, p, highestExistingPriceMultiplier) );
        const priceSettersWithoutOutdated = (this.priceSetters ?? []).filter(pp => completeProductNames.includes(pp.productName));
        const updatedPriceSetters = [... priceSettersWithoutOutdated, ... newPriceSetters];
        // this.ns.print("Price setters now are "+updatedPriceSetters+" after having added "+newPriceSetters.length+" setters and removed "+((this.priceSetters ?? []).length - priceSettersWithoutOutdated.length)+" setters");
        return updatedPriceSetters;
    }

    listCompletedProducts(): Product[] {
        return this.listProducts().filter(p => p.developmentProgress >= 99.99);
    }

    // @todo update - products are now per division - what difference will this make?
    listProducts(): Product[] {
        const divisionInfo: Division = listDivisions(this.ns).find(d => d.name == this.division)!;
        const productNames = divisionInfo.products;
        return productNames.flatMap(p => listCities().map(c => this.ns.corporation.getProduct(this.division, c, p)));
    }

    arePricesFairlyStable(): boolean {
        return Math.max(... this.priceSetters.map(p => p.getLastRateOfChange())) < 1.03;
    }
}

/**
 * Adjust the price of a product so it is set to the optimal value to sell everything produced.
 */
class ProductPriceSetter {
    readonly division: string;
    readonly initialRateOfChange: number;
    readonly stableRateOfChange: number;
    constructor(readonly ns: NS, readonly industry: string, readonly productName: string, private initialPriceMultiplier: number) {
        this.division = findDivisionName(ns, industry) !;
        this.initialRateOfChange = 2;
        this.stableRateOfChange = 1.02;
    }

    toString(): string {
        return "Price setter for "+this.productName+" in "+this.industry;
    }

    /**
     * Improve the price - call this every tick.
     * 
     * @returns false if more warehouse space is needed
     */
    update(): boolean {
        if (this.ns.corporation.hasResearched(this.division, "Market-TA.II")) {
            if (this.retrieveProductPriceInfo()==null) {
                this.ns.print("Enabling TA.II for new product "+this.productName);
                this.ns.corporation.sellProduct(this.division, "Sector-12", this.productName, "MAX", "MP*"+this.initialPriceMultiplier, true);
                this.setProductPrice(this.initialPriceMultiplier);
                this.updateProductPriceInfo(this.initialPriceMultiplier, false, false, this.initialRateOfChange);
            } else {
                this.ns.print("Nothing to do for '"+this.productName+"' - TA.II available");
            }
            this.ns.corporation.setProductMarketTA2(this.division, this.productName, true);            
            return true;
        }

        const info = this.retrieveProductPriceInfo() ?? this.updateProductPriceInfo(this.initialPriceMultiplier, false, false, this.initialRateOfChange);

        const salesInfo = this.getSalesInfo();
        const totalProduced = Math.round(salesInfo.map(s => s.produced ).reduce((a,b) => a+b));
        const totalSold = Math.round(salesInfo.map(s => s.sold ).reduce((a,b) => a+b));
        const totalInWarehouse = Math.round(salesInfo.map(s => s.quantity ).reduce((a,b) => a+b));
        const minProduced = Math.round(Math.min(... salesInfo.map(s => s.produced )));

        if (minProduced == 0) {
            if (totalInWarehouse>0) {
                this.ns.print("WARN At least one city has no production of '"+this.productName+"' - probably warehouse full so dropping price");
                info.rateOfChange = this.initialRateOfChange;
                this.reducePrice(this.ns, info);
                return false;
            } else {
                this.ns.print("WARN At least one city has no production of '"+this.productName+"' - probably another product filling warehouse - doing nothing");
                return false;
            }
        }

        if (info.isStable) {
            if (this.isStillValid(info) && totalInWarehouse < 2) {
                this.ns.print("Nothing to do for '"+this.productName+"' - existing stored price is stable and still valid, and warehouse not clogged");
                return true;
            } else {
                // If no longer stable, set rate of change back to default so we adjust price more rapidly again
                info.rateOfChange = this.initialRateOfChange;
            }
        }

        // Once we're only making small changes to the price, consider it stable, and leave it for a while
        const isStable = info.rateOfChange <= this.stableRateOfChange && totalSold >= totalProduced && totalInWarehouse < 2;
        
        if (!isStable) {
            if (totalProduced > totalSold) {
                this.ns.print("WARN '"+this.productName+"' production is "+totalProduced+" and total sold is "+totalSold+" so reducing prices");
                this.reducePrice(this.ns, info);
            } else {
                this.ns.print("INFO '"+this.productName+"' production is "+totalProduced+" and total sold is "+totalSold+" so increasing prices");
                this.increasePrice(this.ns, info);
            }
            return true;
        } else {
            this.ns.print("WARN Price for '"+this.productName+"' has reached stability - sticking with "+info.priceMultiplier+" for a period");
            this.updateProductPriceInfo(info.priceMultiplier, true, true, info.rateOfChange);    
            return true;
        }
    }

    reducePrice(ns: NS, info: ProductPriceInfo) {
        const newMultiplier = info.priceMultiplier * (1 / info.rateOfChange);
        this.ns.print(`Reducing price for '${this.productName}' from ${info.priceMultiplier} to ${newMultiplier}`);
        this.changePrice(ns, info, newMultiplier);
    }

    increasePrice(ns: NS, info: ProductPriceInfo) {
        const newMultiplier = info.priceMultiplier * info.rateOfChange;
        this.ns.print(`Increasing price for '${this.productName}' from ${info.priceMultiplier} to ${newMultiplier}`);
        this.changePrice(ns, info, newMultiplier);
    }

    private changePrice(ns: NS, info: ProductPriceInfo, newMultiplier: number) {
        // We're trying to reach stability - we alternately raise prices until not selling, then lower prices until selling, 
        // and each time we change direction we reduce the amount by which we're changing, to zero in on the best value        
        const isReducing = newMultiplier < info.priceMultiplier;
        const changedDirection = (isReducing && !info.isReducing) || (!isReducing && info.isReducing);
        const newRate = Math.max(changedDirection ? info.rateOfChange*0.8 : info.rateOfChange, this.stableRateOfChange);
        this.setProductPrice(newMultiplier);
        this.updateProductPriceInfo(newMultiplier, isReducing, false, newRate);
    }

    setProductPrice(multiplier: number): void {
        // This works around large prices being represented in exponential form, which the product prices can't cope with
        const multiplierAsString = multiplier.toLocaleString().replaceAll(",","");
        this.ns.corporation.sellProduct(this.division, "Sector-12", this.productName, "MAX", "MP*"+multiplierAsString, true);
    }

    getSalesInfo(): ProductSaleInfo[] {
        return listCities().map(city => {
            const pi = this.ns.corporation.getProduct(this.division, city, this.productName);
            // @todo update - these were values from cityData - "quantity", "produced", "sold"
            return { city, quantity: pi.stored, produced: pi.productionAmount, sold: pi.actualSellAmount };
        })
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

    getLastPrice(): number {
        return this.retrieveProductPriceInfo()?.priceMultiplier ?? 1;
    }

    getLastRateOfChange(): number {
        return this.retrieveProductPriceInfo()?.rateOfChange ?? this.initialRateOfChange;
    }

    private updateProductPriceInfo(multiplier: number, isReducing: boolean, isStable: boolean, rateOfChange: number): ProductPriceInfo { 
        const awareness = this.ns.corporation.getDivision(this.division).awareness;
        const info = { productName: this.productName, division: this.division, priceMultiplier: multiplier, time: new Date().getTime(), awareness, isReducing, isStable, rateOfChange };
        this.storeProductPriceInfo(info);
        return info;
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

type ProductPriceInfo = { productName: string, division: string, priceMultiplier: number, 
    time: number, awareness: number, isReducing: boolean, isStable: boolean, rateOfChange: number }

type ProductSaleInfo = { city: string, quantity: number, produced: number, sold: number };
