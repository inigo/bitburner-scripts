/* eslint-env node */
import {defineConfig} from 'viteburner';
import {resolve} from 'path';

export default defineConfig({
    /** basic vite configs */
    resolve: {
        alias: {
            /** path to your source code */
            '@': resolve(__dirname, 'src'),
            '/src': resolve(__dirname, 'src'),
            react: resolve(__dirname, 'src', 'vendored', 'react.js'),
        },
    },
    build: {
        minify: false,
        sourcemap: "inline"
    },
    /** viteburner configs */
    viteburner: {
        watch: [
            {
                pattern: 'src/**/*.{js,ts}',
                transform: true,
            },
            {pattern: 'src/**/*.{script,txt}'},
            {
                pattern: 'src/**/*.tsx',
                transform: true,
                location: (file) => ({filename: file.replace(/[jt]sx?$/, 'js').replace(/^src/, '')}),
            }
],
    },
    esbuild: {
        jsx: 'transform',
    }
});