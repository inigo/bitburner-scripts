/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns';
import { waitForNextCorporationTick, retrieveCorporationInstructions } from 'corp/libCorporation';
import { ImprovementManager } from 'corp/libImprovements';
import { ProductPriceManager, ProductLauncher } from '/corp/libProducts';

export async function main(ns : NS) : Promise<void> {
    ns.disableLog("sleep");
    await manageCorporation(ns, "Tobacco");
}

export async function manageCorporation(ns: NS, industry: string): Promise<void> {
    const improvementManager = new ImprovementManager(ns, industry);
    const productLauncher = new ProductLauncher(ns, industry);
    const priceManager = new ProductPriceManager(ns, industry);
    const ticks = waitForNextCorporationTick(ns);
    while (await ticks.next()) {
        const prepareForInvestment = (retrieveCorporationInstructions(ns)?.prepareForInvestment ?? false);

        await improvementManager.buyNextImprovement();
        // If trying to get investment, we want all products being sold, rather than cycling through them
        if (!prepareForInvestment) {
            await productLauncher.launchProducts();
        }
        await priceManager.updateProductPrices();
    }
}
