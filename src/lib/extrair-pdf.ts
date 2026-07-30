export async function extrairTextoPDF(arquivo: File) {
  const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const pdf = await getDocument({ data: dados }).promise;
  const paginas: string[] = [];
  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    const pagina = await pdf.getPage(numero);
    const conteudo = await pagina.getTextContent();
    let texto = "";
    for (const item of conteudo.items) {
      if (!("str" in item)) continue;
      texto += `${item.str}${item.hasEOL ? "\n" : " "}`;
    }
    const textoPagina = texto.replace(/[ \t]+\n/g, "\n").trim();
    paginas.push(textoPagina);
    if (
      numero === 1 &&
      /TERMO DE ADESÃO/i.test(textoPagina) &&
      /DADOS DO VEÍCULO/i.test(textoPagina)
    )
      return textoPagina;
  }
  return paginas.join("\n\n").trim();
}
