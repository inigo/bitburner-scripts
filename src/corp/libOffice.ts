/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {CityName, CorpEmployeePosition, NS, Office} from '@ns'
import { findDivisionName, OfficeRole, listPositions, JobPosition, JobCounts, doCount, JWeight, TickGenerator } from '@/corp/libCorporation'
import { IndustryInfo } from '@/corp/libIndustries'

export class OfficeControl {
    private industryInfo: IndustryInfo;
    public readonly division: string;
    constructor(private ns: NS, public readonly city: CityName, public readonly industry: string) {
        this.industryInfo = new IndustryInfo(industry);
        this.division = findDivisionName(ns, industry) !;
    }

    setupOffice(): void {
        if (! this.warehouseExists()) {
            this.ns.print("Opening new office for "+this.division+" in "+this.city);
            this.ns.corporation.expandCity(this.division, this.city);
            this.setWarehouseSize(100);
        }
    }

    enableSmartSupply(): void {
        this.ns.corporation.setSmartSupply(this.division, this.city, true);
        this.industryInfo.listInputs().forEach( m => this.ns.corporation.setSmartSupplyOption(this.division, this.city, m, "leftovers"));
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

    /** Sell all materials that this industry produces, at a price equal to Market Price (MP) * multiplier. */
    sellAllMaterials(multiplier = 1, amount = "MAX"): void {
        this.industryInfo.listMaterials().forEach(m => this.sellMaterial(m, multiplier, amount));
    }    
    stopSellingAllMaterials(): void {
        this.industryInfo.listMaterials().forEach(m => this.sellMaterial(m, 1, "0"));
    }    
    /** Sell a material, at a price equal to Market Price (MP) * multiplier. */
    private sellMaterial(material: string, multiplier = 1, amount = "MAX"): void {
        this.ns.corporation.sellMaterial(this.division, this.city, material, amount, "MP*"+multiplier)
    }

    /** Set the office size to the specified size, and hire employees. */
    setOfficeSize(newSize: number): number {
        const existingSize = this.getInfo().size;
        const expansion = newSize - existingSize;
        if (expansion<=0) { 
            this.fillOffice();
            return existingSize; 
        }
        this.ns.print("Upgrading office size for division "+this.division+" in "+this.city+" by "+expansion);
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
        const employeesNeeded = o.size - o.numEmployees;
        if (employeesNeeded<=0) return;
        doCount(employeesNeeded).forEach(() =>  this.ns.corporation.hireEmployee(this.division, this.city) );
    }


    async assignEmployees(weights: JWeight[]): Promise<void> {
        // @todo update - the whole process for managing employees has completely changed
        // const getJob = (name: string) => this.ns.corporation.getEmployee(this.division, this.city, name);

        // const employees = this.getInfo().employees;
        // const jobs = employees.map(name => getJob(name));
        const employeeCount = this.getInfo().numEmployees;
        const employeeJobs: Record<CorpEmployeePosition, number> = this.getInfo().employeeJobs;

        // Work out requested numbers from weights
        const totalWeight = weights.map(w => w.weight).reduce((a, b) => a+b);
        const counts: JobCounts[] = [];
        for (const position of listPositions().filter(p => p!="Unassigned")) {
            const currentCount: number = employeeJobs[position];
            const desiredWeight = weights.find(w => w.position == position);
            const desiredCount = (desiredWeight==null) ? 0 : Math.floor( employeeCount * desiredWeight.weight / totalWeight );
            const status: JobCounts = { position, currentCount, desiredCount };
            counts.push(status);
        }

        // There may be unassigned employees due to rounding errors - put all of these in R&D
        const totalAssignedEmployees = counts.map(j => j.desiredCount).reduce((a, b) => a+b);
        const unassignedEmployeeCount = employeeCount - totalAssignedEmployees;
        const anyIntentionallyUnassigned = (weights.find(w => w.position=="Unassigned")?.weight ?? 0) > 0;
        if (!anyIntentionallyUnassigned) {
            counts.find(j => j.position == JobPosition.RandD)!.desiredCount += unassignedEmployeeCount;
        }

        for (const count of counts) {
            if (count.currentCount!=count.desiredCount) {
                this.ns.print("Setting position "+count.position+" to have "+count.desiredCount+" employees");
                // @todo update - this is regularly failing - claiming there aren't unassigned employees when there are (does it take a while to unassign them??)
                try {
                    this.ns.corporation.setAutoJobAssignment(this.division, this.city, count.position, count.desiredCount);
                } catch (e) {
                    this.ns.tprint("Corporation assignation failed : " + e);
                    this.ns.print("Corporation assignation failed : " + e);
                }                // const afterAssignmentJobs = employees.map(name => getJob(name));
                // const jobCount = afterAssignmentJobs.filter(j => j.pos == count.position).length;
                // if (jobCount != count.desiredCount) {
                //     this.ns.print("Employees not successfully assigned to "+count.position);
                //     await this.ns.corporation.setAutoJobAssignment(this.division, this.city, count.position, count.desiredCount);
                // }
            }
        }
    }

    async buyProductionMultipliers(ticks: TickGenerator): Promise<void> {
        const warehouse = this.ns.corporation.getWarehouse(this.division, this.city);
        const spaceToUse = Math.floor(warehouse.size * 0.4);

        let isBuying = false;
        const weights = this.industryInfo.getProductionMultipliers(this.industry);
        for (const m of weights) {
            const requiredAmount = spaceToUse * m.pctOfWarehouse / (m.size * 5);
            const material = this.ns.corporation.getMaterial(this.division, this.city, m.material);
            const existingAmount = material.stored; // @todo update - this was "qty" - I think that was quantity? And stored is hopefully equivalent?
            if ((existingAmount*1.2) < requiredAmount) {
                this.ns.print("Insufficient "+m.material+" in "+this.city+" for optimum product modifiers - buying more. Want "+requiredAmount+" but have "+existingAmount);
                const boughtBySmartSupply = (-1 * material.productionAmount);
                const amountToBuy = boughtBySmartSupply + requiredAmount - existingAmount;
                isBuying = true;
                this.ns.corporation.setSmartSupply(this.division, this.city, false);
                this.ns.corporation.buyMaterial(this.division, this.city, m.material, amountToBuy);
            } else {
                this.ns.corporation.buyMaterial(this.division, this.city, m.material, 0);
            }
        }
        if (isBuying) {
            await ticks.next();
        }
        weights.forEach(m => this.ns.corporation.buyMaterial(this.division, this.city, m.material, 0));
        this.ns.corporation.setSmartSupply(this.division, this.city, true);
    }

    async assignEmployeesByRole(officeRole: OfficeRole): Promise<void> {
        const weights = this.industryInfo.getWeights(officeRole);
        await this.assignEmployees(weights);
    }

    getInfo(): Office { return this.ns.corporation.getOffice(this.division, this.city); }
}
