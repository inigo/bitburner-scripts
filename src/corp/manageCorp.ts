/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';
import { waitForNextCorporationTick, JobPosition, retrieveCorporationInstructions, listCities, reportCompanyStatus } from 'corp/libCorporation';
import { ImprovementManager } from 'corp/libImprovements';
import { InvestmentManager } from 'corp/libInvestment';
import { ProductPriceManager, ProductLauncher } from '/corp/libProducts';
import { ResearchManager } from '/corp/libResearch';
import { OfficeControl } from 'corp/libOffice'

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");
    if (! isInCorporation(ns)) { 
        return; 
    } else {
        await manageCorporation(ns, "Software");
    }
}

export async function manageCorporation(ns: NS, industry: string): Promise<void> {
    const improvementManager = new ImprovementManager(ns, industry);
    const productLauncher = new ProductLauncher(ns, industry);
    const priceManager = new ProductPriceManager(ns, industry);
    const researchManager = new ResearchManager(ns);
    const investmentManager = new InvestmentManager(ns, industry, priceManager)

    if (investmentManager.getTimesInvested()==0) {
        ns.tprint("Not ready for manageCorp - run manageStartup instead");
        return;
    }

    const offices = listCities().map(city => new OfficeControl(ns, city, industry));  
    offices.forEach(o => o.sellAllMaterials(1, "PROD"));
    offices.forEach(o => o.enableSmartSupply());
    offices.forEach(o => o.setWarehouseSize(2000));

    // These will provide research labs (once boosted by Hacknet research) and increase sale valuation by 10% each
    await setUpSubsidiary(ns, "Food", "NomBats");
    await setUpSubsidiary(ns, "Tobacco", "SmokeBats");

    const ticks = waitForNextCorporationTick(ns);
    while (await ticks.next()) {
        const prepareForInvestment = (retrieveCorporationInstructions(ns)?.prepareForInvestment ?? false);

        researchManager.unlockResearches();
        await improvementManager.buyNextImprovement(6);
        // If trying to get investment, we want all products being sold, rather than cycling through them
        const allowRetiring = investmentManager.getTimesInvested() >= 2 && !prepareForInvestment;
        await productLauncher.launchProducts(allowRetiring);

        await priceManager.updateProductPrices();

        for (const o of offices) {
            await o.buyProductionMultipliers(ticks);
        }

        investmentManager.considerGettingInvestment();
        investmentManager.considerGoingPublic();

        donateToDaedalus(ns);

        await reportCompanyStatus(ns);
    }
}

function isInCorporation(ns: NS): boolean {
    try {
        const corpExists = ns.corporation.getCorporation();
        return (corpExists!=null);
    } catch (err) {
        return false;
    }
}

async function setUpSubsidiary(ns: NS, industry: string, division: string) {
    if (!ns.corporation.getCorporation().divisions.some(d => d.type == industry)) {
        ns.corporation.expandIndustry(industry, division);
        const foodHeadOffice = new OfficeControl(ns, "Sector-12", industry);
        foodHeadOffice.setOfficeSize(3);
        await foodHeadOffice.assignEmployees([ { position: JobPosition.RandD, weight: 1 }]);
    }
}

function donateToDaedalus(ns: NS) {
    const requiredDonation = 10_000_000_000_000_000;
    const isInDaedalus = ns.getPlayer().factions.includes("Daedalus");
    const isPublic = ns.corporation.getCorporation().public;
    const sufficientMoney = ns.corporation.getCorporation().funds > requiredDonation * 1.5;
    const daedalusReputationLow = ns.getFactionRep("Daedalus") < 10_000_000_000;

    if (isInDaedalus && isPublic && sufficientMoney && daedalusReputationLow) {
        ns.print("Bribing Daedalus to increase reputation");
        ns.corporation.bribe("Daedalus", requiredDonation, 0);
    }
    
}
