/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    ns.tprint(new ProductNamer().getName());
}

export class ProductNamer {
    private adjectives = [ "Super", "Ultra", "Neon", "Shiny", "Steam", "Bold", "Cosmic", "Supreme", "Enviro", "Green", "Ultimate", "Pointy", "Pro", "Fancy", "Rainbow", "Open"];
    private prefixes = [ "i", "e", "meta", "mecha", "hydro", "bit", "robo", "hi" ];
    private nouns = [ "Pioneer", "Focus", "Explorer", "Compass", "Advance", "Direction", "Progress", "Inspire", "Turbine", "Pinnacle", "Zenith", "Noodles", "Flux", "Nostril", "Vivid" ];

    getName(): string {
        return this.adjective() 
                + ((this.random(2)==0) ? this.adjective() : "")
                + ((this.random(3)==0) ? this.prefix() : "")
                + this.noun();
    }
    getUniqueName(existingNames: string[]): string {
        while (true) {
            const name = this.getName();
            if (!existingNames.includes(name)) { return name; }
        }
    }

    private adjective() { return this.randomOf(this.adjectives)+" "; }
    private prefix() { return this.randomOf(this.prefixes); }
    private noun() { return this.randomOf(this.nouns); }

    private randomOf(vals: string[]): string { return vals.at(this.random(vals.length)) !; }
    private random(max: number) { return Math.floor(Math.random()*max); }    
}