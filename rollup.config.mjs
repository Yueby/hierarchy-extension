import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import isBuiltin from 'is-builtin-module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import copy from 'rollup-plugin-copy';
import fs from 'fs';
import cocosPluginUpdater from './plugins/cocos-plugin-updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkgJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const appName = pkgJson.name;
const appVersion = pkgJson.version;
const outputDir = `dist/${appName}`;

export default {
    input: {
        main: 'source/main.ts',
        nodeTree: 'source/nodeTree.ts',
        hack: 'source/hack.ts'
    },
    output: {
        dir: outputDir,
        format: 'commonjs',
        sourcemap: false,
        entryFileNames: '[name].js'
    },
    plugins: [
        typescript({
            tsconfig: './tsconfig.json',
            outDir: outputDir,
            sourceMap: false,
            compilerOptions: {
                sourceMap: false,
                inlineSourceMap: false,
                inlineSources: false
            }
        }),
        commonjs(),
        terser(),
        alias({
            entries: [
                { find: '@', replacement: join(__dirname, 'source') },
                { find: '~types', replacement: join(__dirname, '@types') }
            ]
        }),
        json(),
        nodeResolve({
            preferBuiltins: false,
            resolveOnly: (module) => module === 'string_decoder' || !isBuiltin(module),
            exportConditions: ['node']
        }),
        copy({
            targets: [
                {
                    src: 'assets/package.json',
                    dest: outputDir,
                    rename: 'package.json',
                    transform: (contents) => {
                        const tempPkgJson = JSON.parse(contents.toString('utf-8'));
                        tempPkgJson.name = pkgJson.name;
                        tempPkgJson.version = pkgJson.version;
                        tempPkgJson.description = pkgJson.description;
                        tempPkgJson.author = pkgJson.author;
                        tempPkgJson.editor = pkgJson.editor;
                        tempPkgJson.main = './main.js';
                        return JSON.stringify(tempPkgJson, null, 2);
                    }
                },
                { src: 'i18n/**/*', dest: `${outputDir}/i18n` }
            ],
            verbose: true
        }),
        cocosPluginUpdater({
            src: `${__dirname}/${outputDir}`,
            dest: `/d/Develop/CocosCreator/extensions/${appName}`
        })
    ],
    external: ['fs', 'path', 'os', 'electron']
}; 