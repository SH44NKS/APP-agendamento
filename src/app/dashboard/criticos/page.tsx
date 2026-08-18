import { Flame } from "lucide-react";
import { redirect } from "next/navigation";
import { CriticosPorTecnico } from "@/components/CriticosPorTecnico";
import { PainelDestaque } from "@/components/PainelDestaque";
import { isAdminUser } from "@/lib/auth";
import { diasPendente, diasSemMovimento, OrdemServico } from "@/lib/os";
import { createClient } from "@/lib/supabase/server";

const STATUS_ABERTOS = ["pendente", "aguardando_retorno", "reagendar"];

export default async function CriticosPage() {
  const s = createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: perfil }, { data: ordens }, { data: config }] =
    await Promise.all([
      s.from("profiles").select("papel").eq("id", user.id).maybeSingle(),
      s.from("ordens_servico")
        .select("*,tecnico:tecnico_id(nome)")
        .in("status", STATUS_ABERTOS)
        .order("atualizado_em", { ascending: true }),
      s.from("configuracoes").select("alerta_vermelho_dias").single(),
    ]);

  if (!isAdminUser(user.email, perfil?.papel)) redirect("/tecnico");

  const limite = config?.alerta_vermelho_dias ?? 7;
  const criticas = ((ordens ?? []) as OrdemServico[]).filter(
    (ordem) => diasSemMovimento(ordem) >= limite,
  );
  const grupos = agrupar(criticas);

  return (
    <div>
      <p className="eyebrow">ACOMPANHAMENTO DE RECONTATO</p>
      <h1 className="mt-2 text-3xl font-bold">OS críticas por técnico</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
        Serviços sem movimentação há {limite} dias ou mais. Envie a cobrança ao
        técnico e acompanhe o novo contato pelo histórico da OS.
      </p>

      <PainelDestaque
        Icone={Flame}
        titulo="Serviços que precisam de atenção"
        descricao="Agrupados pelo técnico atualmente responsável"
        contador={`${criticas.length} OS`}
        tema="vermelho"
        className="mt-7"
      >
        <CriticosPorTecnico grupos={grupos} limite={limite} />
      </PainelDestaque>
    </div>
  );
}

function agrupar(ordens: OrdemServico[]) {
  const mapa = new Map<
    string,
    {
      tecnicoId: string;
      tecnicoNome: string;
      ordens: Array<{
        id: string;
        clienteNome: string;
        veiculoModelo: string;
        veiculoIdentificador: string;
        tipo: OrdemServico["tipo"];
        status: OrdemServico["status"];
        diasSemMovimento: number;
        diasEmAberto: number;
      }>;
    }
  >();

  for (const ordem of ordens) {
    const tecnicoId = ordem.tecnico_id ?? "sem-tecnico";
    const grupo = mapa.get(tecnicoId) ?? {
      tecnicoId,
      tecnicoNome: ordem.tecnico?.nome ?? "Sem técnico atribuído",
      ordens: [],
    };
    grupo.ordens.push({
      id: ordem.id,
      clienteNome: ordem.cliente_nome,
      veiculoModelo: ordem.veiculo_modelo,
      veiculoIdentificador: ordem.veiculo_identificador,
      tipo: ordem.tipo,
      status: ordem.status,
      diasSemMovimento: diasSemMovimento(ordem),
      diasEmAberto: diasPendente(ordem),
    });
    mapa.set(tecnicoId, grupo);
  }

  return [...mapa.values()].sort((a, b) => b.ordens.length - a.ordens.length);
}
