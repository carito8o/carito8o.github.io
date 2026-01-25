import { loaderHTML } from "./template/loader-template.js";
import { modelPromise } from "./secciones/sec3-modelo3d.js";

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
    document.querySelector(".loading-screen")?.remove();
    document.body.classList.remove("preloader");
    document.body.removeAttribute("aria-busy");
    return;
  }

  iniciarAnimacionFrase();
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

let fraseTimeline = null;                                                 // timeline del ciclo de frases. Se deja fuera para detenerla cuando el loader termine (finalizarLoader())

function iniciarAnimacionFrase() {                                        // Controla la animación del texto: intro (typewriter) + ciclo GSAP

  const fraseLoader = document.querySelector(".fraseLoader");             // Contenedor principal que se anima (sube, baja, aparece y desaparece)
  if (!fraseLoader || !window.gsap) return;                               // Si no existe el elemento o GSAP no está cargado, se cancela todo

  const fraseInner = fraseLoader.querySelector(".fraseInner");            // Texto que cambia de contenido y alineación

  // ---------- TEXTOS ----------
  const introTexto =                                                      // Texto que solo se muestra una vez. No forma parte del ciclo
    "Una propuesta exclusiva de Gigazer para la Universidad de Cartagena.";

  const textosCiclo = [                                                   // Este ciclo empieza despues de que el intro desaparece
    "Estamos preparando tu experiencia.",
    "Una propuesta exclusiva de Gigazer para la Universidad de Cartagena."
  ];

  // ---------- fijar ancho del contenedor solo para el intro ----------
  
  function ajustarAnchoIntro() {
    const medidor = document.createElement("span");                       // Crea un medidor invisible
    medidor.style.position = "absolute";                                  // No afecta el flujo del documento
    medidor.style.visibility = "hidden";                                  // Invisible para el usuario
    medidor.style.whiteSpace = "nowrap";                                  // Evita saltos de línea
    medidor.style.font = getComputedStyle(fraseInner).font;               // Usa la misma fuente real, para que sea preciso

    medidor.textContent = introTexto;                                     // Coloca el texto completo del intro
    document.body.appendChild(medidor);                                   // Se añade temporalmente al DOM solo para medir

    fraseInner.style.width = medidor.offsetWidth + "px";                  // Fija el ancho del contenedor interno
    fraseInner.style.textAlign = "left";                                  // Alinea a la izquierda para el efecto typewriter

    document.body.removeChild(medidor);                                   // Limpia
  }

  ajustarAnchoIntro();                                                    // calcula el ancho correcto
  window.addEventListener("resize", ajustarAnchoIntro);                   // se recalcula si cambia el tamaño


  // ---------- INTRO: efecto escritura ----------
  fraseInner.textContent = "";                                            // Empieza sin texto

  let i = 0;                                                              // Índice que controla qué letra del texto se escribe

  const escribir = () => {
    fraseInner.textContent += introTexto[i];                              // Añade una letra más al texto visible
    i++;                                                                  // Avanza al siguiente carácter

    if (i < introTexto.length) {
      setTimeout(escribir, 35);                                           // velocidad de escritura en ms
    } else {                                                              // Cuando ya se escribió todo el texto...
      setTimeout(salirIntro, 2000);                                       // Deja el texto visible durante 2 segundos antes de animar la salida
    }
  };

  escribir();                                                             // Inicia el efecto typewriter

  function salirIntro() {
    gsap.to(fraseLoader, {
      y: -80,                                                             // Mueve el contenedor hacia arriba
      opacity: 0,                                                         // Lo desvanece al mismo tiempo
      duration: 0.5,
      ease: "power2.inOut",
      onComplete: iniciarCiclo                                            // Solo cuando esta animación termina, se inicia el ciclo infinito de frases
    });
  }                  

  // ---------- LOOP NORMAL ----------
  function iniciarCiclo() {

    window.removeEventListener("resize", ajustarAnchoIntro);
    fraseInner.style.width = "";                                          // Quita el ancho fijo (ya no es necesario)
    fraseInner.style.textAlign = "center";                                // Vuelve a estar centrado

    let index = 0;                                                        // Índice que indica qué texto del array se está mostrando

    fraseTimeline = gsap.timeline({ repeat: -1 });                        // Crea una timeline infinita (-1)

    function cambiarTexto() {
      fraseInner.textContent = textosCiclo[index];                        // Cambia el texto
      index = (index + 1) % textosCiclo.length;                           // Avanza al siguiente texto de forma circular
    }

    cambiarTexto();                                                       // Establece el primer texto antes de animar

    fraseTimeline
      .add(() => {
        gsap.set(fraseLoader, { y: 80, opacity: 0 });                     // Siempre empieza desde abajo
      })
      .to(fraseLoader, {                                                  // Entrada desde abajo con fade-in
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power2.out"
      })
      .to({}, { duration: 6 })                                            // Tiempo que el texto permanece visible sin moverse
      .to(fraseLoader, {                                                  // Salida hacia arriba con fade-out
        y: -80,
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
      })
      .add(cambiarTexto)                                                  // Cambia el texto justo DESPUÉS de que sale
  }
}

function finalizarLoader() {

  const tl = gsap.timeline({
    onComplete: () => {
      fraseTimeline?.kill();
      fraseTimeline = null;
      document.querySelector(".loading-screen")?.remove();
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
    ease: "power1.inOut",
    onStart: () => {
      document.body.classList.remove("preloader");
    }
  });
}
