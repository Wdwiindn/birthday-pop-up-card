import fs from 'node:fs';import path from 'node:path';
import {read,checkBrief,checkCharacterReview,imageInfo,hash,requireValue} from './common.mjs';
try{
 const [input,output,...assets]=process.argv.slice(2);
 requireValue(input&&output&&assets.length,'用法：node prepare-character-review.mjs <brief.json> <新review.json> <人物PNG> [其他人物PNG]');
 requireValue(!fs.existsSync(output),'预览记录已存在，请使用新版本名');
 const briefSha256=checkBrief(read(input),path.dirname(path.resolve(input)),true);
 const review={briefSha256,assets:assets.map(p=>{const image=imageInfo(p);requireValue(image.mime==='image/png'&&image.alpha,'人物预览须为带 alpha 的 PNG');return {path:path.resolve(p),sha256:hash(image.bytes)}}),approval:null};
 const reviewSha256=checkCharacterReview(review,path.dirname(path.resolve(output)),briefSha256);
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(review,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'awaiting_character_confirmation',reviewSha256,note:'请先展示人物预览；用户明确确认后才填写 approval。'},null,2));
}catch(e){console.error(e.message);process.exitCode=1}
