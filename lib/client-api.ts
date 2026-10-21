import deployment from "./deployment.json";
import {FormError} from "./forms";
export async function callAPI<T>(body: unknown): Promise<T> {
  const pages=typeof window!=="undefined"&&window.location.hostname.endsWith(".github.io");
  const base=pages?deployment.apiUrl:"";
  if(pages&&!base)throw new FormError("api_config");
  let response:Response;
  try {response=await fetch(`${base.replace(/\/$/,"")}/api/forms`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(85000)});}catch{throw new FormError("network");}
  let data:T&{error?:{code:string;detail?:string}};
  try{data=await response.json() as typeof data;}catch{throw new FormError("unavailable");}
  if(!response.ok||data.error)throw new FormError(data.error?.code??"request",data.error?.detail);
  return data;
}
