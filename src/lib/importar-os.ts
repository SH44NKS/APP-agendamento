type DadosImportados = {
  tipo: "instalacao" | "retirada" | "manutencao";
  cliente_nome: string;
  veiculo_modelo: string;
  veiculo_identificador: string;
  telefone: string;
  local: string;
  consultor_nome: string;
};

const IDENTIFICADOR = /(?:[A-Z]{3}-?(?:\d[A-Z]\d{2}|\d{4})|[A-HJ-NPR-Z0-9]{17})/i;

export function importarTextoOS(texto: string): DadosImportados {
  const linhas = texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  const valorEmoji = (emoji: string, label?: string) => {
    const linha = linhas.find((item) => item.startsWith(emoji));
    if (!linha) return "";
    let resultado = linha.slice(emoji.length).trim();
    if (label) resultado = resultado.replace(new RegExp(`^${label}\\s*:\\s*`, "i"), "");
    return resultado.replace(/^\s*[:–—-]?\s*/, "").trim();
  };
  const valorRotulo = (rotulos: string[]) => {
    for (const linha of linhas) {
      const limpa = linha.replace(/^[^\p{L}\p{N}]+/u, "").trim();
      for (const rotulo of rotulos) {
        const match = limpa.match(new RegExp(`^${rotulo}\\s*[:–—-]\\s*(.+)$`, "i"));
        if (match?.[1]) return match[1].trim();
      }
    }
    return "";
  };
  const servico = valorRotulo(["servi[cç]o", "tipo(?: de servi[cç]o)?"]) || linhas.find((linha) => /INSTALAÇÃO|INSTALACAO|RETIRADA|MANUTENÇÃO|MANUTENCAO/i.test(linha)) || "";
  const veiculo = valorEmoji("🚗") || valorRotulo(["ve[ií]culo", "modelo(?: do ve[ií]culo)?"]);
  const separado = separarVeiculo(veiculo);
  const identificador = valorRotulo(["placa(?: ou chassi)?", "chassi"]);
  return {
    tipo: /RETIRADA/i.test(servico) ? "retirada" : /MANUTEN/i.test(servico) ? "manutencao" : "instalacao",
    cliente_nome: valorEmoji("👤") || valorRotulo(["cliente", "associado", "nome(?: do cliente)?"]),
    veiculo_modelo: separado.modelo,
    veiculo_identificador: (identificador || separado.identificador).toUpperCase(),
    telefone: valorEmoji("📱") || valorRotulo(["telefone", "celular", "contato"]),
    local: valorEmoji("📍") || valorRotulo(["local", "endere[cç]o", "regi[aã]o"]),
    consultor_nome: valorEmoji("🤝", "Consultor") || valorRotulo(["consultor", "solicitante"]),
  };
}

function separarVeiculo(valor: string) {
  const match = valor.match(new RegExp(`^(.*?)\\s+(?:-|–|—)\\s+(${IDENTIFICADOR.source})$`, "i"));
  if (match) return { modelo: match[1].trim(), identificador: match[2].trim().toUpperCase() };
  const final = valor.match(new RegExp(`(${IDENTIFICADOR.source})$`, "i"));
  if (final) {
    const modelo = valor.slice(0, final.index).replace(/[\s–—-]+$/, "").trim();
    if (modelo) return { modelo, identificador: final[1].trim().toUpperCase() };
  }
  return { modelo: valor, identificador: "" };
}
