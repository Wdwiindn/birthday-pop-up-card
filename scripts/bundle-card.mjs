import fs from 'node:fs';
import path from 'node:path';
import {checkProject,inside,imageInfo,requireValue} from './common.mjs';
try{
 const [input,output]=process.argv.slice(2);requireValue(input&&output,'用法：node bundle-card.mjs <项目目录> <新的输出.html>');
 const dir=path.resolve(input),out=path.resolve(output);requireValue(/\.html?$/i.test(out),'输出必须为 HTML');requireValue(!fs.existsSync(out),'输出文件已存在，请使用新版本名');
 let {config,html}=checkProject(dir);
 const sources=new Set([config.background,...config.layers.map(l=>l.source).filter(s=>!s.startsWith('builtin:'))]);
 for(const src of [...sources].sort((a,b)=>b.length-a.length)){const info=imageInfo(inside(dir,src));html=html.replaceAll(src,'data:'+info.mime+';base64,'+info.bytes.toString('base64'))}
 requireValue(!/(?:src|href)=["']https?:|fetch\s*\(|import\s*\(/i.test(html),'离线模板包含外部请求，请检查');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html,{flag:'wx'});console.log('已打包离线贺卡：'+out);
}catch(e){console.error(e.message);process.exitCode=1}
