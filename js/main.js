import { gsap } from "gsap";
gsap.registerPlugin(ScrollToPlugin);                                            // Activa ScrollToPlugin para controlar el scroll del viewport con GSAP (snap por sección)

import { isTouchDevice } from "./utilidades/detectarDispositivo.js"; 
import { initModelo3d } from "./modelo3d.js";
import { initSec1 } from "./secciones/sec1-inicio.js";
import { initSec2 } from "./secciones/sec2-servicios.js";
import { initSec3 } from "./secciones/sec3-nosotros.js";
import { initSec4 } from "./secciones/sec4-equipo.js";
import { initSec5 } from "./secciones/sec5-contacto.js";


(() => {

  const sections = Array.from(document.querySelectorAll('.panel'));             // Busca todas las secciones de la página, las que tienen clase .panel, y las convierte en array para obtener su indice y usar "forEach"
  const totalSec = sections.length;                                             // Número total de secciones (5) para evitar ir a alguna seccion que no existe
  const barraDeProgreso = document.querySelector('.scroll-progress-bar');

  const PROGRESS_BAR_DURATION = 0.28;                                               // Duración de la animación de la barra de progreso cuando se cambia de seccion

  let current = 0;                                                              // Índice de la sección actual (de 0 a 4)
  let isAnimating = false;                                                      // Indica si hay una animación en curso. Evita múltiples transiciones simultáneas
  let draggingScrollbar = false;
  let moverIndicadorNav = null;

  const IS_TOUCH = isTouchDevice();

  function loaderActivo() {
    return document.body.classList.contains("preloader");
  }

  // --------------------------------------------------------------------------
  // VH (soporte visualViewport si existe)
  // --------------------------------------------------------------------------
  function updateVH() {                                                         // Actualiza variable CSS --vh dependiendo del viewport real
    const viewport = window.visualViewport;                                     // Detecta viewport real (si existe) visible en móviles (excluye barra de navegación, teclado, zoom, etc)
    const height = viewport ? viewport.height : window.innerHeight;             // Si existe visualViewport, usa su altura real. Si no existe (pc o navegador antiguo), usa window.innerHeight
    document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);   // escribe el 1% de la altura real en la variable CSS --vh
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateVH, { passive: true }); // recalcula al cambiar tamaño del viewport visual
  } else {
    window.addEventListener('resize', updateVH, { passive: true });             // Si no existe visualViewport, al menos recalcula cuando la ventana cambia de tamaño
  }


  // --------------------------------------------------------------------------
  // Obtener sección por índice y calcular progreso
  // --------------------------------------------------------------------------
  function getSectionByIndex(idx) {                                             // devuelve la sección asegurando índice dentro de rango válido
    return sections[Math.max(0, Math.min(totalSec - 1, idx))];                  // Math.min asegura que no sea mayor al total y Math.max asegura que no sea negativo
  }

  function updateProgressBarForIndex(idx) {                                     // anima la barra de progreso hacia el porcentaje asociado a "idx"
    const pct = (idx / (totalSec - 1)) * 100;                                   // calcula porcentaje relativo (0..100) respecto al total de secciones
    gsap.to(barraDeProgreso, { width: pct + "%", duration: PROGRESS_BAR_DURATION }); // anima con GSAP el ancho de la barra hasta el porcentaje calculado
  }

  // --------------------------------------------------------------------------
  // NAVEGACIÓN ENTRE SECCIONES
  // - En PC: usamos GSAP scrollTo para animaciones controladas (1 gesto = 1 sección)
  // - En Moviles: usamos scroll nativo (scrollIntoView) para respetar zoom/pinch/gestos
  // --------------------------------------------------------------------------

  function goTo(idx, source = "default") {                                      // source = "default" indica desde dónde se originó la navegación. Si el parámetro no se pasa, js asigna "default" (rueda, teclado, autosnap) automáticamente; la alternativa es nav, que tiene su propia animación

    if (window.__transitionLocked) return;                                      // Evita cambiar de sección mientras se ejecutan transiciones críticas (ej. fondo full sec4), para no solapar animaciones de scroll con lógica pesada y prevenir tirones
    if (window.__isCollapsing3D) return;                                        // Si el 3D ya está en proceso de colapso, no hace nada para evitar duplicar acciones
    if (window.is3DExpanded?.()) {                                              // Si el contenedor 3D está expandido cuando se intenta navegar...
      window.__isCollapsing3D = true;                                           // Marca que el colapso ya fue iniciado. Evita que se intente colapsar dos veces
      window.after3DCollapse = () => goTo(idx, source);                         // Guarda la navegación como callback diferido, "= () =>" se usa para guardar una función que llama a otra función. NO navega todavía, se ejecuta cuando alguien llame a window.after3DCollapse
      window.collapse3DContainer?.();                                           // Inicia el colapso del contenedor 3D
      return;
    }
  
    const modal = document.getElementById("mail-modal");                        // ventanita de opciones de emails de la sec5
    if (modal) modal.style.display = "none";                                    // si existe, lo oculta inmediatamente (cuando se sale de sec5, se cierra)

    const next = Math.max(0, Math.min(totalSec - 1, idx));                      // asegura índice dentro de límites (clamp)
    if (next === current) return;                                               // si no hay cambio de sec, no hace nada

    const target = getSectionByIndex(next);                                     // obtener elemento destino por índice
    if (!target) return;

    // ------------------ MODO MÓVIL → scroll nativo ------------------
    if (IS_TOUCH) {                                                             // En móviles usamos scroll nativo (sin snap) para respetar gestos, zoom y navbar
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });            // Hacer scroll suave nativo (no snap); el observer actualizará "current" cuando la sección sea mayoritariamente visible. "start" alinea la parte superior
      return;
    }

    // ------------------ MODO DESKTOP → GSAP snap -------------------------
    isAnimating = true;                                                         // bloquea nuevos gestos hasta que termine la animación
    
    const isNav = source === "nav";

    const duration = isNav ? 0.75 : 0.35;                                       // si el cambio viene de nav, dura 0.75 seg, sino 0.35
    const ease = isNav ? "power3.inOut" : "power2.out";

    gsap.to(window, {                                                           // usa GSAP + ScrollToPlugin para animar el scroll del viewport hacia el elemento "target"
      scrollTo: { y: target, autoKill: false },                                 // "y: target" indica que ScrollTo calculará la posición de ese elemento; autoKill:false evita que la animación se interrumpa si el usuario hace scroll durante la animación
      duration,                                                                 // duración de la animación al cambiar de una sección a otra
      ease,

      onStart: () => {  
        moverIndicadorNav?.(next);
      },

      onUpdate: () => {                                                         // Mover barra de progreso MIENTRAS se anima. Esta parte es mas que todo acompañamiento visual
        const scrollY = window.scrollY;                                         // lee la posición actual del scroll del documento
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight; // calcula máximo scroll posible, para convertir a porcentaje
        const pct = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;            // convierte scrollY en porcentaje (evita división por cero)
        gsap.set(barraDeProgreso, { width: pct + "%" });                        // actualiza la anchura de la barra sin crear nueva animación (set es instantáneo)
      },

      onComplete: () => {
        current = next;                                                         // sincroniza la sección actual con el destino
        if (window.reset3DCamera) window.reset3DCamera();                       // Reinicia la cámara Three.js cuando se cambia de sección
        updateProgressBarForIndex(current);                                     // asegura que la barra quede exacta a la nueva sección (la actual)

        // Evento global para todas las secciones
        window.dispatchEvent(new CustomEvent("sectionChange", { detail: { current } })); // indice actual. Notifica que se cambió de sección

        isAnimating = false;                                                    // libera flag para permitir nuevos gestos
      }
    });
  }

  window.goToSection = goTo;                                                    // Exponer para conTab.js


  // --------------------------------------------------------------------------
  // NAV INDICADOR — REACTIVO A current
  // --------------------------------------------------------------------------

  function iniciarIndicadorNav() {
    if (IS_TOUCH) return;

    const nav = document.querySelector(".navbar");
    const links = nav?.querySelectorAll(".nav-links a");
    const indicadorNav = nav?.querySelector(".nav-indicador");

    if (!nav || !links.length || !indicadorNav) return;

    function seccionAIndiceNav(sectionIdx) {
      if (sectionIdx === 3) return 2;
      if (sectionIdx === 4) return 3;
      return sectionIdx;
    }

    moverIndicadorNav = function(sectionIdx) {
      const navIdx = seccionAIndiceNav(sectionIdx);
      const link = links[navIdx];
      if (!link) return;
      const linkRect = link.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const posicionX =
      linkRect.left - navRect.left + linkRect.width / 2 - indicadorNav.offsetWidth / 2;

      gsap.to(indicadorNav, {
        x: posicionX,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
        overwrite: true
      });
    };
    // posicionar correctamente al iniciar
    requestAnimationFrame(() => moverIndicadorNav(current));
  }


  // --------------------------------------------------------------------------
  // EVENTOS DE ENTRADA (wheel / touch / autosnap / teclado)
  // --------------------------------------------------------------------------

  // ---------- DESKTOP ONLY: wheel → 1 gesto = 1 cambio ----------

  if (!IS_TOUCH) {                                                              // Registramos handlers solo en DESKTOP; en movil dejamos el scroll nativo intacto

    window.addEventListener("wheel", (ev) => {                                  // listener principal para el evento wheel (rueda del mouse) usado en PC
      if (window.is3DTransitioning?.()) {                                       // Si el contenedor 3D está en medio de una transición...
        ev.preventDefault();                                                    // prevenimos el scroll nativo, descartamos completamente el evento, NO se acumula delta, NO se dispara navegación luego
        return;
      }

      if (loaderActivo()) { ev.preventDefault(); return; }
      if (IS_TOUCH) return;                                                     // si es táctil, ignorar (los móviles NO deben usar esta lógica porque rompe zoom y scroll nativo)
      if (isAnimating) { ev.preventDefault(); return; }                         // si estamos animando, bloqueamos la rueda para evitar saltos dobles o animaciones encimadas
      ev.preventDefault();                                                      // detenemos el scroll por defecto del navegador, así GSAP tiene control total de la transición

      const delta = ev.deltaY;                                                  // valor del desplazamiento vertical: positivo = bajar, negativo = subir

      if (Math.abs(delta) < 20) return;                                         // ignora movimientos muy pequeños que algunos mouse disparan accidentalmente

      if (delta > 0) goTo(current + 1);                                         // si delta positivo → bajar a la siguiente sección
      else goTo(current - 1);                                                   // si delta negativo → subir a la sección anterior
    }, { passive: false });                                                     // passive:false es necesario para poder usar preventDefault()


    // ---------- Touch para PC híbridos (sin afectar móviles) ----------

    let touchStartY = 0;                                                        // guarda la Y inicial de un toque
    let touchLocked = false;                                                    // bloquea múltiples swipes durante el mismo gesto

    window.addEventListener("touchstart", (e) => {                              // guarda punto inicial al tocar
      if (loaderActivo()) return;
      touchStartY = e.touches[0].clientY;                                       // lee la primera touch y guarda su coordenada Y
      touchLocked = false;                                                      // Se desbloquea al inicio de cada nuevo gesto
    }, { passive: true });


    window.addEventListener("touchmove", (e) => {                               // detecta movimiento del dedo cuando el usuario desliza
      if (loaderActivo()) return;
      const diff = touchStartY - e.touches[0].clientY;                          // diferencia entre inicio y posición actual (positivo = swipe hacia arriba)

      // si ya se usó un swipe dentro del mismo gesto → prevenimos el scroll nativo si es posible
      if (touchLocked || isAnimating) return;
      if (Math.abs(diff) < 35) return;
      touchLocked = true;
      goTo(diff > 0 ? current + 1 : current - 1);
    }, { passive: true });


    window.addEventListener("touchend", () => {                                 // al levantar el dedo permite futuros swipes
      touchLocked = false;
    }, { passive: true });


    // --------------------------------------------------------------------------------------
    // AUTOSNAP: detecta automáticamente snap preciso cuando se suelta la barra de navegación
    // --------------------------------------------------------------------------------------
    (function iniciarAutoSnap() {

      let barScrollTimeout = null;                                              // temporizador para detectar fin de scroll manual

      window.addEventListener('pointerdown', (ev) => {                          // detecta si el usuario hizo pointerdown (click REAL) en la scrollbar
        if (loaderActivo()) return;
        if (isAnimating) return;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth; // window.innerWidth incluye la scrollbar; clientWidth no

        // Click real en la scrollbar
        if (scrollbarWidth > 0 && ev.clientX >= window.innerWidth - scrollbarWidth) {
          draggingScrollbar = true;
        }
      }, { passive: true });

      window.addEventListener("pointerup", () => {                              // Snap SOLO al soltar
        if (!draggingScrollbar) return;

        draggingScrollbar = false;

        if (!isAnimating) {
          snapASeccionMasCercana();
        }
      }, { passive: true });

      window.addEventListener('scroll', () => {                                 // scroll fallback: cuando el usuario deja de scrollear tras N ms
        if (loaderActivo()) return;
        if (isAnimating) return;
        if (draggingScrollbar) return;
        clearTimeout(barScrollTimeout);
        barScrollTimeout = setTimeout(() => { snapASeccionMasCercana(); }, 120);
      }, { passive: true });
      
      function snapASeccionMasCercana() {                                       // calcula la sección más centrada en viewport y hace goTo
        if (IS_TOUCH) return;
        if (isAnimating) return;
        if (draggingScrollbar) return;

        const centroPantallaY = window.innerHeight / 2;                         // detecta el centro del viewport, así sabemos qué punto se debe alinear
        let mejorIndice = current;
        let mejorDistancia = Infinity;

        sections.forEach((sec, idx) => {                                        // recorremos todas las secciones
          const rect = sec.getBoundingClientRect();                             // rect relativo al viewport (top, bottom, height, etc. pero medidos en coordenadas del viewport)
          const secCenterY = rect.top + rect.height / 2;                        // centro de la sección relativo a viewport
          const distance = Math.abs(secCenterY - centroPantallaY);              // calcula cuánta diferencia hay respecto al centro del viewport
          if (distance < mejorDistancia) {                                      // mientras más cerca esté del centro, más debe ser la sección ganadora
            mejorDistancia = distance;
            mejorIndice = idx;
          }
        });

        if (mejorIndice !== current) {                                          // si es una sección diferente → haz snap
          goTo(mejorIndice);                                                    // anima al índice ganador
        } else {                                                                // si ya estamos en la mejor, reajustamos finamente para evitar quedar "medio pixel"
          const target = getSectionByIndex(current);
          if (!target || isAnimating) return;
          // siempre usamos window (porque GO TO siempre usa window)
          gsap.to(window, {
            scrollTo: { y: target, autoKill: false },
            duration: 0.2,
            ease: "power1.out"
          });
        }
      }

    })(); // aqui acaba iniciarAutoSnap

    
  } else {
    // ==========================================================================
    // MÓVIL — actualizar barra de progreso durante scroll nativo
    // ==========================================================================

    window.addEventListener("scroll", () => {
      if (loaderActivo()) return;                                               // si el preloader sigue activo → NO actualizamos la barra
      const scrollY = window.scrollY;                                           // posición actual del scroll desde arriba
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight; // cuánto máximo puede scrollear el documento
      const pct = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;              // convierte el scroll a porcentaje entre 0 y 100
      gsap.set(barraDeProgreso, { width: pct + "%" });                              // actualizar barra instantáneamente
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
    // TECLADO (siempre activo)
    // --------------------------------------------------------------------------
    function onKeyDown(e) {                                                     // detecta teclas presionadas
      if (loaderActivo()) { e.preventDefault(); return; }
      if (isAnimating) return;

      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();                                                     // prevenir scroll nativo
        goTo(current + 1);

      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault(); 
        goTo(current - 1);

      } else if (e.key === "Home") {
        e.preventDefault(); 
        goTo(0);

      } else if (e.key === "End") {
        e.preventDefault(); 
        goTo(totalSec - 1);
      }
    }

    // --- BLOQUEAR TAB MIENTRAS EL PRELOADER ESTÁ ACTIVO -----------------------
    document.addEventListener('keydown', function(e) {
      if (loaderActivo() && e.key === 'Tab') {
        e.preventDefault();
        e.stopImmediatePropagation();                                           // evita que conTab.js reciba el evento
      }
    }, { capture: true });


    // --------------------------------------------------------------------------
    // NAV y boton siguiente de la seccion 4
    // --------------------------------------------------------------------------
    function wireNavLinks() {                                                   // función que conecta cada <a> con data-index al sistema de navegación
      document.querySelectorAll(".navbar a[data-index]").forEach(a => {         // selecciona todos los enlaces con data-index
        a.addEventListener("click", (ev) => {                                   // Cuando haces clic en el link...
          ev.preventDefault();                                                  // Evita que el navegador navegue a otra página
          const idx = parseInt(a.dataset.index);                                // convertir el data-index a número entero
          const target = getSectionByIndex(idx);

          if (IS_TOUCH) target?.scrollIntoView({ behavior: "smooth", block: "start" }); // en móvil, usar scroll nativo (no GSAP) para respetar gestos táctiles y zoom
          else goTo(idx, "nav");                                                // en PC, usar lógica GSAP, indicando cambio desde el nav
        });
      });
    }

    function wireNextButton() {                                                 // botón dentro de sec3 que salta a la siguiente sección (4)
      const btn = document.querySelector('#sec3 .btn-next');
      if (!btn) return;

      btn.addEventListener('click', (ev) => {                                   // cuando se hace clic en el botón...
        ev.preventDefault();                                                    // evita comportamiento nativo de navegador
        const target = getSectionByIndex(current + 1);                          // determina la siguiente sección lógica
        IS_TOUCH
        ? target.scrollIntoView({ behavior: "smooth", block: "start" })         // si es movil, usar scroll nativo suave (compatible con zoom)
        : goTo(current + 1);                                                    // si es PC, usar GSAP/scroll controlado

      });
    }

    // --------------------------------------------------------------------------
    // RESIZE / ORIENTACIÓN DEL DISPOSITIVO
    // --------------------------------------------------------------------------
    function onResize() {
      updateVH();                                                               // recalcula la variable CSS --vh con la altura real del viewport
      if (IS_TOUCH) return;                                                     // en móviles no se reencaja automáticamente la sección actual para evitar saltos/forzados

      const target = sections[current];                                           // Obtiene la sección actual basándose en el índice current
      if (target) {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });            // Reacomoda la pantalla para que la sección actual quede alineada arriba
      }

    }

    window.addEventListener("orientationchange", () => {                        // se dispara al rotar la pantalla en móvil
      setTimeout(() => {                                                        // retraso para permitir que el navegador reajuste viewport primero
        updateVH();
        onResize();
      }, 400);                                                                  // 400ms = tiempo típico hasta que mobile Safari/Chrome estabilizan viewport
    });

    window.addEventListener("resize", () => {
      updateVH();
      onResize();
    });

  // --------------------------------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------------------------------
  function init() {

    updateVH();

    document.documentElement.style.scrollBehavior = IS_TOUCH ? 'smooth' : 'auto'; // En móviles permite el scroll nativo y suave; en pc usa el scroll con GSAP

    gsap.set(barraDeProgreso, { width: "0%" });                                     // resetea barra de progreso visualmente

    window.addEventListener("keydown", onKeyDown);                              // escucha teclado globalmente

    wireNavLinks();
    wireNextButton();
    if (!IS_TOUCH) iniciarIndicadorNav();


    initSec1();
    initSec2();
    initSec3();
    initSec4();
    initSec5();
    initModelo3d();

    const h1 = sections[0].querySelector("h1");                                 // busca el h1 (el titulo en la mitad) de la primera sección
    if (h1) h1.setAttribute("tabindex", "-1");

    gsap.set(window, { scrollTo: 0 });                                          // asegurar que siempre se empieza en la parte superior (seccion 1)

    setTimeout(() => {                                                          // Espera 50ms para asegurarse de que el DOM esté listo
      const hash = window.location.hash;                                        // leer hash del navegador (#sec2, etc.)
      if (hash) {                                                               // si existe e identifica una sección válida...
        const el = document.querySelector(hash);
        if (el && el.classList.contains('panel')) {                             // Si existe y es una sección, hace scroll hacia ella
          if (IS_TOUCH) el.scrollIntoView({ behavior: 'auto', block: 'start' }); // móvil → scroll nativo
          else gsap.set(window, { scrollTo: el });                              // PC → salto directo
        }
      }
      updateProgressBarForIndex(current);                                          // actualizar barra de progreso al iniciar
    }, 50);                                                                     // 50 ms permite que el layout esté listo
  }


  // Esperamos al preloader
  document.addEventListener("DOMContentLoaded", () => {                         // cuando el DOM está listo...
    if (sessionStorage.getItem("preloaderMostrado")) init();                    // si el preloader ya se mostró, inicializa
    else document.addEventListener("loader:end", init, { once: true });         // si no, espera evento custom loader:end
  });

  window.getCurrentSection = () => current;                                     // expone función para obtener sección actual

})();



