const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','public'); const tila={}, v={};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
http.createServer((q,r)=>{
  let u=decodeURIComponent(q.url.split('?')[0]);
  let m;
  if((m=u.match(/^\/api\/tila\/(.+)$/))){ if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{tila[m[1]]=JSON.parse(b);r.end('{}')});} else r.end(JSON.stringify(tila[m[1]]||null)); return; }
  if((m=u.match(/^\/api\/v\/([^/]+)\/(.+)$/))){ let b='';q.on('data',c=>b+=c);q.on('end',()=>{(v[m[1]]=v[m[1]]||{})[m[2]]=JSON.parse(b);r.end('{}')}); return; }
  if((m=u.match(/^\/api\/v\/([^/]+)$/))){ r.end(JSON.stringify(v[m[1]]||{})); return; }
  if(u==='/yhteys.js'){ r.setHeader('content-type','text/javascript'); r.end(fs.readFileSync(path.join(__dirname,'mock-yhteys.js'))); return; }
  if(u==='/asetukset.js'){ r.setHeader('content-type','text/javascript'); r.end('window.VT_ASETUKSET={firebase:{apiKey:"test"},juontajat:["topias@test.fi"]};'); return; }
  if(u.endsWith('/')) u+='index.html';
  const f=path.join(root,u); if(!fs.existsSync(f)){r.statusCode=404;r.end();return;}
  r.setHeader('content-type',types[path.extname(f)]||'application/octet-stream'); r.end(fs.readFileSync(f));
}).listen(8765,()=>console.log('ok'));
