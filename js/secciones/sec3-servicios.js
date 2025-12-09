export function initSec3() {

  const columnasServicios = document.querySelectorAll('#sec3 .servicios__col');

  if (!columnasServicios.length) return;

  const sec3 = document.querySelector('#sec3');

  // Variables para detectar tap vs scroll
  let inicioToqueY = 0;                                                                 // posición vertical donde empezó el toque
  let inicioToqueX = 0;                                                                 // posición horizontal donde empezó el toque
  let isScrolling = false;                                                              // indica si el usuario está desplazando la pantalla
  const SWIPE_THRESHOLD = 15;                                                           // distancia mínima en píxeles para considerar scroll

  columnasServicios.forEach(columna => {                                                // Iteración por cada columna

    columna.addEventListener('touchstart', evento => {                                  // Detectar inicio del toque

      inicioToqueY = evento.touches[0].clientY;                                         // Guardamos la posición inicial del dedo
      inicioToqueX = evento.touches[0].clientX;

      isScrolling = false;                                                              // Reiniciamos el flag: todavía no sabemos si es scroll
    }, { passive: true });                                                              // passive porque solo queremos leer el movimiento del dedo, no bloquear el scroll


    columna.addEventListener('touchmove', evento => {                                   // Detectar si el usuario se desplaza verticalmente
      const desplazamientoY = Math.abs(evento.touches[0].clientY - inicioToqueY);       // Diferencia entre la posición inicial y la posición actual
      const desplazamientoX = Math.abs(evento.touches[0].clientX - inicioToqueX);

      if (desplazamientoY > SWIPE_THRESHOLD || desplazamientoX > SWIPE_THRESHOLD) {     // Si se mueve más de 15 píxeles, asumimos que es scroll
        isScrolling = true;
      }
    }, { passive: true });


    columna.addEventListener('touchend', evento => {                                    // Detectar si fue un tap
      if (isScrolling) return;                                                          // Si el usuario estaba desplazándose, NO es un TAP

      evento.stopPropagation();                                                         // Evita que este toque "suba" a elementos padres y cierre todas las columnas

      const estabaActiva = columna.classList.contains('servicio-activo');
      columnasServicios.forEach(c => c.classList.remove('servicio-activo'));            // Cerramos TODAS las columnas

      if (!estabaActiva) {
        columna.classList.add('servicio-activo');                                       // Si la columna NO estaba activa, la activamos
      } 
    });
  });

  // Tocar fuera → cerrar todos
  document.addEventListener('touchstart', evento => {
    if (!sec3.contains(evento.target)) {                                                // Si lo que tocamos NO está dentro de la sección 3...
      columnasServicios.forEach(c => c.classList.remove('servicio-activo'));            // Cerramos todas las columnas activas
    }
  }, { passive: true });

  // Cambiar de sección → cerrar columnas
  document.addEventListener('sectionChange', () => {
    columnasServicios.forEach(c => c.classList.remove('servicio-activo'));
  });

  // ----------------------------------------------------------------
  // Para que no se abra una columna sin antes mover el mouse al entrar en la seccion
  // ----------------------------------------------------------------

  let hoverPermitido = true;                                                            // Control global: ¿se permite hover?
  let pointerMoveHandler = null;                                                        // Listener temporal del primer movimiento

  function instalarEsperaPrimerMovimiento() {

    // Desactivar temporalmente el hover al entrar en la seccion
    hoverPermitido = false;
    document.body.classList.remove("hover-enabled");

    columnasServicios.forEach(c => c.classList.add("no-hover"));                        // Se marca cada columna como “no-hover” para evitar que se abran

    if (pointerMoveHandler) return;                                                     // Evita añadir múltiples listeners si ya existe uno activo

    pointerMoveHandler = function () {                                                  // Cuando el usuario mueve realmente el mouse dentro de sec3
      hoverPermitido = true;

      // CSS vuelve a activar todo el comportamiento de hover
      document.body.classList.add("hover-enabled");
      columnasServicios.forEach(c => c.classList.remove("no-hover"));

      // El listener ya cumplió su función → se elimina
      sec3.removeEventListener("pointermove", pointerMoveHandler);
      pointerMoveHandler = null;
    };

    sec3.addEventListener("pointermove", pointerMoveHandler);
  }

  columnasServicios.forEach(col => {                                                    // Reacciona a pointerenter de cada columna
    col.addEventListener("pointerenter", () => {
      if (!hoverPermitido) col.classList.add("no-hover");                               // Si hover aún NO está permitido, forzar estado no-hover
      else col.classList.remove("no-hover");                                            // Si hover está habilitado, asegurar que la columna responda normal
    });
  });

  window.addEventListener("sectionChange", (e) => {                                     // Cada vez que se entra o sale de sec3
    const cur = e?.detail?.current;

    if (Number.isFinite(cur) && cur === 2) {                                            // Entramos a sec3 → esperar primer movimiento
      instalarEsperaPrimerMovimiento();
    } else {                                                                            // Saliendo de sec3 → resetear
      columnasServicios.forEach(c => c.classList.remove("no-hover"));
      document.body.classList.remove("hover-enabled");

      if (pointerMoveHandler) {                                                         // Si aún existe el listener pendiente del primer movimiento → eliminarlo
        sec3.removeEventListener("pointermove", pointerMoveHandler);
        pointerMoveHandler = null;
      }

      hoverPermitido = true;                                                            // Vuelve al estado normal
    }
  });

  // Si ya estamos en sec3 al recargar la página → aplicar bloqueo de hover
  if (typeof window.getCurrentSection === "function" ? window.getCurrentSection() === 2 : false) {
    instalarEsperaPrimerMovimiento();
  }
};
