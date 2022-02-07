/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS ,Office } from '@ns'
import { fmt } from "libFormat";


export class OfficeControl {
    private industryInfo: IndustryInfo;
    constructor(private ns: NS, public readonly division: string, public readonly city: string, public readonly industry: string) {
        this.industryInfo = new IndustryInfo(industry);
    }

    setupOffice(): void {
        if (! this.warehouseExists()) {
            this.ns.corporation.expandCity(this.division, this.city);
            this.setWarehouseSize(100);
        }
    }

    enableSmartSupply(): void {
        this.ns.corporation.setSmartSupply(this.division, this.city, true);
    }


    /** Set this office's warehouse size to be at least newSize, purchasing a warehouse if there isn't already one available. */
    setWarehouseSize(newSize: number): number {
        if (! this.warehouseExists()) {
            this.ns.corporation.purchaseWarehouse(this.division, this.city);
        }
        const getSize = () => this.ns.corporation.getWarehouse(this.division, this.city).size;
        while (getSize() < newSize) {
            this.ns.print("Expanding warehouse");
            this.ns.corporation.upgradeWarehouse(this.division, this.city);
        }
        return getSize();
    }

    private warehouseExists(): boolean {      
        try {
            // This will throw an error: [division] has not expanded to '[city]' when calling getWarehouse  
            const warehouse = this.ns.corporation.getWarehouse(this.division, this.city)
            return (warehouse!=null);
        } catch (err) {
            return false;
        }
    }
    isWarehouseFull(): boolean {
        const warehouse = this.ns.corporation.getWarehouse(this.division, this.city);
        return (warehouse.sizeUsed / warehouse.size) > 0.98;
    }

    /** Sell a material, at a price equal to Market Price (MP) * multiplier. */
    sellMaterial(material: string, multiplier = 1): void {
        this.ns.corporation.sellMaterial(this.division, this.city, material, "MAX", "MP*"+multiplier)
    }
    /** Sell all materials that this industry produces, at a price equal to Market Price (MP) * multiplier. */
    sellAllMaterials(multiplier = 1): void {
        this.industryInfo.listMaterials().forEach(m => this.sellMaterial(m, multiplier));
    }    

    /** Set the office size to the specified size, and hire employees. */
    setOfficeSize(newSize: number): number {
        const existingSize = this.getInfo().size;
        const expansion = newSize - existingSize;
        if (expansion<=0) { return existingSize; }
        this.ns.corporation.upgradeOfficeSize(this.division, this.city, expansion);

        this.fillOffice();

        return this.getInfo().size;
    }
    increaseOfficeSizeCost(increase: number): number {
        return this.ns.corporation.getOfficeSizeUpgradeCost(this.division, this.city, increase);
    }
    increaseOfficeSize(increase: number): number {
        this.ns.corporation.upgradeOfficeSize(this.division, this.city, increase);
        this.fillOffice();
        return this.getInfo().size;
    }

    /** Hire employees to fill all the available space in the office. */
    fillOffice(): void {
        const o = this.getInfo();
        const employeesNeeded = o.size - o.employees.length;
        if (employeesNeeded<=0) return;
        doCount(employeesNeeded).forEach(() =>  this.ns.corporation.hireEmployee(this.division, this.city) );
    }


    async assignEmployees(weights: JWeight[]): Promise<void> {
        const getJob = (name: string) => this.ns.corporation.getEmployee(this.division, this.city, name);

        const employees = this.getInfo().employees;
        const jobs = employees.map(name => getJob(name));
        const employeeCount = employees.length;

        // Work out requested numbers from weights
        const totalWeight = weights.map(w => w.weight).reduce((a, b) => a+b);
        const counts: JobCounts[] = [];
        for (const position of listPositions().filter(p => p!="Unassigned")) {
            const currentCount = jobs.filter(j => j.pos == position).length;
            const desiredWeight = weights.find(w => w.position == position);
            const desiredCount = (desiredWeight==null) ? 0 : Math.floor( employeeCount * desiredWeight.weight / totalWeight );
            const status: JobCounts = { position, currentCount, desiredCount };
            counts.push(status);
        }
        // this.ns.print(fmt(this.ns)`Required counts are: ${counts} `);

        // Unassign employees
        // This is slow, because we can only unassign one at a time, one per second
        for (const count of counts) {
            const numberToRemove = Math.max(count.currentCount - count.desiredCount, 0);
            const toRemove = jobs.filter(j => j.pos == count.position)
                    .slice(0, numberToRemove);
            if (numberToRemove>0) { this.ns.print(fmt(this.ns)`Removing ${toRemove.length} employees from role ${count.position} in ${this.city}`); }
            for (const j of toRemove) {
                await this.ns.corporation.assignJob(this.division, this.city, j.name, "Unassigned");
            }
        }

        // Reassign employees
        const unassignedEmployees = this.getInfo().employees.map(name => getJob(name)).filter(j => j.pos=="Unassigned");
        for (const count of counts) {
            const numberToAdd = Math.max(count.desiredCount - count.currentCount, 0);
            if (numberToAdd>0) { this.ns.print(fmt(this.ns)`Assigning ${numberToAdd} employees to role ${count.position} in ${this.city}`); }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const _ of doCount(numberToAdd)) {
                const e = unassignedEmployees.pop() !;
                await this.ns.corporation.assignJob(this.division, this.city, e.name, count.position);    
            }

            // Using setAutoJobAssignment seems to fail in odd ways - resets number to what they were at the beginning of the script??
            // await this.ns.corporation.setAutoJobAssignment(this.division, this.city, count.position, numberToAdd);
        }

        // Assign anyone spare to R&D
        while (unassignedEmployees.length > 0) {
            const e = unassignedEmployees.pop() !;
            await this.ns.corporation.assignJob(this.division, this.city, e.name, JobPosition.RandD);    
        }
    }

    async assignEmployeesByRole(officeRole: OfficeRole): Promise<void> {
        const weights = this.industryInfo.getWeights(officeRole);
        // this.ns.print(fmt(this.ns)`Weights are: ${weights} `);
        await this.assignEmployees(weights);
    }

    getInfo(): Office { return this.ns.corporation.getOffice(this.division, this.city); }
}

export class IndustryInfo {
    constructor(private industry: string) {
    }

    getWeights(role: OfficeRole): JWeight[] {
        if (role==OfficeRole.Research) {
            return [ { position: JobPosition.RandD, weight: 1 } ];
        } else if (role==OfficeRole.Manufacturing) {
            return [ 
                { position: JobPosition.Operations, weight: 0.1 }, 
                { position: JobPosition.Engineer, weight: 0.1 }, 
                { position: JobPosition.Management, weight: 0.1 }, 
                { position: JobPosition.Business, weight: 0.1 }, 
                { position: JobPosition.RandD, weight: 0.6 }, 
            ];
        } else {
            // This is for Tobacco
            return [ 
                { position: JobPosition.Operations, weight: 0.032 }, 
                { position: JobPosition.Engineer, weight: 0.054 }, 
                { position: JobPosition.Management, weight: 0.056 }, 
                { position: JobPosition.Business, weight: 0.054 }, 
                { position: JobPosition.RandD, weight: 0.05 }, 
            ];        
        }
    }
    
    listMaterials(): string[] {
        // @todo Agriculture only
        return ["Food", "Plants"];
    }
}

export enum OfficeRole { 
    Product, // The one city that creates new products
    Research, // Pure research - early game before products are available
    Manufacturing // Manufacturing and selling products
}

export type JobCounts = { position: string, currentCount: number, desiredCount: number };
// Should restrict this to JobPositions values
export type JWeight = { position: JobPosition, weight: number };
// type JobPositionStrings = keyof typeof JobPositions;
export enum JobPosition {
    Operations = "Operations",
    Engineer = "Engineer",
    Management = "Management",
    Business = "Business",
    RandD = "Research & Development",
    Training = "Training",
    Unassigned = "Unassigned"
  }

function listPositions(): string[] {
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


export class Stopwatch {
    private startTime: number;
    constructor() {
        this.startTime = new Date().getTime();
    }
    reset(): void {
        this.startTime = new Date().getTime();
    }
    timeElapsed(): number {
        return new Date().getTime() - this.startTime;
    }
}
