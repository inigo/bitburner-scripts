/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';
import { waitForNextCorporationTick, retrieveCorporationInstructions, listCities } from 'corp/libCorporation';
import { ImprovementManager } from 'corp/libImprovements';
import { ProductPriceManager, ProductLauncher } from '/corp/libProducts';
import { ResearchManager } from '/corp/libResearch';
import { OfficeControl } from 'corp/libOffice'

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");
    await manageCorporation(ns, "Software");
}

export async function manageCorporation(ns: NS, industry: string): Promise<void> {
    const improvementManager = new ImprovementManager(ns, industry);
    const productLauncher = new ProductLauncher(ns, industry);
    const priceManager = new ProductPriceManager(ns, industry);
    const researchManager = new ResearchManager(ns);
    const offices = listCities().map(city => new OfficeControl(ns, city, industry));  
    offices.forEach(o => o.sellAllMaterials(1, "PROD"));
    offices.forEach(o => o.enableSmartSupply());
    const ticks = waitForNextCorporationTick(ns);
    while (await ticks.next()) {
        const prepareForInvestment = (retrieveCorporationInstructions(ns)?.prepareForInvestment ?? false);

        researchManager.unlockResearches();
        await improvementManager.buyNextImprovement();
        // If trying to get investment, we want all products being sold, rather than cycling through them
        if (!prepareForInvestment) {
            await productLauncher.launchProducts();
        }
        await priceManager.updateProductPrices();

        for (const o of offices) {
            await o.buyProductionMultipliers(ticks);
        }
    }
}
