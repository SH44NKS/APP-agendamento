import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { isAdminUser } from "@/lib/auth";
import { createClient, getAuthUser } from "@/lib/supabase/server";

import { crmReportPage, crmForm } from "@/lib/crm-data";
import { crmWindows, crmNewest } from "@/lib/crm-recent";
export const runtime = "nodejs";
export const maxDuration = 120;

type Company = "foco" | "escudo";
type Raw = Record<string, unknown>;
const headers = { "Cache-Control": "private, no-store" };

const text = (value: unknown, max = 300) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim().slice(0, max) : "";
const object = (value: unknown): Raw => value && typeof value === "object" && !Array.isArray(value) ? value as Raw : {};
const normalize = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const code = (value: unknown) => /^[a-zA-Z0-9_-]{1,80}$/.test(text(value, 81));

function company(value: unknown): value is Company {
  return value === "foco" || value === "escudo";
}


function field(raw: Raw, ...keys: string[]) {
  for (const key of keys) {
    const value = text(raw[key]);
    if (value) return value;
  }
  return "";
}

function fieldFrom(records: Raw[], ...keys: string[]) {
  for (const record of records) {
    const value = field(record, ...keys);
    if (value) return value;
  }
  return "";
}

function formFromQuote(value: unknown, negotiation?: unknown) {
  const quote = object(value);
  const negotiationData = object(negotiation);
  const client = { ...object(negotiationData.client), ...object(quote.client) };
  const addressRecords = [
    client,
    quote,
    negotiationData,
    object(client.address),
    object(quote.address),
    object(negotiationData.address),
  ];
  const street = fieldFrom(addressRecords, "addressStreet", "addressAddress", "address", "street", "logradouro");
  const number = fieldFrom(addressRecords, "addressNumber", "number", "numero");
  const complement = fieldFrom(addressRecords, "addressComplement", "complement", "complemento");
  const neighborhood = fieldFrom(addressRecords, "addressNeighborhood", "addressDistrict", "neighborhood", "district", "bairro");
  const city = fieldFrom(addressRecords, "cityName", "city", "municipality", "cidade");
  const state = fieldFrom(addressRecords, "stateAbbreviation", "state", "uf", "estado");
  return {
    cliente_nome: field(client, "fullName", "name") || field(quote, "name", "clientName"),
    veiculo_modelo: field(quote, "carModel", "model"),
    veiculo_identificador: field(quote, "plate", "plates", "plts").toUpperCase() || field(quote, "chassi", "chassis").toUpperCase(),
    telefone: field(client, "phoneMain", "phone", "mobilePhone", "cellPhone") || field(quote, "phoneMobile1", "phone"),
    local: [street, number && `nº ${number}`, complement, neighborhood, city, state].filter(Boolean).join(" - "),
    consultor_nome: field(quote, "consultantName", "responsibleSalesman") || field(negotiationData, "responsible", "responsibleSalesman"),
  };
}

function negotiationCode(quote: Raw) {
  return field(quote, "negotiationCode", "negotiation_code", "cardId", "card_id", "negotiationId", "negotiation_id")
    || field(object(quote.negotiation), "code", "id", "negotiationCode");
}

async function crmRead(companyName: Company, path: string, body?: Record<string, unknown>) {
  const token = companyName === "foco" ? process.env.POWERCRM_TOKEN_FOCO : process.env.POWERCRM_TOKEN_ESCUDO;
  const bridgeSecret = process.env.POWERCRM_BRIDGE_SECRET;
  const bridgeUrl = process.env.POWERCRM_BRIDGE_URL || "https://controle-pendencias-foco-escudo.vercel.app/api/integrations/ao";
  if (!token && !bridgeSecret) throw new Error(`A integração CRM ${companyName.toUpperCase()} precisa ser configurada no servidor.`);
  let response: Response;
  try {
    if (!token && bridgeSecret) {
      const payload = JSON.stringify({ company: companyName, path, ...(body ? { body } : {}) });
      const time = String(Date.now());
      const signature = createHmac("sha256", bridgeSecret).update(`${time}\n${payload}`).digest("hex");
      response = await fetch(bridgeUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-ao-time": time, "x-ao-signature": signature }, body: payload, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(23_000) });
    } else {
      const url = new URL(`https://api.powercrm.com.br/api/${path}`);
      response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
      });
    }
  } catch {
    throw new Error("O CRM não respondeu a tempo. Tente novamente em instantes.");
  }
  if (!response.ok) {
    throw new Error(response.status === 429 ? "O CRM limitou as consultas. Aguarde alguns minutos." : [401, 403].includes(response.status) ? `O CRM ${companyName.toUpperCase()} recusou esta consulta.` : "O CRM está indisponível no momento.");
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || (data as Raw).error) throw new Error("O CRM não confirmou os dados solicitados.");
  return data;
}

async function searchLatest(companyName: Company, query: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  let calls = 0;
  const began = Date.now();
  async function interval(from: string, to: string): Promise<ReturnType<typeof crmNewest>> {
    const rows = [];
    for (let page = 0; page < 10; page++) {
      if (++calls > 10 || Date.now() - began > 80000) throw new Error("O CRM exige mais consultas. Use o ID da cotação ou tente novamente.");
      let raw: unknown;
      try { raw = await crmRead(companyName, "report/db/paginated", { from, to, stringFilterTypeDate: 1, page }); }
      catch (error) {
        if (from < to && error instanceof Error && /indisponível|não respondeu/.test(error.message)) {
          const left = Date.parse(from + "T00:00:00Z"), right = Date.parse(to + "T00:00:00Z");
          const mid = left + Math.floor((right - left) / 86400000 / 2) * 86400000;
          const found = await interval(new Date(mid + 86400000).toISOString().slice(0, 10), to);
          return found || interval(from, new Date(mid).toISOString().slice(0, 10));
        }
        throw error;
      }
      const result = crmReportPage(raw, companyName, page);
      if (result.quotes.some(q => q.created_at.slice(0, 10) < from || q.created_at.slice(0, 10) > to)) throw new Error("O CRM não respeitou o período. Use o ID da cotação.");
      rows.push(...result.quotes);
      if (result.done) return crmNewest(rows, query);
    }
    throw new Error("Não foi possível conferir todas as páginas. Use o ID da cotação.");
  }
  for (const period of crmWindows(today, 45)) {
    const result = await interval(period.from, period.to);
    if (result) return [result];
  }
  return [];
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers });
  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers });
  const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).maybeSingle();
  if (!isAdminUser(user.email, profile?.papel)) return NextResponse.json({ error: "Sem permissão para consultar o CRM." }, { status: 403, headers });

  let input: Raw;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400, headers }); }
  if (!company(input.company)) return NextResponse.json({ error: "Selecione FOCO ou ESCUDO." }, { status: 400, headers });
  try {
    if (input.action === "details") {
      if (!code(input.code)) throw new Error("Código da cotação inválido.");
      const quote = object(await crmRead(input.company, `quotation/${encodeURIComponent(text(input.code))}`));
      const relatedNegotiation = negotiationCode(quote);
      let negotiation: Raw = {};
      if (code(relatedNegotiation)) {
        try { negotiation = object(await crmRead(input.company, `negotiation/${encodeURIComponent(relatedNegotiation)}`)); } catch { /* A cotação continua utilizável mesmo sem os dados complementares. */ }
      }
      const fresh = formFromQuote(quote, negotiation);
      const base = object(input.formBase);
      const mapped = crmForm({}, {});
      for (const key of Object.keys(mapped)) mapped[key] = text(base[key], 1500);
      const fallback = { cliente_nome: mapped.client_name, veiculo_modelo: mapped.vehicle_model, veiculo_identificador: mapped.plate_number || mapped.chassis, telefone: mapped.client_tab_client_phone, local: [mapped.client_tab_client_address, mapped.client_tab_client_address_number, mapped.client_tab_client_address_bairro, mapped.client_tab_client_address_city, mapped.client_tab_client_address_state].filter(Boolean).join(" - "), consultor_nome: mapped.consultor };
      const data = Object.fromEntries(Object.entries(fresh).map(([key, value]) => [key, value || fallback[key as keyof typeof fallback] || ""]));
      return NextResponse.json({ data }, { headers });
    }
    const query = normalize(input.query);
    if (query.length < 3 || query.length > 100) throw new Error("Digite pelo menos 3 letras ou números.");
    if (input.mode === "id") {
      if (!code(text(input.query))) throw new Error("Informe um ID de cotação válido.");
      const details = await crmRead(input.company, `quotation/${encodeURIComponent(text(input.query))}`);
      const form = formFromQuote(details);
      return NextResponse.json({ quotes: [{ code: text(input.query), name: form.cliente_nome, plate: form.veiculo_identificador, chassis: "", model: form.veiculo_modelo, created_at: "" }] }, { headers });
    }
    const quotes = await searchLatest(input.company, query);
    return NextResponse.json({ quotes, message: quotes.length ? "Cotação mais recente encontrada no CRM." : "Nenhuma cotação encontrada nos últimos 45 dias. Tente outra empresa ou use o ID da cotação." }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível consultar o CRM." }, { status: 502, headers });
  }
}
