import { NS } from '@ns';
import { maybeBuyStanekAugmentation } from "@/augment/libAugmentations";

export async function main(ns: NS): Promise<void> {
    const boughtStanek = maybeBuyStanekAugmentation(ns);
    if (boughtStanek) {
        ns.toast("Bought Stanek's gift");
    }
}