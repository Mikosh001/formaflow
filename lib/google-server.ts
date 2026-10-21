import { parseForm, validFormURL, decodeHTML, validateAnswers, FormError } from "./forms.ts";
async function limitedText(response:Response,max=2_000_000){
  if(Number(response.headers.get("content-length")??0)>max)throw new FormError("large");
  if(!response.body)return "";
  const reader=response.body.getReader();const decoder=new TextDecoder();let text="",size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new FormError("large");}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
export async function loadGoogleForm(input:string,fetcher:typeof fetch=fetch){
  let url=validFormURL(input);let response:Response|undefined;
  for(let i=0;i<5;i++){
    try{response=await fetcher(url,{redirect:"manual",signal:AbortSignal.timeout(15000)});}catch{throw new FormError("unavailable");}
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get("location");if(!location)throw new FormError("unavailable");
      await response.body?.cancel();url=validFormURL(new URL(location,url).href);continue;
    }break;
  }
  if(!response?.ok||url.hostname!=="docs.google.com")throw new FormError("unavailable");
  const html=await limitedText(response);
  return {form:parseForm(html,url.href),html};
}
export async function sendGoogleResponse(input:string,answers:Record<string,string[]>,fetcher:typeof fetch=fetch){
  const {form,html}=await loadGoogleForm(input,fetcher);validateAnswers(form,answers);
  const body=new URLSearchParams();
  for(const q of form.questions){for(const value of answers[q.id]??[])body.append(`entry.${q.id}`,value);if(q.type>1)body.append(`entry.${q.id}_sentinel`,"");}
  for(const tag of html.match(/<input\b[^>]*>/g)??[]){const name=tag.match(/\bname="([^"]*)"/)?.[1],value=tag.match(/\bvalue="([^"]*)"/)?.[1];if(name&&["fvv","partialResponse","pageHistory","fbzx"].includes(name)&&value)body.set(name,decodeHTML(value));}
  body.set("submissionTimestamp","-1");
  try{
    const response=await fetcher(form.url.replace(/viewform\/?$/,"formResponse"),{method:"POST",body,redirect:"manual",signal:AbortSignal.timeout(20000)});
    const result=await limitedText(response);
    if(response.ok&&/freebirdFormviewerViewResponseConfirmationMessage|class="[^"]*\bvHW8K\b[^"]*"/.test(result))return {status:"sent" as const,code:""};
    if([400,401,403,429].includes(response.status)||result.includes('id="mG61Hd"'))return {status:"failed" as const,code:"rejected"};
    return {status:"unknown" as const,code:"unknown"};
  }catch{return {status:"unknown" as const,code:"network"};}
}
