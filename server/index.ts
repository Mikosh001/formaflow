import {createServer} from 'node:http';
import {handleFormsRequest} from '../lib/api.ts';
const port=Number(process.env.PORT||8787);
const allowed=(process.env.ALLOWED_ORIGINS||'http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:5173,http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.url==='/health'||req.url==='/'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({service:'formaflow-api',status:'ok',version:'1.0.0'}));return;}
  if(req.url!=='/api/forms'){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'request'}}));return;}
  try{
    const parts:Buffer[]=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'large'}}));return;}parts.push(Buffer.from(chunk));}
    const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    const method=req.method||'GET';
    const request=new Request(`http://${req.headers.host||'localhost'}/api/forms`,{method,headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(parts)}:{})});
    const response=await handleFormsRequest(request,allowed);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'request'}}));}
});
server.requestTimeout=90000;server.headersTimeout=15000;
server.listen(port,'0.0.0.0',()=>console.log(`FormaFlow API listening on port ${port}`));
process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),25000).unref();});
