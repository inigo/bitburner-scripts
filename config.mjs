import { context } from 'esbuild';
import { BitburnerPlugin } from 'esbuild-bitburner-plugin';

const createContext = async () => await context({
    entryPoints: [
        'src/**/*.js',
        'src/**/*.jsx',
        'src/**/*.ts',
        'src/**/*.tsx',
    ],
    logOverride: {
        'direct-eval': 'silent'
    },
    outbase: "./src",
    outdir: "./dist/",
    plugins: [
        BitburnerPlugin({
            port: 12525,
            types: 'NetscriptDefinitions.d.ts',
            mirror: {
            },
            distribute: {
            },
        })
    ],
    bundle: false,
    format: 'esm',
    platform: 'browser',
    logLevel: 'debug',
    legalComments: 'inline',
});

const ctx = await createContext();
ctx.watch();