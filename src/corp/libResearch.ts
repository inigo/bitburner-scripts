import { NS, Division } from '@ns'
import {listDivisions} from "@/corp/libCorporation";

/**
 * Unlock relevant research when available - but keeping plenty of research points available, since they
 * increase product quality.
 */
export class ResearchManager {
    private readonly primaryResearches = [
        "Hi-Tech R&D Laboratory"
        , "uPgrade: Fulcrum" // Primarily useful as a stepping stone to Capacity
        , "uPgrade: Capacity.I" // Allows an extra product
        , "uPgrade: Capacity.II" // Allows another extra product
        , "Market-TA.I" // Useless, but leads to TA.II
        , "Market-TA.II" // Sets pricing optimally
    ];
    private readonly secondaryResearches = [
        "Hi-Tech R&D Laboratory" // Boosts R&D in all industries, so worthwhile to support primary
    ]    
    private requiredSurplusMultiplier = 6;
    constructor(private ns: NS, readonly primaryDivision = "Software") {
    }

    unlockResearches(): void {
        const divisions: Division[] = listDivisions(this.ns);
        for (const division of divisions) {
            const isPrimary = (division.type ==this.primaryDivision);
            const relevantResearch = isPrimary ? this.primaryResearches : this.secondaryResearches;
            const multiplier = isPrimary ? this.requiredSurplusMultiplier : 1;
            try {
                this.unlockResearchForDivision(division, relevantResearch, multiplier);
            } catch (error) {
                // @todo Need to catch this currently, because there's a bug that means Fulcrum might not exist
            }
        }
    }

    private unlockResearchForDivision(division: Division, relevantResearch: string[], multiplierNeeded: number) {
        const availableResearch = relevantResearch.filter(r => ! this.ns.corporation.hasResearched(division.name, r));
        for (const r of availableResearch) {
            const researchPoints = this.ns.corporation.getDivision(division.name).researchPoints;
            const cost = this.ns.corporation.getResearchCost(division.name, r);
            if (researchPoints > cost * multiplierNeeded) {
                this.ns.print("Researching "+r+" for "+division.name);
                this.ns.corporation.research(division.name, r);
            } 
        }
   }
}