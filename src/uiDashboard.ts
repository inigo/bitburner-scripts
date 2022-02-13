/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { formatMoney } from "libFormat";
import * as ports from "libPorts";
import { lookupHashIcons, HashUpgrade } from "hacknet/libHashes";
import { lookupSleeveIcon } from "sleeve/libSleeve";
import { lookupGangTaskIcon, GangReport } from "crime/libGang";
import { lookupFragmentTypeIcon, CombinedFragment } from "stanek/libFragment";
import { receiveAttackTarget, SpreadAttackInstructions } from "spread/libSpread";

import { NS, SleeveTask } from '@ns'

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

            const karma = Math.floor(ns.heart.break());
            headers.push("Karma: ");
            values.push(karma);

            const income = formatMoney(ns, ns.getScriptIncome()[0]) + '/s';
            headers.push("Income: ");
            values.push(income);

            const hackExp = ns.nFormat(ns.getScriptExpGain(), "0.00a");
            headers.push("Hack exp: ");
            values.push(hackExp + '/s');

            const ownedShareValue = getOwnedShareValue(ns);
            if (ownedShareValue!=null) {
                const shareValue = formatMoney(ns, ownedShareValue);
                headers.push("Shares: ");
                values.push(shareValue);

                const totalMoney = formatMoney(ns, ns.getServerMoneyAvailable("home") + ownedShareValue);
                headers.push("Total money: ");
                values.push(totalMoney);
            }

            const spreadAttackTarget = getSpreadAttackTarget(ns);
            if (spreadAttackTarget!=null) {
                headers.push("Spread target: ");
                values.push(spreadAttackTarget);
            }

            const hashnetExchange = getHashnetExchangeIcons(ns);
            if (hashnetExchange!=null) {
                headers.push("Hashes: ");
                values.push(hashnetExchange);
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
                headers.push("Gang income:");
                const gangIncome = formatMoney(ns, gangInfo.gangIncome * 5) + '/s';
                values.push(gangIncome);
                headers.push("Gang: ");
                values.push(gangInfo.icons);
            }                        


            labelCell.innerText = headers.join(" \n");
            valueCell.innerText = values.join("\n");
        } catch (error) { 
            ns.print("Failed to update: " + error);
        }

        await ns.sleep(1000);
    }

}

function getOwnedShareValue(ns: NS): (number | null) {
    return ports.checkPort(ns, ports.SHARE_VALUE_PORT, parseInt);
}

function getHashnetExchangeIcons(ns: NS): (string | null) {
    const exchangeTargets = ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as (HashUpgrade[] | null);
    if (exchangeTargets==null) return null;

    const names = exchangeTargets.map(o => o.name);
    return lookupHashIcons(names);
}

function getSleeveIcons(ns: NS): (string | null) {
    const sleeveTasks = ports.checkPort(ns, ports.SLEEVE_REPORTS_PORT, JSON.parse) as (SleeveTask[] | null);
    if (sleeveTasks==null) return null;

    const icons = sleeveTasks.map(o => o.task).map(lookupSleeveIcon).join("");
    return icons;
}

function getGangInfo(ns: NS): (GangInfo | null) {
    const report = ports.checkPort(ns, ports.GANG_REPORTS_PORT, JSON.parse) as (GangReport | null);
    if (report==null) return null;

    const gangTasks = report.members
                        .map(g => g.task)
                        .map(lookupGangTaskIcon)
                        .join("")
                        // .match(/(.{1,6})/gu).join("\n");
    const result = { gangIncome: report.gangInfo.moneyGainRate, icons: gangTasks };
    return result;
}

type GangInfo = { gangIncome: number, icons: string };

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