import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import { createClient, getAuthUser } from "@/lib/supabase/server";

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

function date(value: unknown) {
  const found = text(value).replace(" - ", " ").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);
  if (!found) return "";
  const day = `${found[1]}-${found[2]}-${found[3]}`;
  return Number.isFinite(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
    ? `${day} ${found[4] || "00:00:00"}`
    : "";
}

function field(raw: Raw, ...keys: string[]) {
  for (const key of keys) {
    const value = text(raw[key]);
    if (value) return value;
  }
  return "";
}

function formFromQuote(value: unknown) {
  const quote = object(value);
  const client = object(quote.client);
  return {
    cliente_nome: field(client, "fullName", "name") || field(quote, "name", "clientName"),
    veiculo_modelo: field(quote, "carModel", "model"),
    veiculo_identificador: field(quote, "plate", "plates", "plts").toUpperCase() || field(quote, "chassi", "chassis").toUpperCase(),
    telefone: field(client, "phoneMain", "phone", "mobilePhone", "cellPhone") || field(quote, "phoneMobile1", "phone"),
    local: [
      field(client, "addressStreet", "addressAddress", "address") || field(quote, "addressAddress"),
      field(client, "addressNumber") || field(quote, "addressNumber"),
      field(client, "addressNeighborhood") || field(quote, "addressNeighborhood"),
      field(client, "cityName", "city") || field(quote, "cityName"),
      field(client, "stateAbbreviation", "state") || field(quote, "stateAbbreviation"),
    ].filter(Boolean).join(", "),
    consultor_nome: field(quote, "consultantName", "responsibleSalesman"),
  };
}

async function crmRead(companyName: Company, path: string, body?: Record<string, unknown>) {
  const token = companyName === "foco" ? process.env.POWERCRM_TOKEN_FOCO : process.env.POWERCRM_TOKEN_ESCUDO;
  if (!token) throw new Error(`A integração CRM ${companyName.toUpperCase()} precisa ser configurada no servidor.`);
  const url = new URL(`https://api.powercrm.com.br/api/${path}`);
  let response: Response;
  try {
    response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
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

function quoteRow(value: unknown) {
  const raw = object(value), client = object(raw.client);
  const quoteCode = field(raw, "quotationCode", "code", "quotation_code", "codigoCotacao");
  const name = field(client, "fullName", "name") || field(raw, "name", "clientName", "fullName");
  const document = (field(client, "registration", "document") || field(raw, "clientRegistration", "registration", "document", "cpf", "cpfCnpj")).replace(/\D/g, "");
  const plate = field(raw, "vehiclePlates", "plate", "plates", "plts").toUpperCase();
  const chassis = field(raw, "vehicleChassi", "chassi", "chassis").toUpperCase();
  return { code: quoteCode, name, document, plate, chassis, model: field(raw, "carModel", "model", "vehicleModel"), created_at: date(raw.createdAt ?? raw.creationDate ?? raw.createdDate ?? raw.dateCreated ?? raw.created_at) };
}

async function searchLatest(companyName: Company, query: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 90);
  const from = start.toISOString().slice(0, 10);
  const matches: ReturnType<typeof quoteRow>[] = [];
  for (let page = 0; page < 10; page += 1) {
    const response = object(await crmRead(companyName, "report/db/paginated", { from, to: today, stringFilterTypeDate: 1, page }));
    const candidates = [response, response.content, response.data, response.items, response.quotations, response.body, object(response.body).content, object(response.body).data, object(response.data).content, object(response.data).items];
    const rows = candidates.find(Array.isArray);
    if (!rows || rows.length > 5000) throw new Error("O CRM retornou um formato de pesquisa inesperado.");
    for (const row of rows) {
      const quote = quoteRow(row);
      if (!code(quote.code)) continue;
      const searchable = normalize([quote.name, quote.document, quote.plate, quote.chassis, quote.code].join(" "));
      if (searchable.includes(query)) matches.push(quote);
    }
    const meta = Number(response.totalPages ?? object(response.data).totalPages ?? object(response.body).totalPages);
    if (rows.length === 0 || response.last === true || (Number.isSafeInteger(meta) && meta > 0 && page + 1 >= meta)) break;
  }
  return matches.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
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
      return NextResponse.json({ data: formFromQuote(await crmRead(input.company, `quotation/${encodeURIComponent(text(input.code))}`)) }, { headers });
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
    return NextResponse.json({ quotes, message: quotes.length ? "Cotações mais recentes encontradas no CRM." : "Nenhuma cotação encontrada nos últimos 90 dias. Tente outra empresa ou use o ID da cotação." }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível consultar o CRM." }, { status: 502, headers });
  }
}
