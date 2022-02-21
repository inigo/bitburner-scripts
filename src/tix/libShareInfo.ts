import { NS } from '@ns'
import * as ports from "libPorts";

export function retrieveShareStatus(ns: NS): (ShareStatus | null) {
	return ports.checkPort(ns, ports.SHARETRADING_REPORTS_PORT, JSON.parse);
}

export type ShareStatus = { value: number, longStocks: string[], shortStocks: string[] };
