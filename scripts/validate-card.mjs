import path from 'node:path';import {read,checkBrief,checkCharacterReview,checkProject} from './common.mjs';
try{
 const [mode,p,briefFile]=process.argv.slice(2);
 if(!p||!['brief','approved','character','character-approved','project'].includes(mode))throw Error('用法：node validate-card.mjs brief|approved|project <路径>，或 character|character-approved <review.json> <brief.json>');
 if(mode==='project'){checkProject(path.resolve(p));console.log('PASS：人物确认、素材一致性、尺寸和语法。视觉验收仍需独立完成。')}
 else if(mode.startsWith('character')){if(!briefFile)throw Error('需要 brief.json');const digest=checkBrief(read(briefFile),path.dirname(path.resolve(briefFile)),true);console.log(JSON.stringify({reviewSha256:checkCharacterReview(read(p),path.dirname(path.resolve(p)),digest,mode==='character-approved')},null,2))}
 else console.log(JSON.stringify({ready:true,briefSha256:checkBrief(read(p),path.dirname(path.resolve(p)),mode==='approved')},null,2));
}catch(e){console.error(e.message);process.exitCode=1}
