import { cardsHTML } from "../template/cards-template.js";
import { tieneGPUReal } from "../utilidades/detectarGPU.js";
import { isTouchDevice, hasHover, isMobileSize } from "../utilidades/detectarDispositivo.js";

let sec4Inicializada = false;                        // asegura que la lógica de la sección 5 solo se inicialice UNA vez durante toda la vida de la página, para evitar listeners duplicados y tirones causados por inicializaciones repetidas

export function initSec4() {

  if (sec4Inicializada) return;                      // Si sec4 ya fue inicializada antes, salimos inmediatamente y NO volvemos a ejecutar el código
  sec4Inicializada = true;                           // Marca la sección como inicializada

  const contenedorTarjetas = document.getElementById("cards-container");

  // Si el contenedor existe, inserta el HTML de las tarjetas
  if (contenedorTarjetas) {
    contenedorTarjetas.innerHTML = cardsHTML;
  }

  // ----------------------------------------------------------------
  // SISTEMA TÁCTIL (TOUCH) — abrir / cerrar tarjetas en móviles
  // ----------------------------------------------------------------
  const isTouch = isTouchDevice();
  const sec4 = document.querySelector("#sec4");

  if (isTouch) {

    const tarjetas = document.querySelectorAll("#sec4 .card__article");

    let tarjetaAbierta = null;                       // Guarda cuál tarjeta está abierta
    let ultimoToque = 0;                             // Guarda el tiempo del último toque (para distinguir click de touch)

    const TOUCH_DELAY = 700;                         // Retraso para diferenciar entre un "touch" real y el "click fantasma" que generan los móviles
    const MOVE_THRESHOLD = 12;                                                         // px mínimos para considerar movimiento real

    // Estado del gesto (swipe / tap)
    let startX = 0, startY = 0;
    let moved = false;

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

    // Detección de gesto ------------------------------
    function onTouchStart(e) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
    }

    function onTouchMove(e) {
      if (!tarjetaAbierta) return;
      const t = e.touches[0];

      // Detecta si el movimiento supera el umbral → swipe
      if (
        Math.abs(t.clientX - startX) > MOVE_THRESHOLD ||
        Math.abs(t.clientY - startY) > MOVE_THRESHOLD
      ) {
        moved = true;
        cerrarTarjeta(tarjetaAbierta);
      }
    }

    // Activación por TAP (solo si NO hubo swipe)
    function activarTarjetaPorTap(evento, tarjeta) {                                   // Controla si abrir o cerrar al tocar

      if (evento.type === "click" && Date.now() - ultimoToque < TOUCH_DELAY) return;   // Si llega un click inmediatamente después de un touch, lo ignoramos

      if (evento.target.closest(".info__link")) return;                                // Si se tocó un enlace dentro de la tarjeta, no abrir/cerrar

      if (moved) return; // Si se movió (scroll), NO abrir

      if (tarjetaAbierta === tarjeta) return cerrarTarjeta(tarjeta);                   // Si la tarjeta ya estaba abierta, se cierra

      abrirTarjeta(tarjeta);                                                           // Si no estaba abierta, se abre
    };

    // Eventos en tarjetas ------------------------------
    tarjetas.forEach(tarjeta => {                                                      // Asignamos los eventos táctiles y de click a cada tarjeta
      
      tarjeta.addEventListener("touchstart", onTouchStart, { passive: true });         // Registrar el inicio del toque
      tarjeta.addEventListener("touchmove", onTouchMove, { passive: true });           // Detectar si hubo desplazamiento real (scroll)

      tarjeta.addEventListener("touchend", (e) => {                                    // Final del toque
        ultimoToque = Date.now();                                                      // Registra el momento del toque

        if (!e.target.closest(".info__link") && e.cancelable) {                        // Evita que el navegador simule un click después del toque
          e.preventDefault();
        }

        activarTarjetaPorTap(e, tarjeta);                                              // Activar abrir/cerrar
      }, { passive: false });

      // Aunque esto es código táctil, los móviles generan un "click" después del touch. Lo escuchamos para poder bloquear ese click fantasma dentro de activate().
      tarjeta.addEventListener("click", (e) => activarTarjetaPorTap(e, tarjeta));
    });

    // Eventos a nivel sección (swipe global + cerrar afuera) ------------------------------
    if (sec4) {
      // Swipe en cualquier parte de la sección
      sec4.addEventListener("touchstart", onTouchStart, { passive: true });
      sec4.addEventListener("touchmove", onTouchMove, { passive: true });

      // Click fuera de una tarjeta → cerrar
      sec4.addEventListener("click", (e) => {
        if (!e.target.closest(".card__article")) {
          cerrarTarjeta(tarjetaAbierta);
        }
      });

      // Salir de la sección → cerrar
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) cerrarTarjeta(tarjetaAbierta);
      }, { threshold: 0.1 }).observe(sec4);
    }
  }

  // ----------------------------------------------------------------
  // EFECTO 3D EN ESCRITORIO (INCLINACIÓN + REFLEJO)
  // ----------------------------------------------------------------

  const tieneHover = hasHover();                                                       // Comprueba si hay cursor preciso y soporta hover → indica que es PC con mouse
  
  if (tieneHover) {

  const selectorTarjetas = "#sec4 .card__article";
  const contenedorTilt =                                                               // Busca el contenedor donde existen o se insertarán las tarjetas
    document.getElementById("cards-container") ||                                      // 1) Intenta obtener por ID directo
    document.querySelector("#sec4 .card__container") ||                                // 2) Alternativamente por un contenedor interno
    document.querySelector("#sec4");                                                   // 3) Último recurso: toda la sección sec4

  if (!contenedorTilt) {
    console.warn("sec4: contenedor para efecto tilt no encontrado");

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
  if (isMobileSize()) {
    return;
  }

  /* -----------  MODO FULL O LITE? ----------- */

  const isGPU = tieneGPUReal();                                                        // Llama a la función global → true si hay GPU real, false si es CPU o WebGL lento

  if (!isGPU) {                                                                        // Si NO hay aceleración → activar modo LITE
    document.body.classList.add("sec4-lite");

    const burbujaInteractiva = document.querySelector("#sec4 .interactive");           // Desactiva por completo la burbuja interactiva del fondo en LITE
    if (burbujaInteractiva) burbujaInteractiva.remove();
    return;
  }

  /* ----------- ANIMACIÓN DE LA BURBUJA INTERACTIVA (solo modo FULL) ----------- */

  document.body.classList.remove("sec4-lite");                                         // Hay GPU real → asegurar que esta en modo FULL

  const burbujaInteractiva = document.querySelector("#sec4 .interactive");             // Elemento que se mueve siguiendo el mouse

  if (burbujaInteractiva && sec4) {                                                    // Solo si ambos existen...

    let curX = 0, curY = 0;                                                            // Posición actual de la burbuja
    let targetX = 0, targetY = 0;                                                      // Posición hacia donde la burbuja debe moverse
    let running = false;                                                               // Estado de si la animación está activa o no
    let mouseTracking = false;                                                         // Controla si respondemos al movimiento del mouse

    let rafId = null;                                                                  // Significa "request animation frame Id". Es para asegurar que no se ejecute la misma animacion mas de una vez al mismo tiempo
    function animateBubble() {
      if (!running) {
        rafId = null;
        return;
      }

      curX += (targetX - curX) / 20;                                                   // Lerp → mueve un 5% hacia el objetivo en X                   // targetX - curX → distancia hasta el objetivo
      curY += (targetY - curY) / 20;                                                   // Lerp → mueve un 5% hacia el objetivo en Y                   // / 20 → significa “moverse un 5% cada frame” (1/20 = 0.05)
      burbujaInteractiva.style.transform = `translate(${curX}px, ${curY}px)`;          // Actualiza estilo CSS para mover la burbuja visualmente
      rafId = requestAnimationFrame(animateBubble);                                    // Repite la animación cada frame del navegador
    }

    let firstMouseMove = false;                                                        // Marca si el usuario ya movió el mouse al menos una vez dentro de sec4 (por cada vez que se vuelve a entrar)

    function enable() {
      running = true;
      mouseTracking = false;
      firstMouseMove = false;                                                          // Reinicia el estado cada vez que entras a la sección
    }

    function disable() {                                                               // Desactiva la animación al salir de la sección
      running = false;
      mouseTracking = false;
      firstMouseMove = false;                                                          // Reinicia estado para la próxima entrada.
      burbujaInteractiva.style.transform = "";                                         // Resetea posición css de la burbuja
    }

    // ----------------------------------------------------------------
    // Gestiona el tiempo de vida del fondo FULL (cuando activar y desactivar)
    // ----------------------------------------------------------------
    // evitar que el fondo pesado se active/desactive muy rapido o en el mismo frame que la animación de navegación, previniendo tirones visuales
    
    let sec5EnterTimeout = null;                                                       // ID del setTimeout que retrasa la activación de la sección 5. Permite cancelar la activación si se pasa muy rápido por la sección
    let sec5ExitTimeout = null;                                                        // ID del setTimeout que retrasa la DESACTIVACIÓN de la sección 5. Permite cancelar el apagado si el usuario vuelve a entrar antes de que termine
    let sec5ActivatedAt = 0;                                                           // Momento exacto (en ms) en que el fondo FULL se activó realmente. Sirve para saber cuánto tiempo estuvo activo y evitar apagarlo demasiado rápido
    const MIN_ACTIVE_TIME = 250;                                                       // Tiempo mínimo (en ms) que el fondo FULL debe estar activo. Evita encender y apagar el fondo full cuando el usuario pasa brevemente por sec4

    // BLOQUEO GLOBAL DE TRANSICIONES DE SECCIÓN -------------------

    function lockTransition(ms) {
      window.__transitionLocked = true;                                                // Marca globalmente que las transiciones están bloqueadas
      setTimeout(() => {                                                               // Tras el tiempo indicado, se vuelve a permitir la navegación
        window.__transitionLocked = false;
      }, ms);
    }

    // ESCUCHA GLOBAL DE CAMBIO DE SECCIÓN y decide cuando encender o apagar el fondo FULL -------------------

    window.addEventListener("sectionChange", (e) => {                                  // Activación por cambio de sección
      const current = e.detail.current;                                                // sec actual
      const active = current === 3;                                                    // sec4 = index 3
      
      clearTimeout(sec5EnterTimeout);                                                  // Cancela cualquier activación pendiente de sec4. Evita que el fondo se active tarde si el usuario pasó rápido por la sección
      clearTimeout(sec5ExitTimeout);                                                   // Cancela cualquier desactivación pendiente. Evita apagar el fondo si el usuario volvió a entrar rápidamente

      if (active) {                                                                    // el usuario esta entrando a la sección 5...
        lockTransition(200);                                                           // Bloquea la navegación entre secciones durante un corto periodo
        sec5EnterTimeout = setTimeout(() => {                                          // Retrasa levemente la activación real del fondo y la animación. Evita que el fondo pesado se active en el mismo frame que la animación de cambio de sección
          sec5ActivatedAt = performance.now();                                         // Guarda el momento exacto de activación del fondo
          document.body.classList.add("sec4-active");                                  // Agrega una clase al body que activa animaciones CSS y filtros del fondo FULL
          enable();                                                                    // Activa animaciones de js
        }, 100);                                                                       // Espera 100ms antes de encender el fondo, para esperar a que termine la animación de cambio de sección

      } else {                                                                         // El usuario está saliendo de la sección...
        const now = performance.now();                                                 // Obtiene el tiempo actual
        if (!sec5ActivatedAt) {                                                        // Si por alguna razón el fondo nunca llegó a activarse...
          sec5ActivatedAt = now;
        }

        const timeAlive = now - sec5ActivatedAt;                                       // Calcula cuánto tiempo (en ms) estuvo activo el fondo FULL
        const EXIT_DELAY = 120;                                                        // Delay base antes de apagar el fondo FULL

        lockTransition(250);                                                           // Bloquea la navegación durante el apagado del fondo
        sec5ExitTimeout = setTimeout(() => {
          document.body.classList.remove("sec4-active");
          disable();
          sec5ActivatedAt = 0;                                                         // Resetea el estado para la próxima entrada a sec4
        }, Math.max(EXIT_DELAY, MIN_ACTIVE_TIME - timeAlive));                         // Se apaga cuando se cumple el delay mínimo de salida y se respeta el tiempo mínimo de vida del fondo
      }
    });

    // ----------------------------------------------------------------
    // mousemove
    // ----------------------------------------------------------------

    sec4.addEventListener("mousemove", (e) => {
      if (!running) return;

      if (!firstMouseMove) {
        firstMouseMove = true;
        mouseTracking = true;
        if (!rafId) animateBubble();                                                   // Arranca requestAnimationFrame solo cuando hace falta
      }

      if (!mouseTracking) return;                                                      // Si la burbuja no está activa → no hacemos nada
      const rect = sec4.getBoundingClientRect();                                       // Tamaño y posición de la sección en pantalla
      targetX = e.clientX - (rect.left + rect.width / 2);                              // Calcula desplazamiento horizontal desde el centro de sec4
      targetY = e.clientY - (rect.top + rect.height / 2);                              // Igual para vertical
    });
  }
}
