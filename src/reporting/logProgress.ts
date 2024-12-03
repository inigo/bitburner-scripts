import {CrimeType, NS, SleeveCrimeTask} from '@ns'
import {retrieveCompanyStatus} from "corp/libCorporation";
import {retrieveSleeveTasks} from "sleeve/libSleeve";
import {retrieveGangInfo} from "crime/libGangInfo";

export async function main(ns : NS) : Promise<void> {
    const reporter = new Reporter(ns);
    const args = (ns.args.length > 0) ? ns.args[0] as string : "";
    await reporter.logSignificantEvents(args);
    await reporter.regularLog();
}

class Reporter {
    constructor(private ns: NS) {
    }

    async logSignificantEvents(explicitEvent = ""): Promise<void> {
        const gangInfo = retrieveGangInfo(this.ns);
        const corpInfo = retrieveCompanyStatus(this.ns);
        const sleeveInfo = retrieveSleeveTasks(this.ns);

        const currentState = [
            "bitNodeStarted",
            gangInfo!=null ? "gangStarted" : ""
            , gangInfo?.members.length==12 ? "gangAllRecruited" : ""
            , (gangInfo?.gangInfo?.territory ?? 0) > 0.3 ? "gangSomeTerritory" : ""
            , (gangInfo?.gangInfo?.territory ?? 0) > 0.5 ? "gangLargeTerritory" : ""
            , corpInfo!=null ? "corporationStarted" : ""
            , (corpInfo?.investmentRound ?? -1) == 1 ? "corporationFinishedStartup" : ""
            , (corpInfo?.investmentRound ?? -1) == 2 ? "corporationTakenSecondInvestment" : ""
            , corpInfo?.isPublic ? "corporationPublic" : ""
            , sleeveInfo.every(s => (s as SleeveCrimeTask)?.crimeType == CrimeType.homicide) ? "sleevesMurdering" : ""
            , this.ns.stock.has4SDataTIXAPI() ? "has4SData" : ""
            , explicitEvent
        ].filter(s => s.length > 0);

        this.ns.print("Current significant events are "+currentState);

        const loggedEvents = (this.retrieveInfo()?.loggedEvents ?? []).map(e => e.name);
        const newEvents = currentState.filter(e => !loggedEvents.includes(e));

        this.ns.print("Already logged events are "+loggedEvents);
         
        for (const e of newEvents) {
            this.ns.print("INFO Recording new event "+e);
            const msg = this.formatEventInfo(e);
            await this.recordEvent(msg);
        }
        if (newEvents.length > 0) {
            this.storeInfo(newEvents);
        }
    }

    async regularLog(): Promise<void> {
        const time = this.getTimeSinceStart();
        const hoursSinceStart = Math.floor(time / (60 * 60 * 1000));
        const event = "time_"+hoursSinceStart;

        const alreadyRecorded = (this.retrieveInfo()?.loggedEvents ?? []).map(e => e.name).includes(event);
        if (! alreadyRecorded) {
            this.ns.print("INFO Recording regular timing log at "+event);
            const msg = this.formatEventInfo(event);
            await this.recordRegularLog(msg);
            this.storeInfo([event]);
        } else {
            this.ns.print("Nothing new to log - "+event+" already recorded");
        }
    }

    private formatEventInfo(event = ""): string {
        const timeSinceStart = this.getTimeSinceStart()
        const fmtTimeSinceStart = this.ns.tFormat(timeSinceStart);
    
        const timeSinceAug = this.ns.getTimeSinceLastAug();
        const fmtTimeSinceAug = this.ns.tFormat(timeSinceAug);
        
        const bitNode = this.getBitNodeNumber();
        const bitNodeLevel = this.getBitNodeLevel();
    
        const homeServerSize = this.ns.getServerMaxRam("home");
    
        const gangInfo = retrieveGangInfo(this.ns);
        const gangSize = gangInfo?.members.length ?? 0;
        const gangTerritory = gangInfo?.gangInfo.territory ?? 0
    
        const corpInfo = retrieveCompanyStatus(this.ns);
        const corpFundingRound = corpInfo?.investmentRound ?? -1;
        const corpIsPublic = corpInfo?.isPublic ?? false;
        const corpIncome = (corpInfo?.companyIncome ?? 0)+ (corpInfo?.dividendIncome ?? 0);
    
        return `${bitNode},${bitNodeLevel},"Times",${timeSinceStart},"${fmtTimeSinceStart}",${timeSinceAug},"${fmtTimeSinceAug}","Home",${homeServerSize},"Gang",${gangSize},${gangTerritory},"Corp",${corpIncome},${corpFundingRound},${corpIsPublic},"Event",${event}`;
    }

    // -- Write to disk

    async recordEvent(msg: string): Promise<void> {
        await this.ns.write("/events.txt", msg+"\n", "a");
    }
    async recordRegularLog(msg: string): Promise<void> {
        await this.ns.write("/regularLog.txt", msg+"\n", "a");
    }
    
    // -- Useful stats
    
    private getBitNodeLevel() { 
        const bitNode = this.getBitNodeNumber();
        return Math.max(... this.ns.singularity.getOwnedSourceFiles().filter(sf => sf.n == bitNode).map(sf => sf.lvl), 0) + 1;
    }
    private getBitNodeNumber() { return this.ns.getResetInfo().currentNode; }
    private getTimeSinceStart() { return new Date().getTime() - this.ns.getResetInfo().lastNodeReset; }

    // -- Store the current log state in local storage

    private getKey(): string {  return this.getBitNodeNumber()+"_"+this.getBitNodeLevel()+"_logging"; }    
    private getStorage(): Storage { return eval("window").localStorage;  }
    private storeInfo(newEvents: string[] = []): void {
        const currentTime = this.getTimeSinceStart();
        const existingEvents = this.retrieveInfo()?.loggedEvents ?? [];
        const mergedEvents = [... existingEvents, ... newEvents.map(e => { return { name: e, timeOccurred: currentTime }; }) ]
        const info: LogInfo = { lastLogTimeSinceStart: currentTime, loggedEvents: mergedEvents };
        this.ns.print("Recording in local storage "+JSON.stringify(info));
        this.getStorage().setItem(this.getKey(), JSON.stringify(info));
    }
    private retrieveInfo(): (LogInfo | null) {
        const item = this.getStorage().getItem(this.getKey());
        return (item==null) ? null : (JSON.parse(item) as LogInfo);
    }
}

type LoggedEvent = { name: string, timeOccurred? : number }
type LogInfo = { lastLogTimeSinceStart: number, loggedEvents: LoggedEvent[]  }