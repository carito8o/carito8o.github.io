import { loaderHTML } from "./template/loader-template.js";
import { modelPromise } from "./secciones/sec2-modelo3d.js";

document.addEventListener("DOMContentLoaded", () => {

    // Si ya se mostró el preloader en esta sesión → saltar
  if (sessionStorage.getItem("preloaderMostrado")) {
    document.body.classList.remove("preloader");
    document.body.removeAttribute("aria-busy");
    return;
  }

  document.body.insertAdjacentHTML("afterbegin", loaderHTML);
  document.body.classList.add("preloader");
  document.body.setAttribute("aria-busy", "true");

  // Fallback si GSAP no cargó
  if (!window.gsap) {
    console.warn("[loader] GSAP no cargó, desactivando preloader");
    document.querySelector(".loading-screen")?.remove();
    document.body.classList.remove("preloader");
    document.body.removeAttribute("aria-busy");
    return;
  }

  iniciarLoader();
});

function iniciarLoader() {
  const columna1 = document.querySelector(".counter-1"); // columna centenas
  const columna2 = document.querySelector(".counter-2"); // columna decenas
  const columna3 = document.querySelector(".counter-3"); // columna unidades
  const columna4 = document.querySelector(".counter-4"); // '%'

  if (!columna1 || !columna2 || !columna3 || !columna4) {
    console.warn('[loader] estructura incompleta del loader');
    finalizarLoader();
    return;
  }

  // Wrapper interno para poder desplazar los números
  function asegurarContenedor(columna) {
    let interno = columna.querySelector('.digits-inner');
    if (!interno) {
      interno = document.createElement('div');
      interno.className = 'digits-inner';
      // mover sólo los .num existentes
      const numeros = Array.from(columna.querySelectorAll('.num'));
      numeros.forEach(n => interno.appendChild(n));
      columna.appendChild(interno);
    }
    // convertir el outer en máscara
    columna.style.overflow = 'hidden';
    columna.style.display = 'inline-block';
    columna.style.verticalAlign = 'middle';
    return interno;
  }

  const i1 = asegurarContenedor(columna1);
  const i2 = asegurarContenedor(columna2);
  const i3 = asegurarContenedor(columna3);
  asegurarContenedor(columna4);

  // Medir alturas una vez y forzar altura en columnas
  let h1 = 0, h2 = 0, h3 = 0;
  function medirAlturas() {
    const n1 = i1.querySelector('.num');
    const n2 = i2.querySelector('.num');
    const n3 = i3.querySelector('.num');
    if (n1) h1 = n1.clientHeight;
    if (n2) h2 = n2.clientHeight;
    if (n3) h3 = n3.clientHeight;
    // forzar la altura de los "masks" (outer columns)
    if (h1) columna1.style.height = h1 + 'px';
    if (h2) columna2.style.height = h2 + 'px';
    if (h3) columna3.style.height = h3 + 'px';
  }

  medirAlturas();
  document.fonts?.ready?.then(medirAlturas);

  // GSAP quickTo → movimiento suave
  const q1 = gsap.quickTo(i1, "y", { duration: 0.25, ease: "power2.out" });
  const q2 = gsap.quickTo(i2, "y", { duration: 0.25, ease: "power2.out" });
  const q3 = gsap.quickTo(i3, "y", { duration: 0.20, ease: "power2.out" });

  // Recursos a esperar (imágenes, videos, escena 3D y fonts)
  const resources = [];


  // === Precargar SOLO el video principal de la sección 1 ===
  function preloadVideo(url) {
    return fetch(url).then(r => r.blob()).catch(() => {});
  }
  resources.push(preloadVideo("/images/UniCartagena.mp4"));

  // Imágenes y videos
  document.querySelectorAll('img, video').forEach(el => {
    if (el.tagName === 'IMG' && !el.complete) {
      resources.push(new Promise(resolve => {
        el.addEventListener('load', resolve, { once: true });
        el.addEventListener('error', resolve, { once: true });
      }));
    } else if (el.tagName === 'VIDEO' && el.readyState < 3) {
      resources.push(new Promise(resolve => {
        el.addEventListener('loadeddata', resolve, { once: true });
        el.addEventListener('error', resolve, { once: true });
      }));
    }
  });
  // Fuentes
  if (document.fonts?.ready) resources.push(document.fonts.ready);

  // Modelo 3D
  resources.push(modelPromise);

  // Timeout de seguridad (10 s)
  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 10000));
  resources.push(timeoutPromise);

  let loaded = 0;
  const total = resources.length || 1;
  resources.forEach(p => p.then(() => { loaded++; }));

  const inicio = performance.now();
  const MIN_MS = 2000; // duración mínima del loader

  // Render del progreso (dígitos + barra)
  let ultimoP = 0;                                                               // ultimo porcentaje registrado
  let tiempoQuieto = null;
  const spinnerWrapper = document.querySelector(".spinner-wrapper");

  function mostrarProgreso(porcentaje) {
    const p = Math.max(0, Math.min(100, Math.floor(porcentaje + 0.0001)));      // p es el porcentaje actual

    // descomponer en centenas/decenas/unidades (100 => 1 0 0)
    const centenas = p === 100 ? 1 : 0;
    const decenas = p === 100 ? 0 : Math.floor(p / 10) % 10;
    const unidades = p === 100 ? 0 : p % 10;

    // Si aún no se midieron las alturas de los números → medirlas
    if (!h1 || !h2 || !h3) medirAlturas();

    if (h1) q1(-centenas * h1);
    if (h2) q2(-decenas * h2);
    if (h3) q3(-unidades * h3);

    // barra de progreso
    gsap.to(".loader-1", {
      width: p + "%",
      duration: 0.3,  // corto para que siga al porcentaje
      ease: "power2.out"
    });

    // ===== CONTROL DEL SPINNER =====

    // Cuando llega a 100% → nunca mostrar spinner
    if (p === 100) {
      spinnerWrapper.classList.remove("active");
      ultimoP = p;
      return;
    }

    // Si avanzó el progreso → quitar spinner
    if (p !== ultimoP) {
      spinnerWrapper.classList.remove("active");
      ultimoP = p;

      if (tiempoQuieto) {                               // Si existe un timeout pendiente...
        clearTimeout(tiempoQuieto);                     // Lo cancelamos (porque el progreso avanzó)
        tiempoQuieto = null;
      }

      // Si el progreso no cambió en los próximos 300ms...
      tiempoQuieto = setTimeout(() => {
        if (ultimoP !== 100) {
          spinnerWrapper.classList.add("active");
        }
      }, 300); // 0.3s quieto → aparece spinner
    }
  }

  // Loop de animación
  function bucleCarga() {
    const transcurrido = performance.now() - inicio;
    const progresoReal = loaded / total;
    const progresoTiempo = Math.min(transcurrido / MIN_MS, 1);
    const combinado = Math.min(progresoReal, progresoTiempo);
    mostrarProgreso(combinado * 100);

    if (combinado < 1) {
      requestAnimationFrame(bucleCarga);
    } else {
      mostrarProgreso(100);
      setTimeout(finalizarLoader, 300);
    }
  }

  requestAnimationFrame(bucleCarga);
}

function finalizarLoader() {

  if (!window.gsap) {
    document.querySelector(".loading-screen")?.remove();
    document.body.classList.remove("preloader");
    document.body.removeAttribute("aria-busy");
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      document.querySelector(".loading-screen")?.remove();
      document.body.classList.remove("preloader");
      document.body.removeAttribute("aria-busy");

      // Marcar como mostrado después de terminar todo
      sessionStorage.setItem("preloaderMostrado", "true");

      // avisamos que terminó el loader
      document.dispatchEvent(new Event("loader:end"));
    }
  });

  tl.to(".digit", {
    top: "-150px",
    stagger: { amount: 0.25 },
    duration: 1,
    ease: "power4.inOut"
  })
    
    .to(".loader", {
    scaleY: 300,
    duration: 1.2,
    ease: "power2.inOut",
  })
  // Primero hacemos aparecer el contenido detrás
  .to(["#main", ".navbar", ".page-border", ".scroll-progress"], {
    opacity: 1,
    duration: 0.6,
    ease: "power2.out"
  }, "-=0.5") // aparece un poco antes de que desaparezca el preloader
  
  .to(".loading-screen", {
    opacity: 0,
    duration: 0.6,
    ease: "power1.inOut"
  });
}
