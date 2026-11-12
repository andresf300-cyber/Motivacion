import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import webpush from 'web-push';
import fs from 'node:fs';
import path from 'node:path';
const app=express();app.use(express.json({limit:'64kb'}));
const PORT=Number(process.env.PORT||3000);
const PAIRING_CODE=process.env.PAIRING_CODE;
const PUBLIC=process.env.VAPID_PUBLIC_KEY,PRIVATE=process.env.VAPID_PRIVATE_KEY;
const EMAIL=process.env.VAPID_EMAIL||'mailto:admin@example.com';
if(!PAIRING_CODE||!PUBLIC||!PRIVATE){console.error('Faltan PAIRING_CODE, VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY');process.exit(1)}
webpush.setVapidDetails(EMAIL,PUBLIC,PRIVATE);
const DB=process.env.DATA_FILE||path.resolve('./subscriptions.json');
const quotes=JSON.parse(fs.readFileSync(new URL('./phrases.json',import.meta.url),'utf8'));
let db={devices:[]};try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch{}
function persist(){fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB+'.tmp',JSON.stringify(db));fs.renameSync(DB+'.tmp',DB)}
const allowedOrigin=process.env.ALLOWED_ORIGIN||'https://andresf300-cyber.github.io';
app.use(cors({origin:allowedOrigin,methods:['GET','POST'],allowedHeaders:['Content-Type','X-Pairing-Code']}));
function auth(req,res,next){if(req.get('X-Pairing-Code')!==PAIRING_CODE)return res.status(403).json({error:'Código incorrecto'});next()}
const scheduleDefault={mode:'half',start:'07:00',end:'21:00',weekdays:false};
function safeSchedule(v){if(!v||!['half','times'].includes(v.mode))return scheduleDefault;const time=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'');return {mode:v.mode,start:time(v.start)?v.start:'07:00',end:time(v.end)?v.end:'21:00',weekdays:!!v.weekdays}}
function safeTimes(a){return Array.isArray(a)?a.filter(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)).slice(0,32):['08:00','12:00','16:00','20:00']}
app.get('/health',(req,res)=>res.json({ok:true,devices:db.devices.length}));
app.get('/api/public-key',auth,(req,res)=>res.json({publicKey:PUBLIC}));
app.post('/api/subscribe',auth,(req,res)=>{const s=req.body.subscription;if(!s?.endpoint||!s?.keys?.p256dh||!s?.keys?.auth)return res.status(400).json({error:'Suscripción inválida'});const record={subscription:s,schedule:safeSchedule(req.body.schedule),times:safeTimes(req.body.times),topics:Array.isArray(req.body.topics)?req.body.topics.slice(0,30):[],lastSlot:''};db.devices=db.devices.filter(x=>x.subscription.endpoint!==s.endpoint);db.devices.push(record);persist();res.json({ok:true})});
app.post('/api/config',auth,(req,res)=>{for(const d of db.devices){d.schedule=safeSchedule(req.body.schedule);d.times=safeTimes(req.body.times);d.topics=Array.isArray(req.body.topics)?req.body.topics.slice(0,30):[]}persist();res.json({ok:true})});
async function send(d,title,body,tag){try{await webpush.sendNotification(d.subscription,JSON.stringify({title,body,tag}),{TTL:3600});return true}catch(e){console.error('Push error',e.statusCode||e.message);if(e.statusCode===404||e.statusCode===410){db.devices=db.devices.filter(x=>x!==d);persist()}return false}}
app.post('/api/test',auth,async(req,res)=>{const results=await Promise.all(db.devices.map(d=>send(d,'Mi Motivación · Prueba','¡Las notificaciones push están conectadas!','mm-test-'+Date.now())));res.json({ok:true,sent:results.filter(Boolean).length})});
const tz='America/Bogota';
const parts=()=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
async function tick(){const p=parts(),hhmm=p.hour+':'+p.minute,day=p.year+'-'+p.month+'-'+p.day;for(const d of [...db.devices]){const c=d.schedule||scheduleDefault;if(c.weekdays&&['Sat','Sun'].includes(p.weekday))continue;const eligible=c.mode==='half'?hhmm>=c.start&&hhmm<=c.end&&(p.minute==='00'||p.minute==='30'):(d.times||[]).includes(hhmm);if(!eligible)continue;const slot=day+'T'+hhmm;if(d.lastSlot===slot)continue;
// Alternancia por índice de media hora desde las 07:00; secuencia estable incluso después de reinicios.
const minute=Number(p.hour)*60+Number(p.minute),isItalian=Math.floor((minute-420)/30)%2!==0;
const candidates=isItalian?quotes.it:quotes.es.filter(q=>!d.topics?.length||d.topics.includes(q.category)||d.topics.includes('Superación')&&q.category==='Metas'||d.topics.includes('Éxito')&&q.category==='Motivación'||d.topics.includes('Finanzas')&&q.category==='Trading');const pool=candidates.length?candidates:isItalian?quotes.it:quotes.es;
const indices=pool.map((_,i)=>i);let seed=hash(day+(isItalian?'it':'es'));for(let i=indices.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[indices[i],indices[j]]=[indices[j],indices[i]]}const ordinal=Math.floor(Math.max(0,minute-420)/30),idx=indices[Math.floor(ordinal/2)%indices.length],q=pool[idx];const title=isItalian?'Mi Motivación · Italiano':'Mi Motivación · Español';const body=isItalian?q.text+' — '+q.translation:q.text;
if(await send(d,title,body,'mm-'+slot)){d.lastSlot=slot;persist()}
}}
cron.schedule('* * * * *',()=>tick().catch(console.error),{timezone:tz});
app.listen(PORT,'0.0.0.0',()=>console.log('Servidor push activo en puerto',PORT));
