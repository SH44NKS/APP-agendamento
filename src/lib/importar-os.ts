type DadosImportados={
  tipo:"instalacao"|"retirada"|"manutencao";
  cliente_nome:string;
  veiculo_modelo:string;
  veiculo_identificador:string;
  telefone:string;
  local:string;
  consultor_nome:string;
};

const IDENTIFICADOR=/(?:[A-Z]{3}-?(?:\d[A-Z]\d{2}|\d{4})|[A-HJ-NPR-Z0-9]{17})/i;

export function importarTextoOS(texto:string):DadosImportados{
  const linhas=texto.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const valor=(icone:string,label?:string)=>{
    const linha=linhas.find(l=>l.startsWith(icone)||(label?new RegExp(`^(?:${escapeRegex(icone)}\\s*)?${escapeRegex(label)}\\s*:`,"i").test(l):false));
    if(!linha)return "";
    let resultado=linha.replace(new RegExp(`^${escapeRegex(icone)}\\s*`),"");
    if(label)resultado=resultado.replace(new RegExp(`^${escapeRegex(label)}\\s*:\\s*`,"i"),"");
    return resultado.replace(/^\s*[:\-–—]?\s*/,"").trim();
  };
  const servico=linhas.find(l=>/INSTALAÇÃO|INSTALACAO|RETIRADA|MANUTENÇÃO|MANUTENCAO/i.test(l))??"";
  const veiculo=valor("🚗");
  const veiculoSeparado=separarVeiculo(veiculo);
  return{
    tipo:/RETIRADA/i.test(servico)?"retirada":/MANUTEN/i.test(servico)?"manutencao":"instalacao",
    cliente_nome:valor("👤"),
    veiculo_modelo:veiculoSeparado.modelo,
    veiculo_identificador:veiculoSeparado.identificador,
    telefone:valor("📱"),
    local:valor("📍"),
    consultor_nome:valor("🤝","Consultor"),
  };
}

function separarVeiculo(valor:string){
  const match=valor.match(new RegExp(`^(.*?)\\s+(?:-|–|—)\\s+(${IDENTIFICADOR.source})$`,"i"));
  if(match)return{modelo:match[1].trim(),identificador:match[2].trim().toUpperCase()};
  const apenasIdentificador=valor.match(new RegExp(`(${IDENTIFICADOR.source})$`,"i"));
  if(apenasIdentificador){
    const modelo=valor.slice(0,apenasIdentificador.index).replace(/[\s\-–—]+$/,"").trim();
    if(modelo)return{modelo,identificador:apenasIdentificador[1].trim().toUpperCase()};
  }
  return{modelo:valor,identificador:""};
}

function escapeRegex(valor:string){return valor.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
