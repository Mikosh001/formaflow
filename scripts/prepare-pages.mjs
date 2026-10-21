import {spawnSync} from 'node:child_process';
import {cpSync,mkdirSync,writeFileSync,existsSync,readdirSync,unlinkSync,rmSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd(),target=path.resolve(root,'docs');
if(target!==path.join(root,'docs'))throw Error('Unexpected output directory');
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit',env:{...process.env,PAGES_BASE:'/formaflow/'}});
if(result.status!==0)process.exit(result.status||1);
mkdirSync(target,{recursive:true});
// Only replace files produced by this build. Preserve any documentation files.
if(existsSync(path.join(target,'assets')))rmSync(path.join(target,'assets'),{recursive:true});
cpSync('dist',target,{recursive:true});writeFileSync(path.join(target,'.nojekyll'),'');
console.log('GitHub Pages files prepared in docs/. Commit and push docs/ to publish.');
