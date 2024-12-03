import { NS } from '@ns'
import { say } from "speech/libSpeech"

export async function main(ns : NS) : Promise<void> {
    say("Hello, I am Daniel and I am a fish");
}
