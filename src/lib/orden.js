// Ordena noticias de la más reciente a la más vieja según su fecha.
// Los items sin fecha válida se ubican al final, conservando orden relativo.
const fechaATiempo = (valor) => {
  const tiempo = new Date(valor).getTime();
  return Number.isNaN(tiempo) ? 0 : tiempo;
};

export const ordenarPorFechaDesc = (lista = []) =>
  [...lista].sort((a, b) => fechaATiempo(b.pubDate) - fechaATiempo(a.pubDate));
