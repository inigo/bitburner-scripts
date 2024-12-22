import {CompanyName, CompanyPositionInfo, JobName, NS, Skills} from "@ns";

export async function main(ns: NS) {
    await doAvailablePromotions(ns);

    /*
    const employer = ns.args[0] as CompanyName;

    const companies = [
        { company: "Clarke Incorporated", faction: "Clarke Incorporated", servers: [ "clarkinc" ], reputation: 200000, city: "Aevum", advances: ["Neuronal Densification", "nextSENS Gene Modification"] }
        , { company: "OmniTek Incorporated", faction: "OmniTek Incorporated", servers: [ "omnitek" ], reputation: 200000, city: "Volhaven", advances: ["OmniTek InfoLoad"] }
        , { company: "Fulcrum Technologies", faction: "Fulcrum Secret Technologies", servers: [ "fulcrumtech", "fulcrumassets" ], reputation: 250000, city: "Aevum" }
        , { company: "ECorp", faction: "ECorp", servers: [ "ecorp" ], reputation: 200000, city: "Aevum" },
        // nwo
        // bachman SmartJaw
        // megacorp CordiARC Fusion Reactor
        // kuaigong
    ]

    const roles = [
        { name: "Software Engineering Intern", companyRep: 0, charisma: 0, hacking: 1 },
        { name: "Junior Software Engineer", companyRep: 8000, charisma: 0, hacking: 51 },
        { name: "Senior Software Engineer", companyRep: 40000, charisma: 51, hacking: 251 },
        { name: "Lead Software Developer", companyRep: 200000, charisma: 151, hacking: 401 },
        { name: "Head of Software", companyRep: 400000, charisma: 251, hacking: 501 },
        { name: "Head of Engineering", companyRep: 800000, charisma: 251, hacking: 501 },
        { name: "Vice President of Technology", companyRep: 1600000, charisma: 401, hacking: 601 },
        { name: "Chief Technology Officer", companyRep: 3200000, charisma: 501, hacking: 751 },
    ];

    const company = companies.find(c => c.company == employer);
    if (company == undefined) {
        ns.tprint("ERROR: Unknown company "+employer);
        return;
    }
    const requiredReputation = company.reputation;

    while (ns.singularity.getCompanyRep(employer)<requiredReputation) {
        ns.singularity.applyToCompany(employer, "Software");

        ns.singularity.workForCompany(employer);
        // ns.singularity.getCompanyPositionInfo()
        const companyPositions = ns.singularity.getCompanyPositions(employer);

        // Promote
    }

    // List all current jobs, and get promotions if possible
    // Also, have sleeves working in jobs
    */

}

async function doAvailablePromotions(ns: NS): Promise<void> {
    const currentJobs = ns.getPlayer().jobs;

    for (const [company, position] of Object.entries(currentJobs) as [CompanyName, JobName][]) {
        console.log(`Company: ${company}, Position: ${position}`);
        const positionInfo = ns.singularity.getCompanyPositionInfo(company, position);
        const nextPositionName = positionInfo.nextPosition;

        if (nextPositionName) {
            const nextPositionInfo = ns.singularity.getCompanyPositionInfo(company, nextPositionName);

            const currentReputation = ns.singularity.getCompanyRep(company);
            const requiredReputation = nextPositionInfo.requiredReputation;

            const sufficientReputation = currentReputation >= requiredReputation;

            const currentSkills = ns.getPlayer().skills;
            const requiredSkills = nextPositionInfo.requiredSkills;
            type SkillName = keyof Skills;

            const missingSkills = [];
            for (const skill of Object.keys(currentSkills) as SkillName[]) {
                const current = currentSkills[skill];
                const required = requiredSkills[skill];
                if (current < required) {
                    missingSkills.push(skill);
                }
            }

            ns.print(`Reputation needed ${requiredReputation} - currently ${Math.floor(currentReputation)}. ${missingSkills.length==0 ? "All skills present" : "Missing skills "+missingSkills }`);

            ns.print(`Trying for a promotion to ${nextPositionName} at ${company}`);
            ns.singularity.applyToCompany(company, positionInfo.field);
        } else {
            ns.print(`Already reached highest position available at ${company}`)
        }
    }
}