import { setupDatabase, recordStockValues } from '/tix/libTix';
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	const version = 6;
	const storeName = "historicalTickStore"+version;
	ns.tprint(`Storing values to ${storeName}`);
	const db = await setupDatabase(ns, storeName, version);
	await recordStockValues(ns, db, storeName);
}