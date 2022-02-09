/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { findDivisionName, listCities, OfficeControl, OfficeRole, listEmployeeUpgrades } from 'corp/libCorporation'

/**
 * Buy the best improvements for a division, based on their current weighted cost.
 */
export class ImprovementManager {
    readonly division: string;
    constructor(readonly ns: NS, readonly industry: string) {
        this.division = findDivisionName(ns, industry) !;
    }

    async buyNextImprovement(): Promise<void> {
        const getLeastExpensive = (): number => Math.min( ... this.listImprovements().map(imp => imp.improvement.getCost()));    
        if (this.getFunds() > (getLeastExpensive() * 2)) {
            await this.buyBestImprovement();
        }
    }
    
    async buyAllImprovements(): Promise<void> {
        const getLeastExpensive = (): number => Math.min( ... this.listImprovements().map(imp => imp.improvement.getCost()));
        let buySuccessful = true;
        while (this.getFunds() > (getLeastExpensive() * 2) && buySuccessful) {
            buySuccessful = await this.buyBestImprovement();
        }
    }

    private getFunds(): number { 
        return this.ns.corporation.getCorporation().funds;  
    }
    
    async buyBestImprovement(): Promise<boolean> {
        const imp = this.bestImprovement();
        if (imp!=null) {
            if (imp.getCost() < this.ns.corporation.getCorporation().funds) {
                await imp.apply();
                return true;
            } else {
                this.ns.print("Cannot afford best improvement");
                return false;
            }
        }
        return false;
    }
    
    bestImprovement(): (Improvement | undefined) {
        const improvements = this.listImprovements();
        const orderedImprovements = improvements.sort((a, b) =>  (a.improvement.getCost() / a.importance) -  (b.improvement.getCost() / b.importance) );
        return orderedImprovements.at(0)?.improvement;
    }
    
    listImprovements(): WeightedImprovement[] {
        return [
            { importance: 1.5, improvement: new WilsonAnalyticsImprovement(this.ns) }
            , { importance: 1, improvement: new EnlargeMainOfficeImprovement(this.ns, this.division, this.industry) }        
            , { importance: 0.8, improvement: new AdVertImprovement(this.ns, this.division) }
            , { importance: 0.7, improvement: new EmployeeBoostImprovement(this.ns) }        
            , { importance: 0.5, improvement: new EnlargeSecondaryOfficesImprovement(this.ns, this.division, this.industry) }
            , { importance: 0.5, improvement: new ProjectInsightImprovement(this.ns) }
            , { importance: 0.2, improvement: new SmartFactoriesImprovement(this.ns) }        
            , { importance: 0.1, improvement: new DreamSenseImprovement(this.ns) }
        ]
    }    
}

// ----------------------------------------------------------

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
        this.office = new OfficeControl(this.ns, "Sector-12", this.industry);
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
        this.offices = cities.map(city => new OfficeControl(this.ns, city, this.industry));
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

type WeightedImprovement = { improvement: Improvement, importance: number };