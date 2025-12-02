import { gsap } from "gsap";
import { initSec1 } from "./secciones/sec1-inicio.js";
import { initSec2 } from "./secciones/sec2-modelo3d.js";
import { initSec3 } from "./secciones/sec3-servicios.js";
import { initSec4 } from "./secciones/sec4-nosotros.js";
import { initSec5 } from "./secciones/sec5-equipo.js";
import { initSec6 } from "./secciones/sec6-contacto.js";


(() => {

  const main = document.getElementById('main');
  const sections = Array.from(document.querySelectorAll('.panel'));
  const total = sections.length;                                         // Número total de secciones
  const progressBar = document.querySelector('.scroll-progress-bar');
  const video1 = document.getElementById('bgVideo');                      // Video de fondo de la sección 1

  const ANIM_DURATION = 0.28;                                            // Duración de las animaciones entre secciones
  const TOUCH_THRESHOLD = 50;                                            // Cantidad mínima de desplazamiento táctil para cambiar de sección

  let current = 0;                                                       // Índice de la sección actual
  let isAnimating = false;
  let touchStartY = 0;                                                   // Guarda el punto inicial del toque en pantallas táctiles


  // Detecta si el scroll-snap está desactivado (lo usa la sección 3D)
  function isSnapDisabled() {
    return document.body.classList.contains("disable-snap");
  }

  // --------------------------------------------------------------------------
  // NAVEGACIÓN ENTRE SECCIONES
  // --------------------------------------------------------------------------

  // Aunque en este proyecto solo usamos el 100% (pantalla completa), se usa el 1% para mantener flexibilidad si en el futuro queremos calcular otros 
  // valores (como 50vh, 120vh, etc.) usando la misma variable
  function updateVH() {                                                    // vh significa Viewport Height
    const vh = window.innerHeight * 0.01;                                  // Obtiene el 1% de la altura visible real del dispositivo para conseguir la unidad '1vh' corregida
    document.documentElement.style.setProperty('--vh', `${vh}px`);         // Guarda este valor como la variable CSS global --vh
  }
  updateVH();


  function goTo(idx) {

    // Cerrar modal de correos inmediatamente cuando empieza el cambio de seccion
    const modal = document.getElementById("mail-modal");
    if (modal) modal.style.display = "none";
    
    const next = Math.max(0, Math.min(total - 1, idx));                    // Forzamos que "next" nunca sea menor a 0 ni mayor al total
    if (next === current || isAnimating) return;
    isAnimating = true;

    updateVH();                                                            // Recalcular --vh justo antes de calcular la altura estable
    const stableHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) * 100;
    const targetY = -next * stableHeight;                                  // Calculamos la posición Y a la que debe moverse el contenedor

    gsap.to(main, {                                                        // Animación del movimiento del contenedor
      y: targetY,
      duration: ANIM_DURATION,
      ease: "power2.out",

      onComplete: () => {
        isAnimating = false;
        current = next;
        handleVideoVisibility();                                           // Activa o pausa los videos dependiendo de la sección

        if (window.collapse3DContainer) window.collapse3DContainer();      // Si la sección 3D estaba expandida, la colapsamos
        if (current === 1 && window.reset3DCamera) window.reset3DCamera(); // Si entramos en sec2, reseteamos cámara del 3D

        // Evento global para todas las secciones
        window.dispatchEvent(new CustomEvent("sectionChange", {
          detail: { current }
        }));
      }
    });

    // Actualizamos la barra de progreso
    const pct = (next / (total - 1)) * 100;
    gsap.to(progressBar, { width: pct + "%", duration: ANIM_DURATION });
  }

  // --------------------------------------------------------------------------
  // CONTROL DE VIDEOS
  // --------------------------------------------------------------------------
  function handleVideoVisibility() {
    if (!video1) return;
    video1.muted = true;
    video1.setAttribute("muted", "");      // Agrega el atributo HTML `muted` al video. Safari iOS exige que el atributo exista en el HTML


    // Video de fondo → solo se reproduce en la sección 1
    if (current === 0) video1.play().catch(() => {});
    else video1.pause();

    // Videos de la sección 3 → solo se reproducen si estamos en sección 3
    const svcVids = document.querySelectorAll("#sec3 .servicios__video");

    if (svcVids.length > 0) {
      svcVids.forEach(v => {
        v.muted = true;                    // siempre muteado
        v.setAttribute("muted", "");       // compatibilidad 100% móvil

        if (current === 2) v.play().catch(() => {});
        else v.pause();
      });
    }
  }

  // --------------------------------------------------------------------------
  // DETECTAR ZOOM HECHO POR EL USUARIO EN MOVILES
  // --------------------------------------------------------------------------

  function enableZoomMode() {
  if (document.body.classList.contains("zoom-mode")) return;

  document.body.classList.add("zoom-mode");

  // parar animaciones
  gsap.killTweensOf("#main");

  // reset transforms
  gsap.set("#main", { y: 0 });
  main.style.transform = "none";

  // permitir scroll natural
  document.body.style.overflow = "auto";
}

function disableZoomMode() {
  if (!document.body.classList.contains("zoom-mode")) return;

  document.body.classList.remove("zoom-mode");

  // volver a bloquear scroll nativo porque usamos navegación GSAP
  document.body.style.overflow = "hidden";

  updateVH();
  onResize();  // reposiciona la sección correctamente
}

function monitorZoom() {
  const scale = window.visualViewport?.scale || 1;

  if (scale !== 1) {
    enableZoomMode();
  } else {
    disableZoomMode();
  }
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", monitorZoom);
  visualViewport.addEventListener("scroll", monitorZoom);
}



  // --------------------------------------------------------------------------
  // EVENTOS DE NAVEGACIÓN
  // --------------------------------------------------------------------------

  // Ruedita del mouse
  function onWheel(e) {
    e.preventDefault();
    if (isAnimating || isSnapDisabled()) return;                   // Si estamos animando o snap desactivado → no navegar
    if (e.deltaY > 10) goTo(current + 1);                          // Scroll hacia abajo
    else if (e.deltaY < -10) goTo(current - 1);                    // Hacia arriba
  }

  // Guardamos la posición donde empezó el toque
  function onTouchStart(e) {
    touchStartY = (e.touches?.[0]?.clientY) || e.clientY;
  }

  // Detectamos si se deslizó suficiente para cambiar de sección
  function onTouchEnd(e) {
    if (isAnimating || isSnapDisabled()) return;
    const endY = (e.changedTouches?.[0]?.clientY) || e.clientY;
    const diff = touchStartY - endY;

    if (diff > TOUCH_THRESHOLD) goTo(current + 1);
    else if (diff < -TOUCH_THRESHOLD) goTo(current - 1);
  }

  // Navegación mediante teclado
  function onKeyDown(e) {
    if (isAnimating || isSnapDisabled()) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) {         // Bajada
      e.preventDefault(); goTo(current + 1);
    } else if (["ArrowUp", "PageUp"].includes(e.key)) {           // Subida
      e.preventDefault(); goTo(current - 1);
    } else if (e.key === "Home") {                                // Ir al inicio
      e.preventDefault(); goTo(0);
    } else if (e.key === "End") {                                 // Ir al final
      e.preventDefault(); goTo(total - 1);
    }
  }

  // Nav
  function wireNavLinks() {
    document.querySelectorAll(".navbar a[data-index]").forEach(a => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        goTo(parseInt(a.dataset.index));
      });
    });
  }

  // Botón "siguiente sección" de la sección 4
  function wireNextButton() {
    const btn = document.querySelector('#sec4 .btn-next');
    if (!btn) return;

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      goTo(current + 1); // va a la siguiente sección con animación
    });
  }
  
  function onResize() {
    updateVH();                                                   // recalcula ahora mismo
    const stableHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) * 100; // Reconstruye el equivalente a 100vh REAL multiplicando la unidad 1vh corregida (--vh) por 100
    gsap.set(main, { y: -current * stableHeight });
  }

  // --------------------------------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------------------------------

  function init() {

    updateVH();                                                   // asegurar valor actualizado al crear layout

    // Inicializa posiciones y barra
    gsap.set(main, { y: 0 });
    gsap.set(progressBar, { width: "0%" });

    // Conectamos todos los eventos de navegación
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", () => {
      updateVH();
      onResize();
    });

    window.addEventListener("orientationchange", () => {          // Para cuando se gira el celular
      setTimeout(() => {
        updateVH();
        onResize();
      }, 400);                                                    // Espera 400ms y luego actualiza altura y ejecuta onResize()
    });

    wireNavLinks();
    wireNextButton();
    
    initSec1();
    initSec2();
    initSec3();
    initSec4();
    initSec5();
    initSec6();


    // Reproducir el video inicial (por si quedó pausado)
    if (video1) video1.play().catch(() => {});

    // permite enfocar el título con tab
    const h1 = sections[0].querySelector("h1");
    if (h1) h1.setAttribute("tabindex", "-1");
  }

  // Solo ejecutar init después del preloader
  document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("preloaderMostrado")) init();
    else document.addEventListener("loader:end", init, { once: true });
  });

  // --------------------------------------------------------------------------
  // EXPONER
  // --------------------------------------------------------------------------
  window.goToSection = goTo;
  window.getCurrentSection = () => current;

})();




