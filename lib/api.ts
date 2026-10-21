import {FormError} from "./forms.ts";
import {loadGoogleForm,sendGoogleResponse} from "./google-server.ts";
type Result={status:"sent"|"failed"|"unknown";code:string};
const recent=new Map<string,{at:number;signature:string;result?:Result}>();
export async function handleFormsRequest(request:Request,allowedOrigins:string[]=[],fetcher:typeof fetch=fetch){
  const origin=request.headers.get("origin")??"";
  const allowed=origin===new URL(request.url).origin||allowedOrigins.includes(origin);
  const headers:Record<string,string>={"Cache-Control":"no-store","Vary":"Origin"};
  if(allowed&&origin){headers["Access-Control-Allow-Origin"]=origin;headers["Access-Control-Allow-Methods"]="POST, OPTIONS";headers["Access-Control-Allow-Headers"]="Content-Type";}
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
  if(!allowed)return reply({error:{code:"origin"}},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(request.method!=="POST")return reply({error:{code:"request"}},405);
  try{
    if(Number(request.headers.get("content-length")??0)>100000)throw new FormError("large");
    const reader=request.body?.getReader();if(!reader)throw new FormError("request");let text="",size=0;const decoder=new TextDecoder();
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();throw new FormError("large");}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
    let body:any;try{body=JSON.parse(text);}catch{throw new FormError("request");}
    if(typeof body.url!=="string")throw new FormError("invalid_url");
    if(body.action==="inspect")return reply((await loadGoogleForm(body.url,fetcher)).form);
    if(body.action!=="submit"||!body.answers||typeof body.answers!=="object"||Array.isArray(body.answers)||!/^[\w-]{16,80}$/.test(body.id??""))throw new FormError("request");
    const bytes=new TextEncoder().encode(JSON.stringify([body.url,body.answers]));
    const signature=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
    for(const [key,value] of recent)if(Date.now()-value.at>3600000)recent.delete(key);
    const previous=recent.get(body.id);
    if(previous){if(previous.signature!==signature)throw new FormError("request");return reply(previous.result??{status:"unknown",code:"duplicate"});}
    if(recent.size>=2000)recent.delete(recent.keys().next().value!);
    recent.set(body.id,{at:Date.now(),signature});
    let result:Result;
    try{result=await sendGoogleResponse(body.url,body.answers,fetcher);}
    catch(e){result={status:"failed",code:e instanceof FormError?e.code:"unavailable"};}
    recent.set(body.id,{at:Date.now(),signature,result});return reply(result);
  }catch(e){return reply({error:{code:e instanceof FormError?e.code:"request",detail:e instanceof FormError?e.detail:""}},400);}
}
