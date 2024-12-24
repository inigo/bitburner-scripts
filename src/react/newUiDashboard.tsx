/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {formatMoney} from "@/libFormat";
import * as ports from "@/libPorts";
import {HashSpendReport, listHashOptions, lookupHashIcons, retrieveHashSpendReport} from "@/hacknet/libHashes";
import {lookupSleeveIcon, retrieveSleeveTasks} from "@/sleeve/libSleeve";
import {CombinedFragment, lookupFragmentTypeIcon} from "@/stanek/libFragment";
import {receiveAttackTarget} from "@/spread/libSpread";
import {CorporationStatus, retrieveCompanyStatus} from "@/corp/libCorporation";
import {retrieveShareStatus, ShareStatus} from "@/tix/libShareInfo";
import {lookupGangTaskIcon, retrieveGangInfo} from "@/crime/libGangInfo";
import {AugReport, retrieveAugInfo} from "@/augment/libAugmentationInfo";
import {NS, SleeveTask} from '@ns'
import {domDocument, domWindow, React, ReactDOM} from "@/react/libReact";

const {useState, useEffect} = React;

const requiredGangKarma = -54000;
const sleeveActions = ["-", "spread", "strength", "agility", "dexterity", "charisma", "defense", "study", "crime", "shock", "home", "volhaven", "clear", "gym"];
const hashActions = ["-", ... listHashOptions().map(h => h.aliases[0])];

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const eventName = `uiDashboard-${ns.pid}-${Date.now()}`;

    const hookNode = domDocument.getElementById("overview-extra-hook-0") !;
    // const node = hookNode?.parentNode as HTMLElement;

    ReactDOM.render(
        <React.StrictMode>
            <UiDashboard ns={ns} eventName={eventName}/>
        </React.StrictMode>,
        hookNode
    );

    ns.atExit(() => {
        ReactDOM.unmountComponentAtNode(hookNode);
    });

    // noinspection InfiniteLoopJS
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
    const [hashSpendReport, setHashSpendReport] = useState<HashSpendReport | null>(null);
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
        setHashSpendReport(retrieveHashSpendReport(ns));
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
            <MetricItem label="Income">{formatMoney(ns, income)}</MetricItem>
            <MetricItem label="Hack experience">{ns.nFormat(hackExp, "0.00a")}/s</MetricItem>
            {shareInfo && (
                <>
                    <MetricItem label={"Shares" + (shareInfo.has4S ? "(4S)" : "")}>
                        {formatMoney(ns, shareInfo.value)}
                        {shareInfo.value > 0 && <SmallButton title={"Sell"} onButtonClick={() => sellAllShares(ns)}/>}
                    </MetricItem>
                    <MetricItem label="Total money">{formatMoney(ns, totalMoney)}</MetricItem>
                </>
            )}
            {augReport && (
                <MetricItem label="Available augs" tooltip={augReport.installableAugs.map(a => a.name).join(", ")}>
                    {augReport.augCount} ({augReport.neurofluxCount} neuroflux)
                </MetricItem>
            )}
            {spreadAttackTarget && (
                <MetricItem label="Spread target">{spreadAttackTarget}</MetricItem>
            )}
            {sleeveTasks.length > 0 && (
                <MetricItem label="Sleeves">
                    {sleeveTasks.map(o => (o?.type) || "Idle").map(lookupSleeveIcon).join("")}
                    <ActionSelector options={sleeveActions} selected={"-"} onOptionChange={async (newOption) => await controlSleeves(ns, newOption)} />
                </MetricItem>
            )}
            {(hashSpendReport) && (
                <MetricItem label="Hashes">
                    {lookupHashIcons(hashSpendReport.targets.map(t => t.name))} {hashSpendReport.setManually ? "(manual)" : "(auto)"}  {rounded(hashSpendReport.numHashes)}
                    <ActionSelector options={hashActions} selected={"-"} onOptionChange={async (newOption) => await buyHashes(ns, newOption)} />
                </MetricItem>
            )}
            {stanekIcons && stanekIcons.length > 0 && (
                <MetricItem label="Stanek">{stanekIcons}</MetricItem>
            )}
            {gangInfo && (
                <>
                    <MetricItem label="Gang income">{formatMoney(ns, gangInfo.gangIncome * 5)}/s</MetricItem>
                    <MetricItem label="Gang rep">{ns.nFormat(gangInfo.factionRep, "0,0")}</MetricItem>
                    <MetricItem label={`Territory${gangInfo.isWarfare ? " (⚔)" : ""}`}>
                        {ns.nFormat(gangInfo.territory * 100, "0.0")}%
                    </MetricItem>
                    <MetricItem label="Gang">{gangInfo.icons}</MetricItem>
                </>
            )}
            {!gangInfo && (
                <MetricItem label="Karma">{Math.floor(karma)} (want {requiredGangKarma})</MetricItem>
            )}
            {companyStatus && (
                <>
                    <MetricItem label="Corp value">{formatMoney(ns, companyStatus.value)}</MetricItem>
                    <MetricItem label="Corp income">{formatMoney(ns, companyStatus.companyIncome)}/s</MetricItem>
                    <MetricItem label="Funding round">{companyStatus.isPublic ? "Public" : companyStatus.investmentRound}</MetricItem>
                    {companyStatus.isPublic && (
                        <MetricItem label="Dividends">{formatMoney(ns, companyStatus.dividendIncome)}/s</MetricItem>
                    )}
                </>
            )}
        </div>
    );
}

const MetricItem: React.FC<{
    label: string;
    children: React.ReactNode;
    tooltip?: string;
}> = ({label, children, tooltip}) => (
    <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "4px 0"}} title={tooltip}>
        <span style={{color: "#bbb"}}>{label}:</span>
        <span style={{fontWeight: 500, justifyContent: "space-between", marginLeft: "auto"}}>{children}</span>
    </div>
);

function SmallButton({title, onButtonClick, bg = "black"}: { title: string, onButtonClick: () => void, bg?: string }) {
    return <span style={{background: bg, border: 'solid 1px white', padding: '4px', boxShadow: '#3f3 3px 3px 5px', borderRadius: '5px'}}
                 onClick={onButtonClick}>{title}</span>
}

function ActionSelector({options, selected, onOptionChange}: { options: string[], selected: string, onOptionChange: (option: string) => void }) {
    return (
        <span style={{fontWeight: 500, justifyContent: "space-between", marginLeft: "auto", width: "10px", display: "inline-block" }}>
            <select style={{width: "40px"}}  value={selected} onChange={(e) => onOptionChange(e.target.value)} >
                {options.map(o =>
                    <option key={o} value={o}>{o}</option>
                )}
            </select>
        </span>
    )
}

function getShareStatus(ns: NS): (ShareStatus | null) {
    return retrieveShareStatus(ns) ?? null;
}

function getHashnetExchangeIcons(ns: NS): (string | null) {
    const exchangeTargets = (ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as (HashSpendReport | null))?.targets ?? null;
    if (exchangeTargets == null) return null;

    const names = exchangeTargets.map(o => o.name);
    return lookupHashIcons(names);
}

function getSleeveIcons(ns: NS): (string | null) {
    const sleeveTasks = retrieveSleeveTasks(ns);
    if (sleeveTasks.length == 0) return null;

    return sleeveTasks.map(o => (o?.type) || "Idle").map(lookupSleeveIcon).join("");
}

function getGangInfo(ns: NS): (GangInfo | null) {
    const report = retrieveGangInfo(ns);
    if (report == null) return null;

    const gangTasks = report.members
        .map(g => g.task)
        .map(lookupGangTaskIcon)
        .join("");
    return {
        gangIncome: report.gangInfo.moneyGainRate, icons: gangTasks,
        factionRep: report.factionRep,
        territory: report.gangInfo.territory, isWarfare: report.gangInfo.territoryWarfareEngaged
    };


}

type GangInfo = { gangIncome: number, icons: string, factionRep: number, territory: number, isWarfare: boolean };

function getStanekIcons(ns: NS): (string | null) {
    const report = ports.checkPort(ns, ports.ACTIVE_FRAGMENTS_PORT, JSON.parse) as (CombinedFragment[] | null);
    if (report == null) return null;

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



async function sellAllShares(ns: NS) {
    ns.tprint("Selling shares!");
    ns.run("/tix/sellAllShares.js");
}

async function controlSleeves(ns: NS, newObjective: string) {
    ns.tprint("Setting sleeves to "+newObjective);
    ns.run("/sleeve/sleeveControl.js", 1, newObjective);
}

async function buyHashes(ns: NS, target: string) {
    ns.tprint("Buying hashes: "+target);
    ns.run("/hacknet/hashControl.js", 1, target);
}
