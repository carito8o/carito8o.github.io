import { gsap } from "gsap";

const isMobile = window.matchMedia("(pointer: coarse)").matches;

// Animación de presentación (Explora más → GIGAZER)  ---------------------------------------------------------

function animarPresentacion() {
  const h1 = document.querySelector("#sec1 .content h1");
  if (!h1) return;

  const tl = gsap.timeline();

  tl.to({}, { duration: 4.5 })   // - - - - - - - - - espera 4.5 segundos mostrando "Explora más"

    .to(h1, {          // - - - - - - - - - - - - - - Oculta “Explora más”, lo sube y lo hace transparente.
      y: -80, 
      opacity: 0, 
      duration: 0.5, 
      ease: "power2.inOut" 
    })

    .add(() => {           // - - - - - - - - - - - - Cambia el texto a “GIGAZER”
      h1.textContent = "GIGAZER";
      gsap.set(h1, { y: 80, opacity: 0 });
    })

    .to(h1, {          // - - - - - - - - - - - - - - Muestra "GIGAZER" entrando desde abajo
      y: 0, 
      opacity: 1, 
      duration: 0.5, 
      ease: "power2.inOut",
      onComplete: () => {
        if (!isMobile) {         // - - - - - - - - - Si NO es celular, activa efecto de ondas en letras y efecto de que el texto sigue el mouse
          if (!h1.dataset.wave) aplicarWaveLetters(h1);
          activarEfectoMirada();
        }
      }
    });
}

// Efecto “wave” en las letras del título  -----------------------------------------------------------------------

function aplicarWaveLetters(titulo) {
  if (!titulo || titulo.dataset.wave) return;
  titulo.dataset.wave = "true";

  // Generar nuevo contenido con letras separadas
  const texto = titulo.textContent.trim();                            // Obtiene el texto del h1 sin espacios (trim quita espacios)
  titulo.innerHTML = texto.split("").map(ch =>                        // Reemplaza el contenido del h1 por spans individuales, uno por letra
    `<span class="h1-char">${ch === " " ? "&nbsp;" : ch}</span>`      // si la "letra" es un espacio, escribir &nbsp (porque los espacios normales desaparecen en HTML), si NO es un espacio, escribir la letra normal.
  ).join("");                                                         // join("") junta todo eso en un solo string largo, sin comas

  // Inyectar CSS una sola vez
  if (!document.getElementById("h1-wave-style")) {                    // Evita duplicar el CSS agregándolo solo si no está ya en el documento
    const style = document.createElement("style");
    style.id = "h1-wave-style";
    style.textContent = `
      #sec1 h1 .h1-char {
        display: inline-block;                                        /* Permite mover cada letra como bloque */
        will-change: transform, opacity, scale;
      }
      #sec1 h1 {
        user-select: text;                                            /* Permite seleccionar el texto */
        cursor: text;
        transform-origin: center center;                              /* Punto desde donde rota el título */
      }
    `;
    document.head.appendChild(style);                                 // Agrega el CSS al <head> del documento
  }

  const GrupoLetrasSeparadas = titulo.querySelectorAll(".h1-char");

  const animar = (subir, from = "center") => {
    gsap.killTweensOf(GrupoLetrasSeparadas);
    gsap.to(GrupoLetrasSeparadas, {
      y: subir ? (i) => -18 - (i % 4) : 0,                            // Si "subir" es true, sube las letras. Si es false, las baja a 0
      duration: subir ? 0.36 : 0.5,                                   // Duración de la animación (más corta al subir)
      ease: subir ? "power2.out" : "power2.inOut",
      stagger: { each: 0.03, from }                                   // Hace que cada letra vaya con un pequeño retraso para crear la ola
    });
  };

  titulo.addEventListener("mouseenter", (e) => {
    const rect = titulo.getBoundingClientRect();                      // Obtiene el área ocupada por el título
    const fromLeft = e.clientX < rect.left + rect.width / 2;          // Verifica si el mouse entró por la izquierda o por la derecha
    animar(true, fromLeft ? "start" : "end");                         // Activa la ola desde izquierda o derecha según corresponda
  });

  // Eventos
  titulo.addEventListener("mouseleave", () => animar(false));
  titulo.addEventListener("focus", () => animar(true));
  titulo.addEventListener("blur", () => animar(false));
  titulo.setAttribute("tabindex", "-1");
}

// Interacción — “GIGAZER mira al mouse”  ----------------------------------------------------------------------

let onMove, onLeave;

function activarEfectoMirada() {
  if (isMobile) return;

  const sec1 = document.getElementById("sec1");
  const h1 = sec1?.querySelector("h1");
  if (!sec1 || !h1) return;

  onMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 30;             // Calcula un valor entre -15 y +15 basado en la posición X del mouse           e.clientX es cuántos píxeles el mouse está desde la izquierda
    const y = (e.clientY / window.innerHeight - 0.5) * 30;            // Igual pero con Y (se hace negativo para que el movimiento sea natural)
    gsap.to(h1, {
      rotationY: x,
      rotationX: -y,
      transformPerspective: 600,                                      // Da efecto 3D real
      duration: 0.6,
      ease: "power2.out"
    });
  };

  onLeave = () => gsap.to(h1, { rotationY: 0, rotationX: 0, duration: 1 });

  // Activa los listeners
  sec1.addEventListener("mousemove", onMove);
  sec1.addEventListener("mouseleave", onLeave);
}

function desactivarEfectoMirada() {
  const sec1 = document.getElementById("sec1");
  if (sec1 && onMove && onLeave) {
    sec1.removeEventListener("mousemove", onMove);
    sec1.removeEventListener("mouseleave", onLeave);
  }
}

// Inicialización general  -------------------------------------------------------------------------------------

export function initSec1() {
  // Activar animación inicial después del preloader
  if (sessionStorage.getItem("preloaderMostrado")) {
    animarPresentacion();
  } else {
    document.addEventListener("loader:end", animarPresentacion, { once: true });  // Esperar a que el preloader termine y entonces animar la presentación
  }

  // Activar/desactivar efecto de seguimiento de mouse según sección activa
  window.addEventListener("sectionChange", (e) => {
    const index = e.detail.current;
    if (index === 0 && !isMobile) {                                     // Si estamos en la sección 0 (la primera) y NO es móvil
      activarEfectoMirada();
    } else {
      desactivarEfectoMirada();
    }
  });
}
