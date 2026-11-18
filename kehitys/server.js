const http=require('http'),fs=require('fs'),path=require('path');
const root='/home/claude/tasting'; const db={};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
http.createServer((q,r)=>{
  let u=decodeURIComponent(q.url.split('?')[0]); let m;
  if((m=u.match(/^\/api\/doc\/(.+)$/))){ const k=m[1];
    if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{db[k]=JSON.parse(b);r.end('{}')});return;}
    if(q.method==='DELETE'){delete db[k];r.end('{}');return;}
    r.setHeader('content-type','application/json'); r.end(JSON.stringify(db[k]===undefined?null:db[k])); return; }
  if((m=u.match(/^\/api\/col\/(.+)$/))){ const pre=m[1]+'/'; const n=pre.split('/').length;
    const l=Object.keys(db).filter(k=>k.startsWith(pre)&&k.split('/').length===n).map(k=>({id:k.slice(pre.length),data:db[k]}));
    r.setHeader('content-type','application/json'); r.end(JSON.stringify(l)); return; }
  if(u==='/yhteys.js'){ r.setHeader('content-type','text/javascript'); r.end(fs.readFileSync(path.join(__dirname,'mock.js'))); return; }
  if(u==='/asetukset.js'){ r.setHeader('content-type','text/javascript'); r.end('window.VT_ASETUKSET={firebase:{apiKey:"test"},juontajat:["tophaavisto@icloud.com"]};'); return; }
  if(u.endsWith('/')) u+='index.html';
  const f=path.join(root,u); if(!fs.existsSync(f)){r.statusCode=404;r.end();return;}
  r.setHeader('content-type',types[path.extname(f)]||'application/octet-stream'); r.end(fs.readFileSync(f));
}).listen(8766,()=>console.log('ok'));
