import { FormError, initialRules, validFormURL, type FormSchema, type Rule } from "./forms.ts";
export type Draft = { version: 1; form: FormSchema; rules: Record<string,Rule>; count: number; random: boolean; interval: number };
export const DRAFT_KEY = "formaflow-project-v1";
export function parseDraft(text: string): Draft {
  try {
    if(text.length>2_000_000)throw new Error();
    const d=JSON.parse(text);
    if(d.version!==1 || !d.form || typeof d.form.title!=="string" || typeof d.form.description!=="string" || typeof d.form.supported!=="boolean" || typeof d.form.reason!=="string" || !Array.isArray(d.form.questions) || !d.form.questions.length || d.form.questions.length>150)throw new Error();
    d.form.url=validFormURL(d.form.url).href;
    if(!Number.isInteger(d.count)||d.count<1||d.count>100||typeof d.random!=="boolean"||!Number.isFinite(d.interval)||d.interval<1800||d.interval>10000)throw new Error();
    for(const q of d.form.questions){
      if(typeof q.id!=="string"||!/^\d+$/.test(q.id)||typeof q.title!=="string"||!Number.isInteger(q.type)||typeof q.required!=="boolean"||typeof q.supported!=="boolean"||!Array.isArray(q.options)||q.options.length>200||q.options.some((o:unknown)=>typeof o!=="string")||!Number.isInteger(q.max)||q.max<0||q.max>200)throw new Error();
    }
    const cleanRules=initialRules(d.form);
    for(const q of d.form.questions){const r=d.rules?.[q.id];if(!r||typeof r.text!=="string"||r.text.length>100000||!Array.isArray(r.choices)||r.choices.some((o:unknown)=>typeof o!=="string"||!q.options.includes(o)))throw new Error();cleanRules[q.id]={text:r.text,choices:[...new Set<string>(r.choices)]};}
    return {version:1,form:d.form,rules:cleanRules,count:d.count,random:d.random,interval:d.interval};
  }catch{throw new FormError("draft");}
}
