import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export function requireValue(ok,msg){if(!ok)throw Error(msg)}
export const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v}
function str(v){return typeof v==='string'&&v.trim().length>0}
export function imageInfo(p){const b=fs.readFileSync(p);if(b.length>26&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png',alpha:[4,6].includes(b[25]),bytes:b};if(b[0]===255&&b[1]===216)return {mime:'image/jpeg',alpha:false,bytes:b};if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return {mime:'image/webp',alpha:null,bytes:b};throw Error('不是受支持的 PNG/JPEG/WebP 图片：'+p)}
export function checkBrief(b,base,approved=false){
 const need=(v,m)=>requireValue(str(v),m+' 尚未明确');
 requireValue(Array.isArray(b.references)&&b.references.length===3,'需要三张已标注角色的参考图');
 const files=[],fingerprints={};for(const role of ['structure','style','subjects']){const matches=b.references.filter(r=>r.role===role);requireValue(matches.length===1,'参考图角色缺失或重复：'+role);const r=matches[0];need(r.path,role+' 文件');need(r.review,role+' 读图观察');const p=fs.realpathSync(path.resolve(base,r.path));imageInfo(p);files.push(p);fingerprints[role]=hash(fs.readFileSync(p))}
 requireValue(new Set(files.map(p=>process.platform==='win32'?p.toLowerCase():p)).size===3,'三类参考需要三张不同的图片');
 requireValue(Number.isInteger(b.people?.count)&&b.people.count>0,'人物人数须为正整数');
 for(const k of ['included','celebrant','identity','hat','appearanceEdits','proportions','stickerTreatment'])need(b.people?.[k],'people.'+k);
 for(const k of ['structure','style','photoElements','forbidden','layers','density'])need(b.design?.[k],'design.'+k);
 for(const k of ['language','title','greeting'])need(b.copy?.[k],'copy.'+k);
 for(const k of ['eyebrow','intro','subtitle','frontMessage','innerMessage','coverNote','footer'])requireValue(typeof b.copy?.[k]==='string','copy.'+k+' 须填写文字或明确空字符串');
 for(const k of ['openClose','dragRotate','turntable','zoom','foldSlider','confetti'])requireValue(typeof b.interactions?.[k]==='boolean','须明确功能开关：'+k);
 requireValue(b.interactions.openClose,'生日立体卡片必须保留开合功能');
 requireValue(['offline-html','hosted'].includes(b.delivery?.mode),'须明确交付方式');
 need(b.delivery.outputDirectory,'输出目录');if(b.delivery.mode==='hosted')need(b.delivery.access,'发布访问范围');
 requireValue(Array.isArray(b.delegatedChoices),'delegatedChoices 须为数组');
 requireValue(Array.isArray(b.unresolved)&&b.unresolved.length===0,'仍有待确认问题，禁止生成');
 const {approval,...brief}=b;const digest=hash(JSON.stringify(stable({brief,referenceHashes:fingerprints})));
 if(approved){requireValue(approval?.confirmed===true,'用户尚未明确确认，禁止生成');need(approval.userQuote,'用户确认原话');requireValue(str(approval.confirmedAt)&&!Number.isNaN(Date.parse(approval.confirmedAt)),'缺少有效确认时间');requireValue(approval.briefSha256===digest,'方案/素材已变化，原确认失效，请重新确认')}
 return digest;
}

export function checkCharacterReview(review,base,briefSha256,approved=false,verifyFiles=true){
 requireValue(review?.briefSha256===briefSha256,'人物预览不属于当前确认方案，请重新提交人物预览');
 requireValue(Array.isArray(review.assets)&&review.assets.length>0,'缺少人物预览素材');
 const paths=new Set();
 for(const asset of review.assets){
  requireValue(str(asset.path)&&/^[a-f0-9]{64}$/.test(asset.sha256),'人物预览记录不完整');
  const resolved=path.resolve(base,asset.path);requireValue(!paths.has(resolved),'人物预览素材重复');paths.add(resolved);
  if(verifyFiles){const i=imageInfo(resolved);requireValue(i.mime==='image/png'&&i.alpha,'人物贴纸须使用带 alpha 通道的 PNG');requireValue(hash(i.bytes)===asset.sha256,'人物图片已变化，必须重新给用户预览确认')}
 }
 const {approval,...payload}=review;
 const digest=hash(JSON.stringify(stable(payload)));
 if(approved){requireValue(approval?.confirmed===true,'人物形象尚未确认，禁止生成或打包网页');requireValue(str(approval.userQuote)&&str(approval.confirmedAt)&&!Number.isNaN(Date.parse(approval.confirmedAt)),'缺少人物确认原话或时间');requireValue(approval.reviewSha256===digest,'人物预览确认失效，请重新确认')}
 return digest;
}

export function inside(root,rel){requireValue(str(rel)&&!path.isAbsolute(rel),'素材必须是项目内的相对路径');requireValue(!/[<>"'&\\]/.test(rel),'素材路径不能包含引号、尖括号、& 或反斜杠');const resolved=fs.realpathSync(path.resolve(root,rel)),realRoot=fs.realpathSync(root),r=path.relative(realRoot,resolved);requireValue(r!==''&&!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r),'素材越出项目目录');return resolved}
export function checkProject(dir){
 const saved=read(path.join(dir,'approved-brief.json'));const briefDigest=checkBrief(saved.brief,saved.sourceDirectory,true);checkCharacterReview(saved.characterReview,saved.characterSourceDirectory,briefDigest,true,false);
 const c=read(path.join(dir,'card.json'));requireValue(Array.isArray(saved.subjectAssets)&&saved.subjectAssets.length===saved.characterReview.assets.length,'缺少已确认人物素材映射');for(let n=0;n<saved.subjectAssets.length;n++){const item=saved.subjectAssets[n];requireValue(item.sha256===saved.characterReview.assets[n].sha256,'人物素材映射被修改');requireValue(hash(fs.readFileSync(inside(dir,item.path)))===item.sha256,'网页人物不是用户确认的版本');requireValue(c.layers?.some(l=>l.source===item.path),'网页未使用已确认的人物素材');}requireValue(JSON.stringify(stable(c.copy))===JSON.stringify(stable(saved.brief.copy))&&JSON.stringify(stable(c.interactions))===JSON.stringify(stable(saved.brief.interactions)),'文案或交互偏离已确认方案，请重新确认后更新项目');requireValue(c.card?.width===600&&c.card?.depth===440,'内置模板为600×440；其他尺寸先修改模板与检查器');
 requireValue(Array.isArray(c.layers)&&c.layers.length>0,'缺少纸艺图层');
 requireValue(c.layers.some(l=>l.name==='family'),'缺少主角图层 family');
 imageInfo(inside(dir,c.background));
 const builtins=new Set(['builtin:balloon-left','builtin:balloon-right','builtin:gifts','builtin:ribbons','builtin:floral-left','builtin:floral-right','builtin:bird','builtin:hearts']);
 for(const l of c.layers){requireValue([l.x,l.pivot,l.width,l.height].every(Number.isFinite),'图层尺寸必须为数字');requireValue(l.x>=0&&l.width>0&&l.x+l.width<=c.card.width&&l.pivot>=0&&l.height>0&&l.pivot+l.height<=c.card.depth,'图层无法收进卡片：'+l.name);if(!builtins.has(l.source)){const i=imageInfo(inside(dir,l.source));requireValue(i.mime==='image/png'&&i.alpha,'剪纸素材须为带 alpha 通道的 PNG：'+l.source)}}
 for(const [k,v] of Object.entries(c.palette??{}))requireValue(/^#[0-9a-f]{6}$/i.test(v),'调色值必须为六位十六进制：'+k);
 const html=render(fs.readFileSync(path.join(dir,'index.html'),'utf8'),c);const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];requireValue(script,'模板缺少脚本');new vm.Script(script);return {config:c,html};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function render(template,c){let out=template.replace('__CARD_CONFIG__',JSON.stringify(c).replace(/</g,'\\u003c'));for(const [k,v]of Object.entries(c.copy))out=out.replaceAll('__TEXT_'+k+'__',escape(v));out=out.replaceAll('__BACKGROUND__',escape(c.background));requireValue(!/__TEXT_\w+__|__BACKGROUND__|__CARD_CONFIG__/.test(out),'模板占位符未完成');return out}

