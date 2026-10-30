export type CrmCompany="foco"|"escudo";
export type CrmQuote={company:CrmCompany;code:string;negotiation_code:string;name:string;document:string;plate:string;chassis:string;model:string;created_at:string;status:string;search_text:string;form_data:Record<string,string>};
type Raw=Record<string,unknown>;
export const crmNormalize=(value:unknown)=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
export const crmCompany=(value:unknown):value is CrmCompany=>value==="foco"||value==="escudo";
export function crmUf(value:unknown){const text=crmNormalize(value);const states:Record<string,string>={acre:'AC',alagoas:'AL',amapa:'AP',amazonas:'AM',bahia:'BA',ceara:'CE','distrito federal':'DF','espirito santo':'ES',goias:'GO',maranhao:'MA','mato grosso':'MT','mato grosso do sul':'MS','minas gerais':'MG',para:'PA',paraiba:'PB',parana:'PR',pernambuco:'PE',piaui:'PI','rio de janeiro':'RJ','rio grande do norte':'RN','rio grande do sul':'RS',rondonia:'RO',roraima:'RR','santa catarina':'SC','sao paulo':'SP',sergipe:'SE',tocantins:'TO'};return states[text]||(/^[a-z]{2}$/.test(text)?text.toUpperCase():'');}
export function crmPlateVariants(value:string){const plate=value.toUpperCase().replace(/[^A-Z0-9]/g,'');return [...new Set([value,plate.length===7?plate.slice(0,3)+'-'+plate.slice(3):plate,plate])];}
export const crmCode=(value:unknown):value is string=>typeof value==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
const obj=(value:unknown):Raw=>value&&typeof value==="object"&&!Array.isArray(value)?value as Raw:{};
const str=(value:unknown)=>typeof value==="string"||typeof value==="number"?String(value).trim().slice(0,1500):"";
function pick(raw:Raw,...keys:string[]){for(const key of keys){const value=str(raw[key]);if(value)return value;}return "";}
export function crmDate(value:unknown):string {
  const text=str(value).replace(' - ',' ');let match=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);
  if(!match){const br=text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);if(br)match=[br[0],br[3],br[2],br[1],br[4]] as RegExpMatchArray;}
  if(!match)return "";const day=`${match[1]}-${match[2]}-${match[3]}`;
  if(!Number.isFinite(Date.parse(day+"T00:00:00Z"))||new Date(day+"T00:00:00Z").toISOString().slice(0,10)!==day)return "";
  const time=match[4]||"00:00:00";if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time))return "";
  return day+" "+(time.length===5?time+":00":time);
}
export function crmIndexRow(company:CrmCompany,value:unknown):CrmQuote {
  const raw=obj(value),client=obj(raw.client);
  const code=pick(raw,"quotationCode","code","quotation_code","codigoCotacao");
  if(!crmCode(code))throw Error("O relatório do CRM não informou o código da cotação. A sincronização precisa ser conferida.");
  const name=pick(client,"fullName","name")||pick(raw,"name","clientName","fullName");
  const document=(pick(client,"registration","document")||pick(raw,"clientRegistration","registration","document","cpf","cpfCnpj")).replace(/\D/g,"");
  const plate=pick(raw,"vehiclePlates","plate","plates","plts").toUpperCase(),model=pick(raw,"carModel","model","vehicleModel");
 const chassis=pick(raw,'vehicleChassi','chassi','chassis').toUpperCase(),created_at=crmDate(raw.createdAt??raw.creationDate??raw.createdDate??raw.dateCreated??raw.created_at);
  if(!name||!created_at)throw Error("O relatório do CRM não informou nome e data de criação válidos. Nenhuma data será inventada.");
 const form_data={client_name:name,client_tab_client_cpf:document,plate_number:plate,chassis,vehicle_tab_brand:pick(raw,'vehicleBrand'),vehicle_model:model,vehicle_tab_year:pick(raw,'vehicleModelYear').match(/(?:19|20)\d{2}/)?.[0]||'',color_vehicle:pick(raw,'vehicleColor'),client_tab_client_phone:pick(raw,'clientMobile','clientPhone'),client_tab_client_address:pick(raw,'clientAddress'),client_tab_client_address_number:pick(raw,'clientAddressNumber'),client_tab_client_address_bairro:pick(raw,'clientAddressNeightborhood'),client_tab_client_address_city:pick(raw,'clientCity'),client_tab_client_address_state:crmUf(pick(raw,'clientState')),client_tab_client_postal_code:pick(raw,'clientZipcode'),consultor:pick(raw,'responsibleSalesman')};
 return {company,code,negotiation_code:pick(raw,"cardId","negotiationCode","negotiation_code"),name,document,plate,chassis,model,created_at,status:pick(raw,"cardStatus","status","situation"),search_text:[name,document,plate.replace(/[^A-Z0-9]/g,""),chassis,code].map(crmNormalize).join(" "),form_data};
}
export function crmReportPage(value:unknown,company:CrmCompany,page:number) {
  const root=obj(value),body=obj(root.body),data=obj(root.data);
  if(root.error||root.success===false)throw Error("O CRM não confirmou a consulta do relatório.");
  const candidates=[value,root.content,root.data,root.items,root.quotations,root.body,body.content,body.data,data.content,data.items];
  const list=candidates.find(Array.isArray) as unknown[]|undefined;
  if(!list||list.length>5000)throw Error("Formato do relatório CRM não reconhecido. A sincronização precisa ser conferida.");
  const meta=typeof root.totalPages!=="undefined"?root:typeof data.totalPages!=="undefined"?data:body;
  const total=Number(meta.totalPages);
  const done=list.length===0||meta.last===true||(Number.isSafeInteger(total)&&total>0&&page+1>=total);
  const quotes=list.map(row=>crmIndexRow(company,row));
  return {quotes,done};
}
export function crmForm(value:unknown,negotiation?:unknown):Record<string,string> {
  const quote=obj(value),neg=obj(negotiation),client={...obj(neg.client),...obj(quote.client)};
  const name=pick(client,"fullName","name")||pick(quote,"name","clientName");
  const year=pick(quote,"carModelYear","modelYear").match(/(?:19|20)\d{2}/)?.[0]||"";
  const label=(raw:Raw,key:string)=>typeof raw[key]==='string'?str(raw[key]):'';
  return {client_name:name,client_tab_client_cpf:(pick(client,"registration","document")||pick(quote,"registration")).replace(/\D/g,""),client_tab_client_phone:pick(client,"phoneMain","phone","mobilePhone","cellPhone")||pick(quote,"phoneMobile1","phone"),plate_number:pick(quote,"plate","plates","plts").toUpperCase(),chassis:pick(quote,"chassi","chassis"),vehicle_tab_brand:label(quote,'carBrand')||label(quote,'brandName')||label(quote,'brand'),vehicle_model:pick(quote,"carModel","model"),vehicle_tab_year:year,color_vehicle:label(quote,'colorName')||label(quote,'color'),client_tab_client_address:pick(client,"addressStreet","addressAddress","address")||pick(quote,"addressAddress"),client_tab_client_address_number:pick(client,"addressNumber")||pick(quote,"addressNumber"),client_tab_client_address_bairro:pick(client,"addressNeighborhood")||pick(quote,"addressNeighborhood"),client_tab_client_address_city:pick(client,"cityName","city")||pick(quote,"cityName"),client_tab_client_address_state:crmUf(pick(client,"stateAbbreviation","state")||pick(quote,"stateAbbreviation")),client_tab_client_postal_code:pick(client,"addressZipcode","zipcode")||pick(quote,"addressZipcode"),consultor:pick(quote,"consultantName")||pick(neg,"responsible")};
}
