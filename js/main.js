import { gsap } from "gsap";
gsap.registerPlugin(ScrollToPlugin);                                            // Activa el plugin ScrollTo para scroll animado

import { initSec1 } from "./secciones/sec1-inicio.js";
import { initSec2 } from "./secciones/sec2-modelo3d.js";
import { initSec3 } from "./secciones/sec3-servicios.js";
import { initSec4 } from "./secciones/sec4-nosotros.js";
import { initSec5 } from "./secciones/sec5-equipo.js";
import { initSec6 } from "./secciones/sec6-contacto.js";


(() => {

  const sections = Array.from(document.querySelectorAll('.panel'));
  const total = sections.length;                                                // Número total de secciones
  const progressBar = document.querySelector('.scroll-progress-bar');
  const video1 = document.getElementById('bgVideo');                            // Video de fondo de la sección 1
  const PROGRESS_DURATION = 0.28;                                               // Duración de la animación de la barra de progreso

  let current = 0;                                                              // Índice de la sección actual
  let isAnimating = false;                                                      // Evita múltiples transiciones simultáneas


  function isSnapDisabled() {                                                   // Detecta si el scroll snap está desactivado (lo usa en sección modelo 3D)
    return document.body.classList.contains("disable-snap");
  }

  // --------------------------------------------------------------------------
  // VH (soporte visualViewport si existe)
  // --------------------------------------------------------------------------
  function updateVH() {                                                         // Actualiza variable CSS --vh dependiendo del viewport real
    const viewport = window.visualViewport;                                     // Detecta viewport real si existe
    const height = viewport ? viewport.height : window.innerHeight;             // Si existe visualViewport, usa su altura real. Si no existe (computadoras o navegadores antiguos), usa window.innerHeight
    document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);   // escribe el 1% de la altura real en la variable CSS --vh
  }
  updateVH();                                                                   // Ejecuta al inicio

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateVH, { passive: true }); // recalcula al cambiar tamaño del viewport visual
    window.visualViewport.addEventListener('scroll', updateVH, { passive: true }); // recalcula si visualViewport se mueve
  } else {
    window.addEventListener('resize', updateVH, { passive: true });             // Si no existe visualViewport, solo recalcula cuando la ventana cambia de tamaño
  }


  // --------------------------------------------------------------------------
  // Obtener sección por índice y calcular progreso
  // --------------------------------------------------------------------------
  function getSectionByIndex(idx) {                                             // devuelve la sección asegurando índice válido
    return sections[Math.max(0, Math.min(total - 1, idx))];                     // clamping: evita índices fuera de rango
  }

  function updateProgressForIndex(idx) {                                        // anima la barra de progreso hacia el porcentaje asociado a `idx`
    const pct = (idx / (total - 1)) * 100;                                      // calcula porcentaje relativo (0..100)
    gsap.to(progressBar, { width: pct + "%", duration: PROGRESS_DURATION });    // GSAP interpola el ancho CSS para animación suave
  }


  // --------------------------------------------------------------------------
  // Detectar dispositivo táctil
  // --------------------------------------------------------------------------

  function isTouchDevice() {
    return (
      navigator.maxTouchPoints > 0 ||                                           // Si el dispositivo dice cuántos puntos táctiles tiene (1 o más), es táctil
      "ontouchstart" in window ||
      window.matchMedia("(pointer: coarse)").matches                            // Detecta si el puntero es "grueso" (dedo), en vez de "fino" (mouse)
    );
  }

  // --------------------------------------------------------------------------
  // NAVEGACIÓN ENTRE SECCIONES
  // --------------------------------------------------------------------------

  function goTo(idx) {                                                          // función principal que mueve la vista a la sección idx con animación GSAP

    const modal = document.getElementById("mail-modal");
    if (modal) modal.style.display = "none";                                    // si existe, lo oculta instantáneamente (cuando se sale de sec6, se cierra)

    const next = Math.max(0, Math.min(total - 1, idx));                         // asegura índice dentro de límites (clamp)

    if (next === current || isSnapDisabled()) return;                           // si no hay cambio de sec o snap está deshabilitado, no hace nada

    isAnimating = true;                                                         // bloquea nuevos gestos hasta que termine la animación

    if (isTouchDevice()) {
      document.body.classList.add("no-scroll");                                 // en táctil añade clase para evitar scroll nativo durante la animación. Sin esto es como si se delizara a secciones mas alla
    }

    const target = getSectionByIndex(next);
    if (!target) {                                                              // si no hay una seccion destino...
      isAnimating = false;                                                      // libera flag
      if (isTouchDevice()) document.body.classList.remove("no-scroll");         // limpia estado táctil
      return;
    }

    gsap.to(window, {                                                           // usa GSAP + ScrollToPlugin para animar el scroll del viewport
      scrollTo: { y: target, autoKill: false },                                 // `y: target` indica que ScrollTo calculará la posición del elemento; autoKill:false evita que la animación se detenga si el usuario hace scroll accidentalmente durante la animación
      duration: 0.35,                                                           // duración de la animación al cambiar de una sección a otra
      ease: "power2.out",
      onUpdate: () => {                                                         // Mover barra de progreso MIENTRAS se anima
        const scrollY = window.scrollY;                                         // lee la posición actual del scroll del documento
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight; // calcula máximo scroll posible
        const pct = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;            // convierte la posición en porcentaje
        gsap.set(progressBar, { width: pct + "%" });                            // actualiza la anchura sin crear nueva animación (set es instantáneo)
      },
      onComplete: () => {
        current = next;                                                         // sincroniza la sección actual con el destino

        handleVideoVisibility();                                                // actualiza reproducción/pausa de videos según la nueva sección

        if (window.collapse3DContainer) window.collapse3DContainer();           // Si la sección 3D estaba expandida, la colapsamos
        if (window.collapse3DContainer) window.reset3DCamera();                 // Si la sección 3D estaba expandida, reseteamos cámara del 3D

        updateProgressForIndex(current);                                        // asegura que la barra quede exactamente en la posición final correspondiente (actual)

        // Evento global para todas las secciones
        window.dispatchEvent(new CustomEvent("sectionChange", { detail: { current } })); // indice

        isAnimating = false;                                                    // libera flag para permitir nuevos gestos
        if (isTouchDevice()) document.body.classList.remove("no-scroll");       // limpia la clase no-scroll en móviles

      }
    });
  }

  window.goToSection = goTo;                                                    // Exponer para conTab.js


  // --------------------------------------------------------------------------
  // CONTROL DE VIDEOS
  // --------------------------------------------------------------------------
  function handleVideoVisibility() {
    if (!video1) return;                                                        // si no existe el video de la sección 1, sale
    video1.muted = true;                                                        // asegura que el video esté muteado (necesario para autoplay en varios navegadores)
    video1.setAttribute("muted", "");                                           // pone atributo HTML `muted` por compatibilidad con Safari/iOS

    if (current === 0) video1.play().catch(() => {});                           // reproduce si estamos en la sección 0 (1); catch evita errores si autoplay bloqueado
    else video1.pause();                                                        // pausa en otras secciones

    const svcVids = document.querySelectorAll("#sec3 .servicios__video");       // busca videos dentro de la sección 3
    if (svcVids.length > 0) {
      svcVids.forEach(v => {                                                    // itera cada video de servicios
        v.muted = true;
        v.setAttribute("muted", "");
        if (current === 2) v.play().catch(() => {});                            // reproduce solo si estamos en sec3 (índice 2)
        else v.pause();
      });
    }
  }


  // --------------------------------------------------------------------------
  // OBSERVER (solo determina qué sección domina visualmente)
  // --------------------------------------------------------------------------
  const observerOptions = {
    root: null,                                                                 // usa viewport
    rootMargin: '0px',                                                          // sin margen
    threshold: (() => {                                                         // Crea una lista del 0 al 1 para notificar cada vez que el 1%, 2% ... 100% de una sección se cruza con el viewport
      const t = [];
      for (let i = 0; i <= 1; i += 0.01) t.push(i);
      return t;
    })()
  };

  const observer = new IntersectionObserver((entries) => {
    if (isAnimating) return;                                                    // ignora señales del observer durante animaciones programadas por GSAP

    // Busca seleccionar la sección con mayor intersección (la más visible)
    let bestEntry = null;                                                       // variable para la entrada con mayor intersección
    entries.forEach(entry => {
      if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) { // selecciona la más visible comparando intersectionRatio
        bestEntry = entry;
      }
    });

    if (!bestEntry) return;                                                     // si no encontró ninguna, sale

    if (bestEntry.intersectionRatio >= 0.55) {                                  // solo actúa si una sección ocupa al menos 55% del viewport
      const idx = sections.indexOf(bestEntry.target);                           // calcula índice de esa sección
      if (idx !== -1 && idx !== current) {                                      // si cambió la sección dominante
        current = idx;                                                          // actualiza índice
        handleVideoVisibility();
        if (window.collapse3DContainer) window.collapse3DContainer();           // colapsa 3D si existe
        updateProgressForIndex(current);                                        // actualiza barra de progreso

        window.dispatchEvent(new CustomEvent("sectionChange", { detail: { current } })); // notifica cambio de sección
      }
    }
  }, observerOptions);

  sections.forEach(s => observer.observe(s));                                   // comienza a observar cada sección para cambios de visibilidad


  // --------------------------------------------------------------------------
  // GESTOS: 1 wheel = 1 cambio, 1 swipe = 1 cambio
  // --------------------------------------------------------------------------

  let wheelActive = false;   // para detectar "un gesto" en rueda
  let touchStartY = 0;       // guarda la Y inicial de un toque
  let touchLocked = false;   // bloquea múltiples swipes durante el mismo gesto

  // ---------- Wheel (desktop / trackpad) ----------
  window.addEventListener("wheel", (e) => {
    if (isAnimating || isSnapDisabled()) return;

    const dy = e.deltaY;                                                        // valor deltaY indica dirección y magnitud del scroll
    if (Math.abs(dy) < 1) return;                                               // umbral mínimo para ignorar micro-movimientos

    if (wheelActive) return;                                                    // si ya hubo un gesto reciente, ignora repetidos del mismo movimiento
    wheelActive = true;

    // determinamos dirección: deltaY>0 => hacia abajo
    if (dy > 0) goTo(current + 1);                                              // decide dirección y ejecuta goTo
    else goTo(current - 1);

    setTimeout(() => { wheelActive = false; }, 120);                            // libera flag tras 120ms para agrupar eventos del mismo gesto

  }, { passive: true });                                                        // passive:true permite al navegador optimizar el scroll


  // ---------- Touch móvil (swipe) ----------
  window.addEventListener("touchstart", (e) => {                                // guarda punto inicial al tocar
    if (isSnapDisabled()) return;

    touchStartY = e.touches[0].clientY;                                         // lee la primera touch y guarda su coordenada Y
    touchLocked = false;                                                        // Se desbloquea al inicio de cada nuevo gesto
  }, { passive: true });


  window.addEventListener("touchmove", (e) => {                                 // detecta movimiento del dedo cuando el usuario desliza
    if (isSnapDisabled()) return;

    const diff = touchStartY - e.touches[0].clientY;                            // diferencia entre inicio y posición actual (positivo = swipe hacia arriba)

    // si ya se usó un swipe dentro del mismo gesto → prevenimos el scroll nativo si es posible
    if (touchLocked || isAnimating) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (Math.abs(diff) < 35) return;                                            // umbral mínimo (evita sensibilidad excesiva)

    touchLocked = true;                                                         // marca que este gesto ya cambió la sección
    if (e.cancelable) e.preventDefault();                                       // previene scroll nativo para evitar que se deslice a secciones mas alla

    // avanza o retrocede una sola sección
    if (diff > 0) goTo(current + 1);
    else goTo(current - 1);

  }, { passive: false });                                                       // passive:false para poder llamar preventDefault()


  window.addEventListener("touchend", () => {                                   // al levantar el dedo permite futuros swipes
    touchLocked = false;
  }, { passive: true });


  // --------------------------------------------------------------------------
  // TECLADO
  // --------------------------------------------------------------------------
  function onKeyDown(e) {
    if (isAnimating || isSnapDisabled()) return;

    if (["ArrowDown", "PageDown", " "].includes(e.key)) {
      e.preventDefault(); goTo(current + 1);
    } else if (["ArrowUp", "PageUp"].includes(e.key)) {
      e.preventDefault(); goTo(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault(); goTo(0);
    } else if (e.key === "End") {
      e.preventDefault(); goTo(total - 1);
    }
  }


  // --------------------------------------------------------------------------
  // NAV
  // --------------------------------------------------------------------------
  function wireNavLinks() {                                                     // enlaza links de la navbar a `goTo`
    document.querySelectorAll(".navbar a[data-index]").forEach(a => {           // Selecciona todos los <a> que tienen un atributo data-index
      a.addEventListener("click", (ev) => {                                     // Cuando haces clic en el link...
        ev.preventDefault();                                                    // Evita que el navegador navegue a otra página
        goTo(parseInt(a.dataset.index));                                        // extrae index desde data-index y llama goTo
      });
    });
  }

  function wireNextButton() {                                                   // botón dentro de sec4 que salta a la siguiente sección (5)
    const btn = document.querySelector('#sec4 .btn-next');
    if (!btn) return;

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      goTo(current + 1);
    });
  }


  // --------------------------------------------------------------------------
  // RESIZE / ORIENTACIÓN DEL DISPOSITIVO
  // --------------------------------------------------------------------------
  function onResize() {
    updateVH();                                                                 // recalcula --vh
    const target = getSectionByIndex(current);
    if (target) gsap.set(window, { scrollTo: target });                         // Ajusta el scroll directamente a la sección actual, sin animación, para evitar “quedar a medias”
  }

  window.addEventListener("orientationchange", () => {                          // espera a que termine la reorientación y ajusta
    setTimeout(() => {
      updateVH();
      onResize();
    }, 400);
  });

  window.addEventListener("resize", () => {
    updateVH();
    onResize();
  });


  // --------------------------------------------------------------------------
  // AUTOSNAP CUANDO SE SUELTA LA BARRA DE NAVEGACIÓN (scrollbar)
  // --------------------------------------------------------------------------
  let barScrollTimeout = null;                                                  // temporizador para detectar fin de scroll manual (con la barra)
  let pointerDownOnScrollbar = false;                                           // flag para detectar si si el usuario hizo clic sobre la barra de scroll

  function getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;            // calcula ancho de la scrollbar restando clienteWidth (excluye la scrollbar) al innerWidth (incluye el ancho total)
  }

  window.addEventListener('pointerdown', (ev) => {                              // detecta inicio de interacción con la barra por puntero (mouse/touch)
    try {
      if (isAnimating || isSnapDisabled()) return;
      const sbWidth = getScrollbarWidth();                                      // ancho de la barra

      if (ev.clientX >= (document.documentElement.clientWidth - sbWidth - 8)) { // si el clic fue dentro del área del scrollbar, se marca como interacción con scrollbar
        pointerDownOnScrollbar = true;
      } else {
        pointerDownOnScrollbar = false;
      }
    } catch (err) {                                                             // en caso de error, limpia flag
      pointerDownOnScrollbar = false;
    }
  }, { passive: true });

  function handlePointerUpOnScrollbar() {
    if (pointerDownOnScrollbar && !isAnimating && !isSnapDisabled()) {          // Si el usuario estaba arrastrando la barra y soltó...
      autoSnapToNearestSection();                                               // Snap a la sección más cercana al centro del viewport
    }
    pointerDownOnScrollbar = false;                                             // limpia estado
  }

  window.addEventListener('pointerup', handlePointerUpOnScrollbar, { passive: true });
  window.addEventListener('mouseup', handlePointerUpOnScrollbar, { passive: true });

  window.addEventListener("scroll", () => {                                     // escucha scroll manual para fallback autosnap
    if (isAnimating || isSnapDisabled()) return;
    clearTimeout(barScrollTimeout);                                             // resetea el timeout para esperar a que el usuario termine de scrollear
    barScrollTimeout = setTimeout(() => { autoSnapToNearestSection(); }, 120);  // si pasan 120ms sin scroll, ejecuta autosnap
  }, { passive: true });

  function autoSnapToNearestSection() {                                         // calcula la sección cuya distancia al centro del viewport es mínima y hace snap
    if (isAnimating || isSnapDisabled()) return;

    const viewportCenterY = window.innerHeight / 2;                             // centro vertical del viewport
    let bestIdx = current;                                                      // índice ganador, por defecto el actual
    let bestDistance = Infinity;                                                // inicializa distancia mínima

    sections.forEach((sec, idx) => {                                            // recorre secciones y calcula centro relativo
      const rect = sec.getBoundingClientRect();                                 // obtiene caja de la sección relativa al viewport
      const secCenterY = rect.top + rect.height / 2;                            // calcula el centro de la sección
      const distance = Math.abs(secCenterY - viewportCenterY);                  // distancia absoluta al centro del viewport
      if (distance < bestDistance) {                                            // actualiza mejor si es más cercana
        bestDistance = distance;
        bestIdx = idx;
      }
    });

    if (bestIdx !== current) {                                                  // si la más cercana no es la actual, anima hacia ella
      goTo(bestIdx);
    } else {                                                                    // si ya estamos en la mejor, re-ajusta finamente para evitar sub-píxeles
      const target = getSectionByIndex(current);
      if (target && !isAnimating) {
        gsap.to(window, { 
          scrollTo: { y: target, autoKill: false }, 
          duration: 0.2, 
          ease: "power1.out" 
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------------------------------
  function init() {

    updateVH();

    document.documentElement.style.scrollBehavior = 'auto';                     // desactiva smooth nativo para no interferir con GSAP

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

    if (video1) video1.play().catch(() => {});                                  // intenta reproducir el video de fondo si existe (catch para evitar errores)

    const h1 = sections[0].querySelector("h1");                                 // busca el h1 (el titulo en la mitad) de la primera sección
    if (h1) h1.setAttribute("tabindex", "-1");

    gsap.set(window, { scrollTo: 0 });                                          // asegura empezar siempre en la parte superior (sección 0)

    setTimeout(() => {                                                          // Espera 50ms para asegurarse de que el layout esté listo
      const hash = window.location.hash;                                        // Lee el hash actual del navegador
      if (hash) {
        const el = document.querySelector(hash);
        if (el && el.classList.contains('panel')) {                             // Si existe y es una sección, hace scroll hacia ella
          gsap.set(window, { scrollTo: el });
        }
      }
      updateProgressForIndex(current);
    }, 50);
  }


  // Esperamos al preloader
  document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("preloaderMostrado")) init();                    // si el preloader ya se mostró, inicializa
    else document.addEventListener("loader:end", init, { once: true });         // si no, espera evento custom loader:end
  });


  // --------------------------------------------------------------------------
  // EXPONER
  // --------------------------------------------------------------------------
  window.getCurrentSection = () => current;                                     // expone función para obtener sección actual

})();




