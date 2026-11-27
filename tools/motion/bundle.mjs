// Bundles the WebGL scene and smooth scrolling into classic scripts (work from file:// as well as http).
import { build } from 'esbuild';
const common = { bundle: true, minify: true, format: 'iife', target: ['es2019'], legalComments: 'eof', logLevel: 'info' };
await build({ ...common, entryPoints: ['scene.js'], outfile: '../../assets/scene.js' });
await build({ ...common, entryPoints: ['smooth.js'], outfile: '../../assets/smooth.js' });
