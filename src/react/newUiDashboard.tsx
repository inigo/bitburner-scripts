/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {formatMoney} from "libFormat";
import * as ports from "libPorts";
import {HashSpendReport, HashUpgrade, lookupHashIcons, retrieveHashNumber} from "hacknet/libHashes";
import {lookupSleeveIcon, retrieveSleeveTasks} from "sleeve/libSleeve";
import {CombinedFragment, lookupFragmentTypeIcon} from "stanek/libFragment";
import {receiveAttackTarget} from "spread/libSpread";
import {CorporationStatus, retrieveCompanyStatus} from "corp/libCorporation";
import {retrieveShareStatus, ShareStatus} from "tix/libShareInfo";
import {lookupGangTaskIcon, retrieveGangInfo} from "crime/libGangInfo";
import {AugReport, retrieveAugInfo} from "augment/libAugmentationInfo";
import {NS, SleeveTask} from '@ns'
import {domDocument, domWindow, React, ReactDOM} from "/react/libReact";
import {Button} from "/react/components/Button";

const { useState, useEffect } = React;
const requiredGangKarma = -54000;


export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const eventName = `uiDashboard-${ns.pid}-${Date.now()}`;

    const hookNode = domDocument.getElementById("overview-extra-hook-0") !;
    // const node = hookNode?.parentNode as HTMLElement;

    ReactDOM.render(
        <React.StrictMode>
            <UiDashboard ns={ns} eventName={eventName} />
        </React.StrictMode>,
        hookNode
    );

    ns.atExit(() => {
        ReactDOM.unmountComponentAtNode(hookNode);
    });

    while (true) {
        domWindow.dispatchEvent(new Event(eventName));
        await ns.asleep(1000);
    }

}


function UiDashboard({ns, eventName}: { ns: NS, eventName: string }) {
    const [income, setIncome] = useState(0);
    const [hackExp, setHackExp] = useState(0);

    const [shareInfo, setShareInfo] = useState<ShareStatus | null>(null);
    const [totalMoney, setTotalMoney] = useState(0);

    const [augReport, setAugReport] = useState<AugReport | null>(null);
    const [spreadAttackTarget, setSpreadAttackTarget] = useState<string | null>(null);
    const [sleeveTasks, setSleeveTasks] = useState<(SleeveTask | null)[]>([]);

    const [hashnetIcons, setHashnetIcons] = useState<string | null>(null);
    const [hashCount, setHashCount] = useState(0);

    const [stanekIcons, setStanekIcons] = useState<string | null>(null);
    const [gangInfo, setGangInfo] = useState<GangInfo | null>(null);
    const [karma, setKarma] = useState(0);
    const [companyStatus, setCompanyStatus] = useState<CorporationStatus | null>(null);

    const handleTick = () => {
        setIncome(ns.getTotalScriptIncome()[0]);
        setHackExp(ns.getTotalScriptExpGain());

        const shareInfo = getShareStatus(ns);
        setShareInfo(shareInfo);
        const totalMoney = ns.getServerMoneyAvailable("home") + (shareInfo?.value ?? 0);
        setTotalMoney(totalMoney);

        setAugReport(getAugInfo(ns));
        setSpreadAttackTarget(getSpreadAttackTarget(ns));
        setSleeveTasks(retrieveSleeveTasks(ns));

        setHashnetIcons(getHashnetExchangeIcons(ns));
        setHashCount(retrieveHashNumber(ns));

        setStanekIcons(getStanekIcons(ns));

        setGangInfo(getGangInfo(ns));
        setKarma(ns.heart.break());

        setCompanyStatus(getCorpStatus(ns));
    };

    useEffect(() => {
        domWindow.addEventListener(eventName, handleTick);
        // Clean up event listener when component unmounts
        return () => domWindow.removeEventListener(eventName, handleTick);
    }, [eventName]); // Add eventName to dependency array since we're using it in the effect

    const rounded = (count: number) => (Math.round(count / 100) * 100).toString().padStart(6, ' ');

    return (
        <div className={"uiDashboard"} style={{display: "flex", flexDirection: "column", height: "100%"}}>
            <div>Income: {formatMoney(ns, income)}/s</div>
            <div>Hack experience: {ns.nFormat(hackExp, "0.00a")}/s</div>
            {shareInfo && (
                <>
                    <div>Shares {shareInfo.has4S ? "(4S)" : ""}: {formatMoney(ns, shareInfo.value)} {shareInfo.value > 0 &&
                        <SmallButton title={"Sell"} onButtonClick={() => maybeSellShares(ns)} bg={"black"}/>} </div>
                    <div>Total money: {formatMoney(ns, totalMoney)}</div>
                </>
            )}
            {augReport && (
                <div>Available augs: <span title={augReport.installableAugs.map(a => a.name).join(", ") }>{augReport.augCount} ({augReport.neurofluxCount} neuroflux)</span></div>
            )}
            {spreadAttackTarget && (
                <div>Spread target: {spreadAttackTarget}</div>
            )}
            {(sleeveTasks.length > 0) && (
                <div>Sleeves: {sleeveTasks.map(o => (o?.type) || "Idle").map(lookupSleeveIcon).join("")}</div>
            )}
            {(hashnetIcons || hashCount > 0) && (
                <div>Hashes: {hashnetIcons} {rounded(hashCount)}</div>
            )}
            {stanekIcons && stanekIcons.length > 0 && (
                <div>Stanek: {stanekIcons}</div>
            )}
            {gangInfo && (
                <>
                    <div>Gang income: {formatMoney(ns, gangInfo.gangIncome * 5)}/s</div>
                    <div>Gang rep: {ns.nFormat(gangInfo.factionRep, "0,0")}</div>
                    <div>Territory{gangInfo.isWarfare ? " (⚔)" : ""}: {ns.nFormat(gangInfo.territory*100, "0.0")}%</div>
                    <div>Gang: {gangInfo.icons}</div>
                </>
            )}
            {!gangInfo && (
                <div>Karma: {Math.floor(karma)} (want {requiredGangKarma})</div>
            )}
            {companyStatus && (
                <>
                    <div>Corp value: {formatMoney(ns, companyStatus.value)}</div>
                    <div>Corp income: {formatMoney(ns, companyStatus.companyIncome)}/s</div>
                    <div>Funding round: { companyStatus.isPublic ? "Public" : companyStatus.investmentRound }</div>
                    {companyStatus.isPublic && (
                        <div>Dividends: {formatMoney(ns, companyStatus.dividendIncome)}/s</div>
                    )}
                </>
            )}
        </div>
    );
}

function SmallButton({title, onButtonClick, bg}: { title: string, onButtonClick: () => void, bg: string }) {
    return <span style={{background: bg, border: 'solid 1px white', padding: '4px', boxShadow: '#3f3 3px 3px 5px', borderRadius: '5px'}}
                 onClick={onButtonClick}>{title}</span>
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

// ------


function doSomething(ns: NS) {
    ns.tprint("Message!");
}

async function maybeSellShares(ns: NS) {
    ns.tprint("Selling shares!");
    // @todo removed temporarily to reduce RAM usage
    // ns.run("/tix/sellShares.js");
}
