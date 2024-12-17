
export function say(message: string): void {
    try {
/*
        const ss: SpeechSynthesis = eval("window").speechSynthesis;
        const preferredVoiceName = "Daniel";
        const voices = ss.getVoices().filter(v => v.lang.startsWith("en"));
        const chosenVoice = voices.find(v => v.name==preferredVoiceName) ?? voices.at(0)!;

        const msg = new SpeechSynthesisUtterance(message);
        msg.voice = chosenVoice;
        ss.speak(msg);
*/
    } catch (err) {
        // Ignore
    }
}
