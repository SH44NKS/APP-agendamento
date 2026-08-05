export const FUSO_SISTEMA = "America/Bahia";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO_SISTEMA,
});

const formatoDataISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: FUSO_SISTEMA,
});

export function formatarDataHora(data: string | Date) {
  return formatoDataHora.format(new Date(data));
}

export function dataCalendarioBahia(data: string | Date) {
  return formatoDataISO.format(new Date(data));
}

export function chaveMesBahia(data: string | Date) {
  return dataCalendarioBahia(data).slice(0, 7);
}

export function diferencaDiasBahia(inicio: string | Date, fim: string | Date = new Date()) {
  const [anoInicio, mesInicio, diaInicio] = dataCalendarioBahia(inicio).split("-").map(Number);
  const [anoFim, mesFim, diaFim] = dataCalendarioBahia(fim).split("-").map(Number);
  return Math.round(
    (Date.UTC(anoFim, mesFim - 1, diaFim) - Date.UTC(anoInicio, mesInicio - 1, diaInicio)) /
      86_400_000,
  );
}
