import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist/silicio/browser'),port=Number(process.env.SILICIO_PORT||4300);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const target=resolve(root,'.'+url);if(target!==root&&!target.startsWith(root+sep)){res.writeHead(403);res.end();return;}let file=target;try{var data=await readFile(file);}catch{if(extname(url)){res.writeHead(404);res.end();return;}file=resolve(root,'index.html');data=await readFile(file);}res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(400);res.end();}}).listen(port,'127.0.0.1',()=>console.log('SILICIO: http://127.0.0.1:'+port));
