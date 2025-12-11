import { gsap } from "gsap";
gsap.registerPlugin(ScrollToPlugin);                                            // Activa el plugin ScrollTo para scroll animado

import { initSec1 } from "./secciones/sec1-inicio.js";
import { initSec2 } from "./secciones/sec2-modelo3d.js";
import { initSec3 } from "./secciones/sec3-servicios.js";
import { initSec4 } from "./secciones/sec4-nosotros.js";
import { initSec5 } from "./secciones/sec5-equipo.js";
import { initSec6 } from "./secciones/sec6-contacto.js";


(() => {

  const sections = Array.from(document.querySelectorAll('.panel'));             // Busca todas las secciones de la página, las que tienen clase .panel, y las convierte en array para obtener su indice y usar "forEach"
  const total = sections.length;                                                // Número total de secciones (6) para evitar ir a alguna seccion que no existe
  const progressBar = document.querySelector('.scroll-progress-bar');
  const video1 = document.getElementById('bgVideo');                            // Video de fondo de la sección 1

  const PROGRESS_DURATION = 0.28;                                               // Duración de la animación de la barra de progreso cuando se cambia de seccion

  let current = 0;                                                              // Índice de la sección actual (de 0 a 5)
  let isAnimating = false;                                                      // Indica si hay una animación en curso. Evita múltiples transiciones simultáneas

  const IS_TOUCH =                                                              // Detecta si el dispositivo es táctil o no
    navigator.maxTouchPoints > 0 ||                                             // true si el navegador reporta puntos táctiles (los móviles reportan cuántos dedos soportan)
    "ontouchstart" in window ||                                                 // fallback: si existe el evento ontouchstart en window, sugiere un dispositivo táctil
    window.matchMedia("(pointer: coarse)").matches;                             // último recurso: media query que detecta un puntero "coarse" (dedo)

  function loaderActivo() {
    return document.body.classList.contains("preloader");
  }

  // --------------------------------------------------------------------------
  // VH (soporte visualViewport si existe)
  // --------------------------------------------------------------------------
  function updateVH() {                                                         // Actualiza variable CSS --vh dependiendo del viewport real
    const viewport = window.visualViewport;                                     // Detecta viewport real si existe
    const height = viewport ? viewport.height : window.innerHeight;             // Si existe visualViewport, usa su altura real. Si no existe (pc o navegador antiguo), usa window.innerHeight
    document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);   // escribe el 1% de la altura real en la variable CSS --vh
  }
  updateVH();                                                                   // Ejecuta al inicio

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateVH, { passive: true }); // recalcula al cambiar tamaño del viewport visual
    window.visualViewport.addEventListener('scroll', updateVH, { passive: true }); // recalcula si visualViewport se mueve
  } else {
    window.addEventListener('resize', updateVH, { passive: true });             // Si no existe visualViewport, al menos recalcula cuando la ventana cambia de tamaño
  }


  // --------------------------------------------------------------------------
  // Obtener sección por índice y calcular progreso
  // --------------------------------------------------------------------------
  function getSectionByIndex(idx) {                                             // devuelve la sección (elemento .panel) asegurando índice válido
    return sections[Math.max(0, Math.min(total - 1, idx))];                     // clamping: evita índices fuera de rango
  }

  function updateProgressForIndex(idx) {                                        // anima la barra de progreso hacia el porcentaje asociado a "idx"
    const pct = (idx / (total - 1)) * 100;                                      // calcula porcentaje relativo (0..100) respecto al total de secciones
    gsap.to(progressBar, { width: pct + "%", duration: PROGRESS_DURATION });    // anima con GSAP el ancho de la barra hasta el porcentaje calculado
  }

  // --------------------------------------------------------------------------
  // NAVEGACIÓN ENTRE SECCIONES
  // - En PC: usamos GSAP scrollTo para animaciones controladas (1 gesto = 1 sección)
  // - En Moviles: usamos scroll nativo (scrollIntoView) para respetar zoom/pinch/gestos
  // --------------------------------------------------------------------------

  function goTo(idx) {                                                          // función principal que mueve la vista a la sección idx con animación GSAP y lógica según dispositivo

    const modal = document.getElementById("mail-modal");                        // ventanita de opciones de emails de la sec6
    if (modal) modal.style.display = "none";                                    // si existe, lo oculta inmediatamente (cuando se sale de sec6, se cierra)

    const next = Math.max(0, Math.min(total - 1, idx));                         // asegura índice dentro de límites (clamp)
    if (next === current) return;                                               // si no hay cambio de sec, no hace nada

    const target = getSectionByIndex(next);                                     // obtener elemento destino por índice
    if (!target) return;

    // ------------------ MODO MÓVIL → scroll nativo ------------------
    if (IS_TOUCH) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });            // Hacer scroll suave nativo (no snap); el observer actualizará "current" cuando la sección sea mayoritariamente visible. "start" alinea la parte superior
      return;
    }

    // ------------------ MODO DESKTOP → GSAP snap -------------------------
    isAnimating = true;                                                         // bloquea nuevos gestos hasta que termine la animación

    gsap.to(window, {                                                           // usa GSAP + ScrollToPlugin para animar el scroll del viewport hacia el elemento "target"
      scrollTo: { y: target, autoKill: false },                                 // "y: target" indica que ScrollTo calculará la posición de ese elemento; autoKill:false evita que la animación se interrumpa si el usuario hace scroll durante la animación
      duration: 0.35,                                                           // duración de la animación al cambiar de una sección a otra
      ease: "power2.out",

      onUpdate: () => {                                                         // Mover barra de progreso MIENTRAS se anima
        const scrollY = window.scrollY;                                         // lee la posición actual del scroll del documento
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight; // calcula máximo scroll posible, para convertir a porcentaje
        const pct = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;            // convierte scrollY en porcentaje (evita división por cero)
        gsap.set(progressBar, { width: pct + "%" });                            // actualiza la anchura de la barra sin crear nueva animación (set es instantáneo)
      },

      onComplete: () => {
        current = next;                                                         // sincroniza la sección actual con el destino
        handleVideoVisibility();                                                // actualiza reproducción/pausa de videos según la nueva sección
        if (window.collapse3DContainer) window.collapse3DContainer();           // Si el contenedor 3D estaba expandido, lo colapsamos
        if (window.reset3DCamera) window.reset3DCamera();                       // Reinicia la cámara Three.js cuando se cambia de sección
        updateProgressForIndex(current);                                        // asegura que la barra quede exacta a la nueva sección (la actual)

        // Evento global para todas las secciones
        window.dispatchEvent(new CustomEvent("sectionChange", { detail: { current } })); // indice actual. Notifica que se cambió de sección

        isAnimating = false;                                                    // libera flag para permitir nuevos gestos
      }
    });
  }

  window.goToSection = goTo;                                                    // Exponer para conTab.js

  // --------------------------------------------------------------------------
  // CONTROL DE VIDEOS
  // --------------------------------------------------------------------------
  function handleVideoVisibility() {
    if (video1) {                                                               // video de la sección 1
      video1.muted = true;                                                      // asegura que el video esté muteado (necesario para autoplay en varios navegadores)
      video1.setAttribute("muted", "");                                         // pone atributo HTML `muted` por compatibilidad con Safari/iOS

      current === 0 ? video1.play().catch(() => {}) : video1.pause();           // reproduce si estamos en la sección 0 (1); catch evita errores si autoplay bloqueado, pausa en otras secciones
    }

    const serviceVideos = document.querySelectorAll("#sec3 .servicios__video"); // busca videos dentro de la sección 3
    serviceVideos.forEach(v => {                                                // itera cada video de servicios
      v.muted = true;
      v.setAttribute("muted", "");
      current === 2 ? v.play().catch(() => {}) : v.pause();                     // reproduce solo si estamos en sec3 (índice 2)
    });
  }


  // --------------------------------------------------------------------------
  // OBSERVER — detecta que sección domina el viewport y actualiza estado (funciona en ambos modos)
  // --------------------------------------------------------------------------

  const observer = new IntersectionObserver((entries) => {                      // IntersectionObserver para saber qué secciones están visibles y qué tanto. Cada entrada contiene el elemento observado (una sección) y porcentaje visible de ese elemento (0 a 1)
    if (isAnimating) return;                                                    // si hay una animación en curso, ignoramos eventos del observer

    let masVisible = null;                                                      // variable para la entrada con mayor intersección (la más visible)

    entries.forEach(entry => {
      if (!masVisible || entry.intersectionRatio > masVisible.intersectionRatio) { // selecciona la sección más visible comparando intersectionRatio
        masVisible = entry;                                                     // actualiza la variable con la entrada más visible encontrada
      }
    });

    if (!masVisible) return;                                                    // si no encontró ninguna, sale

    if (masVisible.intersectionRatio >= 0.55) {                                 // solo actúa si una sección ocupa al menos 55% del viewport
      const idx = sections.indexOf(masVisible.target);                          // calcula índice de la sección más visible
      if (idx !== -1 && idx !== current) {                                      // si el índice es válido y distinto al actual...
        current = idx;                                                          // actualiza índice actual
        handleVideoVisibility();
        if (window.collapse3DContainer) window.collapse3DContainer();           // colapsa 3D si existe
        updateProgressForIndex(current);                                        // actualiza barra de progreso

        window.dispatchEvent(new CustomEvent("sectionChange", { detail: { current } })); // notifica cambio de sección
      }
    }
  }, {
    root: null,                                                                 // root null: el root es el viewport (window)
    rootMargin: "0px",                                                          // sin margen extra, comportamiento estándar
    threshold: Array.from({ length: 101 }, (_, i) => i / 100)                   // array [0, 0.01, 0.02, ..., 1] para recibir callbacks con granularidad del 1%; esto permite medir con precisión cuánta parte de cada sección está visible
  });

  sections.forEach(s => observer.observe(s));                                   // comienza a observar cada sección .panel para cambios de visibilidad


  // --------------------------------------------------------------------------
  // EVENTOS DE ENTRADA (wheel / touch / autosnap / teclado)
  // --------------------------------------------------------------------------

  // ---------- DESKTOP ONLY: wheel → 1 gesto = 1 cambio ----------

  if (!IS_TOUCH) {                                                              // Registramos handlers solo en DESKTOP; en movil dejamos el scroll nativo intacto

    window.addEventListener("wheel", (ev) => {                                  // listener principal para el evento wheel (rueda del mouse) usado en PC
      if (loaderActivo()) { ev.preventDefault(); return; }
      if (IS_TOUCH) return;                                                     // si es táctil, ignorar (los móviles NO deben usar esta lógica porque rompe zoom y scroll nativo)
      if (isAnimating) { ev.preventDefault(); return; }                         // si estamos animando, bloqueamos la rueda para evitar saltos dobles o animaciones encimadas
      ev.preventDefault();                                                      // detenemos el scroll por defecto del navegador, así GSAP tiene control total de la transición

      const delta = ev.deltaY;                                                  // valor del desplazamiento vertical: positivo = bajar, negativo = subir

      if (Math.abs(delta) < 20) return;                                         // ignora movimientos muy pequeños que algunos mouse disparan accidentalmente

      if (delta > 0) goTo(current + 1);                                         // si delta positivo → bajar a la siguiente sección
      else goTo(current - 1);                                                   // si delta negativo → subir a la sección anterior
    }, { passive: false });                                                     // passive:true permite al navegador optimizar el scroll


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
      let clickBarraNavegacion = false;                                         // flag para click inicial en zona scrollbar

      function obtenerAnchoBarra() {                                            // función para calcular ancho de scrollbar relativa al viewport (window)
        return window.innerWidth - document.documentElement.clientWidth;        // window.innerWidth incluye la scrollbar; clientWidth no
      }

      window.addEventListener('pointerdown', (ev) => {                          // detecta si el usuario hizo pointerdown cercano a la scrollbar del viewport
        if (loaderActivo()) { clickBarraNavegacion = false; return; }
        try {

          if (isAnimating) { clickBarraNavegacion = false; return; }            // Si estamos en animación, ignoramos

          const anchoBarraNav = obtenerAnchoBarra();                            // ancho de la barra

          clickBarraNavegacion = ev.clientX >= (document.documentElement.clientWidth - anchoBarraNav - 8); // click en la zona derecha donde usualmente está la scrollbar del viewport
        } catch (err) {
          clickBarraNavegacion = false;
        }
      }, { passive: true });

      function soltarBarraNavegacion() {                                        // Si se levantó el mouse después de arrastrar la barra, entonces hace snap
        if (clickBarraNavegacion && !isAnimating) {
          snapASeccionMasCercana();
        }
        clickBarraNavegacion = false;
      }
      window.addEventListener('pointerup', soltarBarraNavegacion, { passive: true });
      window.addEventListener('mouseup', soltarBarraNavegacion, { passive: true }); // también por compatibilidad

      window.addEventListener('scroll', () => {                                 // scroll fallback: cuando el usuario deja de scrollear tras N ms
        if (loaderActivo()) return;
        if (isAnimating) return;
        clearTimeout(barScrollTimeout);
        barScrollTimeout = setTimeout(() => { snapASeccionMasCercana(); }, 120);
      }, { passive: true });

      
      function snapASeccionMasCercana() {                                       // calcula la sección más centrada en viewport y hace goTo
        if (IS_TOUCH) return;
        if (isAnimating) return;

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
      gsap.set(progressBar, { width: pct + "%" });                              // actualizar barra instantáneamente
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
        goTo(total - 1);
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

          if (IS_TOUCH) target?.scrollIntoView({ behavior: "smooth", block: "start" }); // en móvil, usar scroll nativo para no romper zoom
          else goTo(idx);                                                       // en PC → usar lógica GSAP
        });
      });
    }

    function wireNextButton() {                                                 // botón dentro de sec4 que salta a la siguiente sección (5)
      const btn = document.querySelector('#sec4 .btn-next');
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
    let __mobileResizeTimer = null;
    function onResize() {
      updateVH();                                                               // recalcula la variable CSS --vh con la altura real del viewport
      const target = getSectionByIndex(current);                                // obtiene la sección actual (la que debería permanecer a la vista)

      if (IS_TOUCH) {
        // Debounce: esperar a que el viewport se estabilice (evita re-scroll por barra URL)
        clearTimeout(__mobileResizeTimer);
        __mobileResizeTimer = setTimeout(() => {
          // reubicar finamente pero sin forzar si el usuario está scrolleando
          try { 
            if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
          } catch (err) {}
        }, 220); // 220ms suele ser suficiente
      } else {
        gsap.set(window, { scrollTo: target });
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

    gsap.set(progressBar, { width: "0%" });                                     // resetea barra de progreso visualmente

    window.addEventListener("keydown", onKeyDown);                              // escucha teclado globalmente

    wireNavLinks();
    wireNextButton();

    initSec1();
    initSec2();
    initSec3();
    initSec4();
    initSec5();
    initSec6();

    video1?.play().catch(() => {});                                             // intenta reproducir el video de fondo si existe (catch para evitar errores)

    const h1 = sections[0].querySelector("h1");                                 // busca el h1 (el titulo en la mitad) de la primera sección
    if (h1) h1.setAttribute("tabindex", "-1");

    gsap.set(window, { scrollTo: 0 });                                          // asegurar que siempre se empieza en la parte superior (seccion 1)

    setTimeout(() => {                                                          // Espera 50ms para asegurarse de que el DOM esté listo
      const hash = window.location.hash;                                        // leer hash del navegador (#sec3, etc.)
      if (hash) {                                                               // si existe e identifica una sección válida...
        const el = document.querySelector(hash);
        if (el && el.classList.contains('panel')) {                             // Si existe y es una sección, hace scroll hacia ella
          if (IS_TOUCH) el.scrollIntoView({ behavior: 'auto', block: 'start' }); // móvil → scroll nativo
          else gsap.set(window, { scrollTo: el });                              // PC → salto directo
        }
      }
      updateProgressForIndex(current);                                          // actualizar barra de progreso al iniciar
    }, 50);                                                                     // 50 ms permite que el layout esté listo
  }


  // Esperamos al preloader
  document.addEventListener("DOMContentLoaded", () => {                         // cuando el DOM está listo...
    if (sessionStorage.getItem("preloaderMostrado")) init();                    // si el preloader ya se mostró, inicializa
    else document.addEventListener("loader:end", init, { once: true });         // si no, espera evento custom loader:end
  });

  window.getCurrentSection = () => current;                                     // expone función para obtener sección actual

})();







