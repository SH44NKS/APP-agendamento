import type {CrmQuote} from './crm-data';
import {crmNormalize} from './crm-data';
export function crmWindows(today:string,days:number){
 const end=new Date(today+'T00:00:00Z');const lower=new Date(end);lower.setUTCDate(lower.getUTCDate()-days+1);const windows:{from:string;to:string}[]=[];
 let cursor=new Date(end);
 while(cursor>=lower){const start=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1));const from=start<lower?lower:start;windows.push({from:from.toISOString().slice(0,10),to:cursor.toISOString().slice(0,10)});cursor=new Date(start);cursor.setUTCDate(cursor.getUTCDate()-1);}
 return windows;
}
export function crmNewest(quotes:CrmQuote[],query:string){
 const term=crmNormalize(query),compact=term.replace(/ /g,'');
 const matches=quotes.filter(q=>q.search_text.includes(term)||q.document===compact||crmNormalize(q.plate).replace(/ /g,'')===compact);
 return matches.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.code.localeCompare(b.code))[0]||null;
}
