// Envuelve una promesa con un limite de tiempo. Al vencerlo rechaza con
// TIMEOUT_<NOMBRE> para que el llamador (p. ej. la cascada de /api/news)
// pueda registrar el fallo y continuar con la siguiente fuente.
export const conTimeout = (promesa, milisegundos, nombre) => {
  let temporizador;
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error(`TIMEOUT_${nombre}`)),
      milisegundos
    );
  });

  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
};
