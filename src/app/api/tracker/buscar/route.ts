import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth";
import { createClient, getAuthUser } from "@/lib/supabase/server";

type TrackerRow = Record<string, unknown>;

const jsonHeaders = { "Cache-Control": "no-store" };

function text(value: unknown, max = 180) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().slice(0, max)
    : "";
}

function compact(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function service(value: unknown) {
  const type = text(value).toLowerCase();
  if (type === "1" || type === "instalacao") return "instalacao";
  if (type === "2" || type === "retirada" || type === "desinstalacao") return "retirada";
  if (type === "3" || type === "manutencao") return "manutencao";
  return "instalacao";
}

function order(row: TrackerRow) {
  const plate = text(row.plate_number, 60);
  const chassis = text(row.chassis, 60);
  const model = [text(row.vehicle_tab_brand, 80), text(row.vehicle_model, 120)]
    .filter(Boolean)
    .join(" ");
  const location = [
    text(row.client_tab_client_address, 180),
    text(row.client_tab_client_address_number, 30),
    text(row.client_tab_client_address_bairro, 100),
    text(row.client_tab_client_address_city, 100),
    text(row.client_tab_client_address_state, 10),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: text(row.id, 30),
    client: text(row.client_name),
    vehicleModel: model,
    plate,
    chassis,
    phone: text(row.client_tab_client_phone, 60),
    location,
    consultant: text(row.consultor, 120),
    service: service(row.type_order),
    status: text(row.status_text, 100),
  };
}

async function trackerRows(params: Record<string, string>) {
  const apiHash = process.env.SMARTGPS_API_HASH;
  if (!apiHash) throw new Error("A integração Tracker ainda precisa ser configurada no servidor.");

  const url = new URL("/api/get_orders", "https://sp.tracker-net.app");
  url.searchParams.set("user_api_hash", apiHash);
  url.searchParams.set("page", "1");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new Error("Não foi possível consultar a Tracker agora. Tente novamente em instantes.");
  }
  if (response.status === 429) throw new Error("A Tracker limitou as consultas. Aguarde alguns minutos antes de tentar novamente.");
  if (!response.ok) throw new Error("A Tracker não aceitou a consulta. Confira as permissões da integração.");

  let data: { items?: { data?: unknown[] } };
  try {
    data = await response.json();
  } catch {
    throw new Error("A Tracker retornou uma resposta inesperada.");
  }
  if (!Array.isArray(data.items?.data)) throw new Error("A Tracker não retornou os dados esperados para esta consulta.");
  return data.items.data.filter((item): item is TrackerRow => Boolean(item) && typeof item === "object");
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers: jsonHeaders });
  }

  const supabase = createClient();
  const { data: { user } } = await getAuthUser(supabase);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: jsonHeaders });

  const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).maybeSingle();
  if (!isAdminUser(user.email, profile?.papel)) {
    return NextResponse.json({ error: "Sem permissão para consultar a Tracker." }, { status: 403, headers: jsonHeaders });
  }

  let query = "";
  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400, headers: jsonHeaders });
  }
  if (query.length < 3 || query.length > 60) {
    return NextResponse.json({ error: "Informe o número da OS, a placa ou o chassi." }, { status: 400, headers: jsonHeaders });
  }

  try {
    const numericId = /^\d{1,15}$/.test(query);
    const rows = await trackerRows(numericId ? { id: query } : { plate: query });
    const found = rows.find((row) => numericId
      ? text(row.id) === query
      : [row.plate_number, row.chassis].some((value) => compact(text(value)) === compact(query)));

    if (!found) {
      return NextResponse.json({ error: "Nenhuma OS correspondente foi encontrada na Tracker." }, { status: 404, headers: jsonHeaders });
    }
    return NextResponse.json({ order: order(found) }, { headers: jsonHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível consultar a Tracker." },
      { status: 502, headers: jsonHeaders },
    );
  }
}
