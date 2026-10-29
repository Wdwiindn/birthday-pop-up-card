import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {read,checkBrief,checkCharacterReview,requireValue} from './common.mjs';
try{
 const [input,dest,reviewFile]=process.argv.slice(2);requireValue(input&&dest&&reviewFile,'用法：node create-project.mjs <brief.json> <新目录> <已确认character-review.json>');
 const b=read(input),sourceDirectory=path.dirname(path.resolve(input)),briefDigest=checkBrief(b,sourceDirectory,true);
 const characterReview=read(reviewFile),characterSourceDirectory=path.dirname(path.resolve(reviewFile));
 checkCharacterReview(characterReview,characterSourceDirectory,briefDigest,true);
 const out=path.resolve(dest);requireValue(!fs.existsSync(out),'项目目录已存在；请用新目录');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const subjectAssets=characterReview.assets.map((a,i)=>({path:'assets/subjects-'+(i+1)+'.png',sha256:a.sha256}));
 const config={copy:b.copy,interactions:b.interactions,palette:{berry:'#aa534b',paper:'#fff5df'},card:{width:600,depth:440},background:'assets/background.png',decorations:{printedLeaves:false,bunting:false,foil:false,sprinkles:false},layers:subjectAssets.map((a,i)=>({name:i?'subject-'+(i+1):'family',source:a.path,x:122,pivot:145,width:356,height:290}))};
 fs.mkdirSync(path.join(out,'assets'),{recursive:true});
 fs.copyFileSync(path.join(root,'assets/paper-card/index.html'),path.join(out,'index.html'));
 characterReview.assets.forEach((a,i)=>fs.copyFileSync(path.resolve(characterSourceDirectory,a.path),path.join(out,subjectAssets[i].path)));
 fs.writeFileSync(path.join(out,'card.json'),JSON.stringify(config,null,2));
 fs.writeFileSync(path.join(out,'approved-brief.json'),JSON.stringify({brief:b,sourceDirectory,characterReview,characterSourceDirectory,subjectAssets},null,2));
 console.log('人物确认通过；已复制确认的原始人物素材。下一步按方案制作充盈构图，调整图层，避免默认位置重叠。');
}catch(e){console.error(e.message);process.exitCode=1}
