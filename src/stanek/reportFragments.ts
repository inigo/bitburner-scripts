import { reportFragments } from "@/stanek/libFragment";

/**
 * List all the active fragments and write them to a port: consumed by  
 * chargeFragments and the dashboard.
 */
export async function main(ns: NS): Promise<void> {
	await reportFragments(ns);
}