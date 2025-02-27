/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {formatMoney} from "@/libFormat";
import * as ports from "@/libPorts";
import {HashSpendReport, HashUpgrade, lookupHashIcons, retrieveHashNumber} from "@/hacknet/libHashes";
import {lookupSleeveIcon, retrieveSleeveTasks} from "@/sleeve/libSleeve";
import {CombinedFragment, lookupFragmentTypeIcon} from "@/stanek/libFragment";
import {receiveAttackTarget} from "@/spread/libSpread";
import {CorporationStatus, retrieveCompanyStatus} from "@/corp/libCorporation";
import {retrieveShareStatus, ShareStatus} from "@/tix/libShareInfo";
import {lookupGangTaskIcon, retrieveGangInfo} from "@/crime/libGangInfo";
import {AugReport, retrieveAugInfo} from "@/augment/libAugmentationInfo";
import {NS} from '@ns'

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const doc: Document = eval("document");

    const labelCell = doc.getElementById('overview-extra-hook-0')!;
    const valueCell = doc.getElementById('overview-extra-hook-1')!;

    ns.atExit(() => {
        labelCell.innerText="";
        valueCell.innerText="";
    });

    while (true) {
        try {
            const headers = []
            const values = [];

            const income = formatMoney(ns, ns.getTotalScriptIncome()[0]) + '/s';
            headers.push("Income: ");
            values.push(income);

            const hackExp = ns.nFormat(ns.getTotalScriptExpGain(), "0.00a");
            headers.push("Hack exp: ");
            values.push(hackExp + '/s');

            const shareInfo = getShareStatus(ns);
            if (shareInfo!=null) {
                const shareValue = formatMoney(ns, shareInfo.value);
                headers.push((shareInfo.has4S ?  "Shares (4S): " : "Shares: "));
                values.push(shareValue);

                const totalMoney = formatMoney(ns, ns.getServerMoneyAvailable("home") + shareInfo.value);
                headers.push("Total money: ");
                values.push(totalMoney);
            }

            const augInfo = getAugInfo(ns);
            if (augInfo!=null) {
                headers.push("Available augs: ");
                values.push(`${augInfo.augCount} (${augInfo.neurofluxCount})`);
            }

            const spreadAttackTarget = getSpreadAttackTarget(ns);
            if (spreadAttackTarget!=null) {
                headers.push("Spread target: ");
                values.push(spreadAttackTarget);
            }

            const hashnetExchange = getHashnetExchangeIcons(ns);
            const hashCount = retrieveHashNumber(ns);
            if (hashnetExchange!=null) {
                headers.push("Hashes: ");
                const hashForDisplay = (Math.round(hashCount / 100) * 100).toString().padStart(6, ' '); // Avoids spurious precision
                values.push(`${hashnetExchange} ${hashForDisplay}`);
            }

            const sleeveIcons = getSleeveIcons(ns);
            if (sleeveIcons!=null) {
                headers.push("Sleeves: ");
                values.push(sleeveIcons);
            }     

            const stanekIcons = getStanekIcons(ns);
            if (stanekIcons!=null && stanekIcons.length > 0) {
                headers.push("Stanek: ");
                values.push(stanekIcons);
            }     

            const gangInfo = getGangInfo(ns);
            if (gangInfo!=null) {
                headers.push("﹏﹏﹏﹏");
                values.push("﹏﹏﹏﹏");

                headers.push("Gang income:");
                const gangIncome = formatMoney(ns, gangInfo.gangIncome * 5) + '/s';
                values.push(gangIncome);

                headers.push("Gang rep:");
                values.push(ns.nFormat(gangInfo.factionRep, "0,0"));  

                const warfareIcon = gangInfo.isWarfare ? " (⚔)" : "";
                headers.push("Territory"+warfareIcon+":");
                values.push(ns.nFormat(gangInfo.territory*100, "0.0")+"%");

                headers.push("Gang: ");
                values.push(gangInfo.icons);
            }  else {
                const requiredGangKarma = -54000;
                const karma = Math.floor(ns.heart.break());
                const karmaMsg = (karma > requiredGangKarma) ? ` (want ${requiredGangKarma})` : " (enough)";
                headers.push("Karma: ");
                values.push(karma+karmaMsg);
            }
            
            const companyStatus = getCorpStatus(ns);
            if (companyStatus!=null) {
                headers.push("﹏﹏﹏﹏");
                values.push("﹏﹏﹏﹏");

                headers.push("Corp value: ");
                values.push(formatMoney(ns, companyStatus.value));

                headers.push("Corp income: ");
                values.push(formatMoney(ns, companyStatus.companyIncome) + "/s");

                headers.push("Funding round: ");
                values.push( companyStatus.isPublic ? "Public" : companyStatus.investmentRound );

                if (companyStatus.isPublic) {
                    headers.push("Dividends: ")
                    values.push(formatMoney(ns, companyStatus.dividendIncome) + "/s");
                }
            }

            labelCell.innerText = headers.join(" \n");
            valueCell.innerText = values.join("\n");
        } catch (error) { 
            // @ts-ignore
            ns.print("Failed to update: " + error+" at "+error.stack);
        }

        await ns.sleep(1000);
    }

}

function getShareStatus(ns: NS): (ShareStatus | null) {
    return retrieveShareStatus(ns)?? null;
}

function getHashnetExchangeIcons(ns: NS): (string | null) {
    const exchangeTargets = (ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as (HashSpendReport | null))?.targets ?? null;
    if (exchangeTargets==null) return null;

    const names = exchangeTargets.map(o => o.name);
    return lookupHashIcons(names);
}

function getSleeveIcons(ns: NS): (string | null) {
    const sleeveTasks = retrieveSleeveTasks(ns);
    if (sleeveTasks.length==0) return null;

    return sleeveTasks.map(o => (o?.type) || "Idle").map(lookupSleeveIcon).join("");
}

function getGangInfo(ns: NS): (GangInfo | null) {
    const report = retrieveGangInfo(ns);
    if (report==null) return null;

    const gangTasks = report.members
                        .map(g => g.task)
                        .map(lookupGangTaskIcon)
                        .join("");
    return { gangIncome: report.gangInfo.moneyGainRate, icons: gangTasks,
            factionRep: report.factionRep,
            territory: report.gangInfo.territory, isWarfare: report.gangInfo.territoryWarfareEngaged };


}

type GangInfo = { gangIncome: number, icons: string, factionRep: number, territory: number, isWarfare: boolean };

function getStanekIcons(ns: NS): (string | null) {
    const report = ports.checkPort(ns, ports.ACTIVE_FRAGMENTS_PORT, JSON.parse) as (CombinedFragment[] | null);
    if (report==null) return null;

    const stanekTasks = (report as CombinedFragment[]).map(f => f.type).map(lookupFragmentTypeIcon).join("");
    return stanekTasks;
}

function getSpreadAttackTarget(ns: NS): (string | null) {
    const instructions = receiveAttackTarget(ns);
    return instructions?.targetServer ?? null;
}

function getCorpStatus(ns: NS): (CorporationStatus | null) {
    return retrieveCompanyStatus(ns);
}

function getAugInfo(ns: NS): (AugReport | null) {
    return retrieveAugInfo(ns);
}