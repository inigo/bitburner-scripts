import {NS} from '@ns'
/// List executable scripts with their description (extracted from doc comments beginning ///)

export async function main(ns: NS) {
    const sourceFiles = ns.ls("home")
        .filter(f => f.endsWith(".js") || f.endsWith(".ts"))
        .filter(f => !f.startsWith("lib"))
        .filter(f => f != "utils.js")
        .filter(f => f.split("/").length <= 2);
    const commentedFiles = sourceFiles.map(f => { return { file: f, comments: extractDocComments(ns, f) } });
    const filesWithComments = commentedFiles.filter(fwc => fwc.comments.length > 0);
    const commands = filesWithComments.map(fwc => `${fwc.file}: ${fwc.comments}`).join("\n");
    ns.tprint(`Available commands are:\n\n${commands}`);
}


function extractDocComments(ns: NS, f: string) {
    const txt = ns.read(f);
    return txt.split(/[\n\r]+/)
        .filter(s => s.startsWith("///"))
        .map(s => s.replace("///", ""))
        .join(" ").trim();
}
