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

  // FLAG que usan los handlers para desacoplar navegación durante zoom/estabilización
  window.__viewportLock = false;

  // --------------------------------------------------------------------------
  // UTILIDAD: VH CORREGIDO
  // --------------------------------------------------------------------------
  function updateVH() {                                                    // vh significa Viewport Height
    const vh = window.innerHeight * 0.01;                                  // Obtiene el 1% de la altura visible real del dispositivo
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  updateVH();

  function getStableHeight() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) * 100;
  }

  // --------------------------------------------------------------------------
  // HELPER: ¿snap desactivado?
  // --------------------------------------------------------------------------
  function isSnapDisabled() {
    return document.body.classList.contains("disable-snap");
  }

  // --------------------------------------------------------------------------
  // NAVEGACIÓN ENTRE SECCIONES
  // --------------------------------------------------------------------------
  function goTo(idx) {

    if (window.__viewportLock) return;                                     // Si viewport bloqueado → no navegar

    // Cerrar modal de correos inmediatamente cuando empieza el cambio de seccion
    const modal = document.getElementById("mail-modal");
    if (modal) modal.style.display = "none";

    const next = Math.max(0, Math.min(total - 1, idx));                    // Forzamos que "next" nunca sea menor a 0 ni mayor al total
    if (next === current || isAnimating) return;
    isAnimating = true;

    updateVH();                                                            // Recalcular --vh justo antes de calcular la altura estable
    const stableHeight = getStableHeight();
    const targetY = -next * stableHeight;                                  // Calculamos la posición Y a la que debe moverse el contenedor

    // Animación
    gsap.to(main, {
      y: targetY,
      duration: ANIM_DURATION,
      ease: "power2.out",
      onComplete: () => {
        isAnimating = false;
        current = next;
        handleVideoVisibility();

        if (window.collapse3DContainer) window.collapse3DContainer();
        if (current === 1 && window.reset3DCamera) window.reset3DCamera();

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
        v.muted = true;
        v.setAttribute("muted", "");

        if (current === 2) v.play().catch(() => {});
        else v.pause();
      });
    }
  }

  // --------------------------------------------------------------------------
  // EVENTOS DE NAVEGACIÓN (ahora respetan __viewportLock)
  // --------------------------------------------------------------------------
  function onWheel(e) {
    e.preventDefault();
    if (isAnimating || isSnapDisabled() || window.__viewportLock) return;
    if (e.deltaY > 10) goTo(current + 1);
    else if (e.deltaY < -10) goTo(current - 1);
  }

  function onTouchStart(e) {
    touchStartY = (e.touches?.[0]?.clientY) || e.clientY;
  }

  function onTouchEnd(e) {
    if (isAnimating || isSnapDisabled() || window.__viewportLock) return;
    const endY = (e.changedTouches?.[0]?.clientY) || e.clientY;
    const diff = touchStartY - endY;

    if (diff > TOUCH_THRESHOLD) goTo(current + 1);
    else if (diff < -TOUCH_THRESHOLD) goTo(current - 1);
  }

  function onKeyDown(e) {
    if (isAnimating || isSnapDisabled() || window.__viewportLock) return;
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
  // NAV helpers
  // --------------------------------------------------------------------------
  function wireNavLinks() {
    document.querySelectorAll(".navbar a[data-index]").forEach(a => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        goTo(parseInt(a.dataset.index));
      });
    });
  }

  function wireNextButton() {
    const btn = document.querySelector('#sec4 .btn-next');
    if (!btn) return;

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      goTo(current + 1);
    });
  }

  // --------------------------------------------------------------------------
  // ON RESIZE (recalcula y reposiciona)
  // --------------------------------------------------------------------------
  function onResize() {
    updateVH();
    const stableHeight = getStableHeight();
    // Usar set en vez de animación para mantener precisión
    gsap.set(main, { y: -current * stableHeight, force3D: true });
  }

  // --------------------------------------------------------------------------
  // VISUAL VIEWPORT WATCHER (detecta pinch/zoom y cambia comportamiento)
  // --------------------------------------------------------------------------
  (function visualViewportWatcher() {
    const vp = window.visualViewport;
    let lastScale = vp ? vp.scale : 1;
    let lastHeight = window.innerHeight;
    let settleTimer = null;

    function beginLock() {
      // Bloquea navegación y punteros mientras zoom/scroll de viewport está activo
      window.__viewportLock = true;
      document.documentElement.classList.add("viewport-lock");
      // Detener tweens activos que puedan animar 'main' mientras el viewport está moviéndose
      try { gsap.killTweensOf(main); } catch (e) {}
    }

    function endLockAndStabilize() {
      clearTimeout(settleTimer);
      // Pequeña espera para estabilizar (adaptable)
      settleTimer = setTimeout(() => {
        // Recalcular --vh usando innerHeight real (ya estabilizado)
        updateVH();
        // Reposicionar main exactamente al panel actual
        const stableHeight = getStableHeight();
        gsap.set(main, { y: -current * stableHeight, force3D: true });
        // Desbloquear
        window.__viewportLock = false;
        document.documentElement.classList.remove("viewport-lock");
      }, 250);
    }

    function handler() {
      const curScale = vp ? vp.scale : 1;
      const curHeight = window.innerHeight;

      // Si detectamos cambio de escala o de altura significativo → bloqueo
      if (Math.abs(curScale - lastScale) > 0.002 || Math.abs(curHeight - lastHeight) > 8) {
        lastScale = curScale;
        lastHeight = curHeight;
        beginLock();
        endLockAndStabilize();
      } else {
        // Si no hay cambio grande, aún puede ser un pequeño reajuste → ejecutamos estabilización suave
        endLockAndStabilize();
      }
    }

    if (vp) {
      vp.addEventListener("resize", handler);
      vp.addEventListener("scroll", handler); // algunos navegadores mueven visualViewport al pinchar
    } else {
      // Fallback: si no hay visualViewport, usar resize global
      window.addEventListener("resize", () => {
        // bloqueo temporal corto para evitar movimientos mientras el SO ajusta barras
        beginLock();
        endLockAndStabilize();
      });
    }
  })();

  // --------------------------------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------------------------------
  function init() {

    updateVH();                                                   // asegurar valor actualizado al crear layout

    // Inicializa posiciones y barra
    gsap.set(main, { y: 0, force3D: true });
    gsap.set(progressBar, { width: "0%" });

    // Conectamos todos los eventos de navegación (respetan window.__viewportLock)
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", () => {
      updateVH();
      onResize();
    });

    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        updateVH();
        onResize();
      }, 400);
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


