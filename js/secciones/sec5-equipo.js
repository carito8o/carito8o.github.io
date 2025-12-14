import { cardsHTML } from "../template/cards-template.js";
import { tieneGPUReal } from "../utilidades/detectarGPU.js";

export function initSec5() {

  const contenedorTarjetas = document.getElementById("cards-container");

  // Si el contenedor existe, inserta el HTML de las tarjetas
  if (contenedorTarjetas) {
    contenedorTarjetas.innerHTML = cardsHTML;
  }

  // ----------------------------------------------------------------
  // SISTEMA TÁCTIL (TOUCH) — abrir / cerrar tarjetas en móviles
  // ----------------------------------------------------------------
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  if (isTouch) {

    const tarjetas = document.querySelectorAll("#sec5 .card__article");

    let tarjetaAbierta = null;                       // Guarda cuál tarjeta está abierta
    let ultimoToque = 0;                             // Guarda el tiempo del último toque (para distinguir click de touch)
    const TOUCH_DELAY = 700;                         // Retraso para diferenciar entre un "touch" real y el "click fantasma" que generan los móviles

    // PARA EVITAR APERTURAS CON SCROLL (debe ser con tap)
    let startX = 0, startY = 0;
    let moved = false;
    const MOVE_THRESHOLD = 12;                                                         // px mínimos para considerar movimiento real

    const cerrarTarjeta = tarjeta => {
      if (!tarjeta) return;
      tarjeta.classList.remove("show-info");                                           // Oculta la información (descripcion y redes)
      tarjetaAbierta = null;                                                           // Ninguna tarjeta queda abierta
    };

    const abrirTarjeta = tarjeta => {
      if (!tarjeta) return;
      if (tarjetaAbierta && tarjetaAbierta !== tarjeta) cerrarTarjeta(tarjetaAbierta); // Si había otra tarjeta abierta, se cierra primero
      
      tarjeta.classList.add("show-info");
      tarjetaAbierta = tarjeta;                                                        // Guardamos cuál está abierta ahora
    };

    const activate = (evento, tarjeta) => {                                            // Controla si abrir o cerrar al tocar

      if (evento.type === "click" && Date.now() - ultimoToque < TOUCH_DELAY) return;   // Si llega un click inmediatamente después de un touch, lo ignoramos

      if (evento.target.closest(".info__link")) return;                                // Si se tocó un enlace dentro de la tarjeta, no abrir/cerrar

      if (moved) return; // Si se movió (scroll), NO abrir

      if (tarjetaAbierta === tarjeta) return cerrarTarjeta(tarjeta);                   // Si la tarjeta ya estaba abierta, se cierra

      abrirTarjeta(tarjeta);                                                           // Si no estaba abierta, se abre
    };

    tarjetas.forEach(tarjeta => {                                                      // Asignamos los eventos táctiles y de click a cada tarjeta
      
      tarjeta.addEventListener("touchstart", e => {                                    // Registrar el inicio del toque
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        moved = false;
      }, { passive: true });

      tarjeta.addEventListener("touchmove", e => {                                     // Detectar si hubo desplazamiento real (scroll)
        const t = e.touches[0];
        if (
          Math.abs(t.clientX - startX) > MOVE_THRESHOLD ||
          Math.abs(t.clientY - startY) > MOVE_THRESHOLD
        ) {
          moved = true;
        }
      }, { passive: true });

      tarjeta.addEventListener("touchend", e => {                                      // Final del toque

        ultimoToque = Date.now();                                                      // Registra el momento del toque

        if (!e.target.closest(".info__link") && e.cancelable) {                        // Evita que el navegador simule un click después del toque
          e.preventDefault();
        }

        activate(e, tarjeta);                                                          // Activar abrir/cerrar
      }, { passive: false });

      // Aunque esto es código táctil, los móviles generan un "click" después del touch. Lo escuchamos para poder bloquear ese click fantasma dentro de activate().
      tarjeta.addEventListener("click", (e) => activate(e, tarjeta));
    });

    const sec5 = document.querySelector("#sec5");

    if (sec5) {
      sec5.addEventListener("click", e => {                                            // tocar afuera de una tarjeta → cerrar
        if (!e.target.closest(".card__article")) {
          cerrarTarjeta(tarjetaAbierta);
        }
      });

      new IntersectionObserver(([entry]) => {                                          // salir de la sección → cerrar
        if (!entry.isIntersecting) cerrarTarjeta(tarjetaAbierta);
      }, { threshold: 0.1 }).observe(sec5);
    }
  }

  // ----------------------------------------------------------------
  // EFECTO 3D EN ESCRITORIO (INCLINACIÓN + REFLEJO)
  // ----------------------------------------------------------------

  const tieneHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;  // Comprueba si hay cursor preciso y soporta hover → indica que es PC con mouse
  
  if (tieneHover) {

  const selectorTarjetas = "#sec5 .card__article";
  const contenedorTilt =                                                               // Busca el contenedor donde existen o se insertarán las tarjetas
    document.getElementById("cards-container") ||                                      // 1) Intenta obtener por ID directo
    document.querySelector("#sec5 .card__container") ||                                // 2) Alternativamente por un contenedor interno
    document.querySelector("#sec5");                                                   // 3) Último recurso: toda la sección sec5

  if (!contenedorTilt) {
    console.warn("Sec5: contenedor para efecto tilt no encontrado");

  } else {

  function wrapTilt(tarjeta) {                                                         // Crea un contenedor interno ("wrapper") para aplicar transformaciones 3D. Evita que el contenido interno se deforme

    if (tarjeta.querySelector(".tilt-wrapper")) return tarjeta.querySelector(".tilt-wrapper");  // Si la tarjeta ya tiene un wrapper creado, lo devuelve para no duplicar

    const wrapper = document.createElement("div");
    wrapper.className = "tilt-wrapper";                                                // Le asigna la clase CSS necesaria para transformaciones 3D

    while (tarjeta.firstChild) wrapper.appendChild(tarjeta.firstChild);                // Mientras la tarjeta tenga elementos hijos, los mueve dentro del wrapper
    tarjeta.appendChild(wrapper);

    return wrapper;
  }

  function activarInclinacion3D(tarjeta) {                                             // Activa el efecto 3D en una tarjeta específica
    
    if (!tarjeta || tarjeta.dataset.inclinacionActiva === "true") return;              // Evita activar dos veces el efecto en la misma tarjeta
    tarjeta.dataset.inclinacionActiva = "true";

    const wrapper = wrapTilt(tarjeta);                                                 // Creamos el contenedor interno para el 3D

    let reflejoBrillante = wrapper.querySelector(".reflejo-brillante");                // Buscar o crear el reflejo luminoso

    if (!reflejoBrillante) {
      reflejoBrillante = document.createElement("div");
      reflejoBrillante.className = "reflejo-brillante";
      wrapper.appendChild(reflejoBrillante);
    }

    const ROTACION_MAXIMA = 20;                                                        // Grados máximos de inclinación
    const PROFUNDIDAD_Z = 30;                                                          // Separación desde la pantalla (efecto de profundidad)
    let idAnimacion = null;                                                            // Para evitar animaciones acumuladas

    function onMove(e) {
      if (e.target.closest(".info__link, .info a, .info button")) return;              // Si el mouse pasa por encima de un enlace → no mover la tarjeta

      const rect = tarjeta.getBoundingClientRect();                                    // Medidas y posición de la tarjeta

      // Posición del mouse
      const cx = e.clientX;
      const cy = e.clientY;
      if (cx == null || cy == null) return;

      // Convertir posición del mouse en valores -1 a 1
      const dx = (cx - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (cy - (rect.top + rect.height / 2)) / (rect.height / 2);

      // Calcular rotaciones basadas en dirección del mouse
      const rotY = -dx * ROTACION_MAXIMA;
      const rotX = dy * -ROTACION_MAXIMA;

      // Posición del reflejo
      const gx = ((dx + 1) / 2) * 100;
      const gy = ((dy + 1) / 2) * 100;

      if (idAnimacion) cancelAnimationFrame(idAnimacion);                              // Cancelar animación previa para evitar lag
      
      idAnimacion = requestAnimationFrame(() => {
        tarjeta.style.transform = `translateZ(${PROFUNDIDAD_Z}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`; // Aplicamos transformaciones 3D

        // Ubicamos el reflejo
        reflejoBrillante.style.left = `${gx}%`;
        reflejoBrillante.style.top = `${gy}%`;
        reflejoBrillante.style.opacity = "1";
        reflejoBrillante.style.transform = `translate(-50%, -50%) rotate(45deg) scale(1)`;
      });
    }

    function onLeave() {
      if (idAnimacion) cancelAnimationFrame(idAnimacion);
      idAnimacion = requestAnimationFrame(() => {
        tarjeta.style.transform = "";                                                  // Volver al estado original
        reflejoBrillante.style.opacity = "0";                                          // Ocultar reflejo
        reflejoBrillante.style.left = "50%";
        reflejoBrillante.style.top = "50%";
      });
    }

    // Activamos eventos de mouse
    tarjeta.addEventListener("mousemove", onMove, { passive: true });
    tarjeta.addEventListener("mouseleave", onLeave, { passive: true });
  }

  function initExistingCards() {
    document.querySelectorAll(selectorTarjetas).forEach(activarInclinacion3D);         // Activa el efecto 3D en todas las tarjetas ya existentes
  }

  initExistingCards();

  const observadorCambios = new MutationObserver((mutaciones) => {
    mutaciones.forEach((m) => {
      m.addedNodes.forEach((nodo) => {
        if (!(nodo instanceof HTMLElement)) return;

        if (nodo.matches && nodo.matches(selectorTarjetas)) activarInclinacion3D(nodo);
        if (nodo.querySelectorAll) nodo.querySelectorAll(selectorTarjetas).forEach(activarInclinacion3D);
      });
    });
  });

  observadorCambios.observe(contenedorTilt, { childList: true, subtree: true });

  window.addEventListener("load", initExistingCards);                                  // Asegura que si algo se cargó tarde, se aplique el efecto también
  }
  }

  // ----------------------------------------------------------------
  // Fondo dependiendo el GPU
  // ----------------------------------------------------------------

  // Si es móvil, NO ejecutar ninguna lógica animada de fondo
  if (window.matchMedia("(max-width: 700px)").matches) {
    return;
  }

  /* -----------  MODO FULL O LITE? ----------- */

  const isGPU = tieneGPUReal();                                                        // Llama a la función global → true si hay GPU real, false si es CPU o WebGL lento

  if (!isGPU) {                                                                        // Si NO hay aceleración → activar modo LITE
    document.body.classList.add("sec5-lite");

    const bubble = document.querySelector("#sec5 .interactive");                       // Desactiva por completo la burbuja interactiva del fondo en LITE
    if (bubble) bubble.remove();
    return;
  }

  /* ----------- ANIMACIÓN DE LA BURBUJA INTERACTIVA (solo modo FULL) ----------- */

  document.body.classList.remove("sec5-lite");                                         // Hay GPU real → asegurar que esta en modo FULL

  const bubble = document.querySelector("#sec5 .interactive");                         // Elemento que se mueve siguiendo el mouse
  const sec5 = document.querySelector("#sec5");                                        // Contenedor de la sección (usado para calcular posiciones)

  if (bubble && sec5) {                                                                // Solo si ambos existen...

    let curX = 0, curY = 0;                                                            // Posición actual de la burbuja
    let targetX = 0, targetY = 0;                                                      // Posición hacia donde la burbuja debe moverse
    let running = false;                                                               // Estado de si la animación está activa o no
    let mouseTracking = false;                                                         // Controla si respondemos al movimiento del mouse

    function animateBubble() {
      if (!running) return;                                                            // Si la animación no está activa, detiene el loop

      curX += (targetX - curX) / 20;                                                   // Lerp → mueve un 5% hacia el objetivo en X                   // targetX - curX → distancia hasta el objetivo
      curY += (targetY - curY) / 20;                                                   // Lerp → mueve un 5% hacia el objetivo en Y                   // / 20 → significa “moverse un 5% cada frame” (1/20 = 0.05)
      bubble.style.transform = `translate(${curX}px, ${curY}px)`;                      // Actualiza estilo CSS para mover la burbuja visualmente
      requestAnimationFrame(animateBubble);                                            // Repite la animación cada frame del navegador
    }

    let firstMouseMove = false;                                                        // Marca si el usuario ya movió el mouse al menos una vez dentro de sec5 (por cada vez que se vuelve a entrar)

    function enable() {
      running = true;
      mouseTracking = false;
      firstMouseMove = false;                                                          // Reinicia el estado cada vez que entras a la sección
    }

    function disable() {                                                               // Desactiva la animación al salir de la sección
      running = false;
      mouseTracking = false;
      firstMouseMove = false;                                                          // Reinicia estado para la próxima entrada.
      bubble.style.transform = "";                                                     // Resetea posición css de la burbuja
    }

    window.addEventListener("sectionChange", (e) => {                                  // Activación por cambio de sección
      const active = e.detail.current === 4;                                           // sec5 = index 4
      document.body.classList.toggle("sec5-active", active);                           // Sincroniza JS → CSS, para que el fondo se pause
      if (active) enable();                                                            // Entra → activa animación
      else disable();                                                                  // Sale → detiene animación
    });


    window.addEventListener("mousemove", (e) => {
      if (!running) return;

      if (!firstMouseMove) {
        firstMouseMove = true;
        mouseTracking = true;
        animateBubble();                                                               // Arranca requestAnimationFrame solo cuando hace falta
      }

      if (!mouseTracking) return;                                                      // Si la burbuja no está activa → no hacemos nada
      const rect = sec5.getBoundingClientRect();                                       // Tamaño y posición de la sección en pantalla
      targetX = e.clientX - (rect.left + rect.width / 2);                              // Calcula desplazamiento horizontal desde el centro de sec5
      targetY = e.clientY - (rect.top + rect.height / 2);                              // Igual para vertical
    });
  }
}

