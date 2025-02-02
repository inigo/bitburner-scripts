import { TargetFinder }  from "@/attack/libTargets";
import { PrettyTable }  from "@/libFormat";
import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	const launchServer: string = (ns.args[0] as string) ?? "home";
	const launchServerRam: number = (ns.args[1] as number) ?? ns.getServerMaxRam(launchServer);
	const launchServerCores = ns.getServer(launchServer).cpuCores;
	const moneyToTakePercent: number = (ns.args[2] as number) ?? 0.5;

	const table = new PrettyTable(ns, ["Name", "Status", "Quick ($/s)", "Max ($/s)", "Security", "Money ($)", "Attack time", "Memory", "Threads", "Prime in"]);
	const targetFinder = new TargetFinder(ns);
	const targets = targetFinder.listBestTargets(60, launchServerRam, launchServerCores, moneyToTakePercent);
	for (const t of targets.slice(0,20)) {
		table.addRow([t.name, (t.isAttacked ? "Hack" : " "), t.incomeWithinPeriodPerSecond, t.incomePerSecond, t.minSecurity, t.maxMoney, t.time, t.totalMemory, t.threads, t.initialPrimeTime ]);
	}
	ns.tprintf("%s", table.display());
}
