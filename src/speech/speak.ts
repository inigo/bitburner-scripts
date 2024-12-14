import { NS } from '@ns'
import { say } from "speech/libSpeech"

/// Say a specified message

export async function main(ns : NS) : Promise<void> {
    const msg = ns.args[0] ?? "Hello, I am a fish and I like to play Bitburner";
    say(msg as string);
}
