import {translate, type Language} from "./i18n.ts";
export class FormError extends Error { code: string; detail: string; constructor(code: string, detail = "") { super(code); this.code = code; this.detail = detail; this.name = "FormError"; } }
export const MAX_RESPONSES = 100;
export type Question = { id: string; title: string; type: number; required: boolean; options: string[]; max: number; supported: boolean };
export type FormSchema = { url: string; title: string; description: string; questions: Question[]; supported: boolean; reason: string };
export type Rule = { choices: string[]; text: string };
export type ResponseRow = { id: string; answers: Record<string, string[]>; status: "ready" | "sending" | "sent" | "failed" | "unknown"; message?: string; code?: string };
export const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdlfInLldxQ8gdd7pfUVMEGpkh5qkVJUtMEIl_vGDtYjpjRfA/viewform";
export function validFormURL(input: string) {
  let u: URL;
  try { u = new URL(input.trim()); } catch { throw new FormError("invalid_url"); }
  if (u.protocol !== "https:" || u.username || u.password || u.port) throw new FormError("https");
  if (u.hostname === "forms.gle" && /^\/[\w-]+\/?$/.test(u.pathname)) return u;
  if (u.hostname !== "docs.google.com" || !/^\/forms\/d\/(?:e\/)?[\w-]+\/(?:viewform|formResponse)\/?$/.test(u.pathname)) throw new FormError("google_only");
  u.pathname = u.pathname.replace(/formResponse\/?$/, "viewform"); u.search = ""; u.hash = "";
  return u;
}
export function decodeHTML(s: string) { return s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
export function parseForm(html: string, url: string): FormSchema {
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/);
  if (!match || !html.includes('id="mG61Hd"')) throw new FormError("unavailable");
  let data: any;
  try { data = JSON.parse(match[1]); } catch { throw new FormError("structure"); }
  const items: any[] = data?.[1]?.[1] ?? [];
  let reason = ""; const questions: Question[] = [];
  for (const item of items) {
    if ([6,11,12].includes(item[3])) continue;
    if (item[3] === 8) { reason = "sections"; continue; }
    const entry = item[4]?.[0];
    if (!entry) { reason = "unsupported"; continue; }
    const options = (entry[1] ?? []).filter((o: any[]) => typeof o[0] === "string" && o[0].trim() && !o[4]).map((o: any[]) => String(o[0]));
    const supported = [0,1,2,3,4,5].includes(item[3]) && item[4].length === 1;
    if (!supported) reason = "unsupported";
    if ((entry[1] ?? []).some((o: any[]) => typeof o[2] === "number" && o[2] !== -1)) reason = "branching";
    const maxRule = (entry[4] ?? []).find((r: any[]) => r[0] === 7 && r[1] === 201);
    if ((entry[4] ?? []).some((r: any[]) => !(r[0] === 7 && r[1] === 201))) reason = "validation";
    questions.push({ id: String(entry[0]), title: String(item[1] ?? "Сұрақ"), type: item[3], required: !!entry[2], options, max: item[3] === 4 ? Math.min(options.length, Number(maxRule?.[2]?.[0]) || options.length) : 1, supported });
  }
  if (html.includes('name="emailAddress"')) reason = "email";
  if (!questions.length) throw new FormError("empty_form");
  return { url: validFormURL(url).href, title: String(data[3] || data[1]?.[8] || "Атаусыз форма"), description: String(data[1]?.[0] ?? ""), questions, supported: !reason, reason };
}
export function initialRules(form: FormSchema): Record<string, Rule> {
  return Object.fromEntries(form.questions.map(q => [q.id, { choices: [...q.options], text: "" }]));
}
export function validateAnswers(form: FormSchema, answers: Record<string, string[]>) {
  if (!form.supported) throw new FormError(form.reason);
  for (const q of form.questions) {
    const a = answers[q.id];
    if (!Array.isArray(a) || a.some(v => typeof v !== "string" || v.length > 5000)) throw new FormError("format",q.title);
    if (q.required && (!a.length || a.some(v => !v.trim()))) throw new FormError("required",q.title);
    if (a.length > (q.type === 4 ? q.max : 1)) throw new FormError("too_many",q.title);
    if (q.type > 1 && a.some(v => !q.options.includes(v))) throw new FormError("invalid_choice",q.title);
  }
}
export function generateRows(form: FormSchema, rules: Record<string, Rule>, count: number, random: boolean): ResponseRow[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_RESPONSES) throw new FormError("count");
  const rows: ResponseRow[] = [];
  for (let i = 0; i < count; i++) {
    const answers: Record<string, string[]> = {};
    for (const q of form.questions) {
      const rule = rules[q.id];
      if (q.type <= 1) {
        const rawText = rule?.text ?? "";
        const texts = (random ? rawText.split("\n") : [rawText]).filter(s => s.trim());
        const value = texts[random ? i % texts.length : 0];
        answers[q.id] = value ? [value] : [];
      } else {
        const pool = (rule?.choices ?? []).filter(v => q.options.includes(v)); const shuffled = [...pool];
        if (random) for (let j = shuffled.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]; }
        const n = q.type === 4 ? (random ? 1 + Math.floor(Math.random() * Math.min(q.max, pool.length)) : Math.min(q.max, pool.length)) : 1;
        answers[q.id] = shuffled.slice(0, n);
      }
    }
    validateAnswers(form, answers); rows.push({ id: crypto.randomUUID(), answers, status: "ready" });
  }
  return rows;
}
export function csvExport(form: FormSchema, rows: ResponseRow[], language: Language = "kk") {
  const cell = (s: string) => '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
  return "\uFEFF" + [[translate(language,"rowLabel"), ...form.questions.map(q => q.title)], ...rows.map(r => [translate(language,r.status), ...form.questions.map(q => (r.answers[q.id] ?? []).join("; "))])].map(row => row.map(cell).join(",")).join("\r\n");
}
