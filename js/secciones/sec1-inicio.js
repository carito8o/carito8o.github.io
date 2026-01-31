import { gsap } from "gsap";
import { isTouchDevice } from "../utilidades/detectarDispositivo.js";

const IS_TOUCH = isTouchDevice();

// ----------------------------------------------------------------
// Animación de presentación ( GIGAZER → Universidad de Cartagena)
// ----------------------------------------------------------------

function animarPresentacion() {
  const h1 = document.querySelector("#sec1 .content h1");
  if (!h1) return;

  const tl = gsap.timeline();

  tl.to({}, { duration: 4.5 })   // - - - - - - - - - espera 4.5 segundos mostrando "GIGAZER"

    .to(h1, {          // - - - - - - - - - - - - - - Oculta “GIGAZER”, lo sube y lo hace transparente.
      y: -80, 
      opacity: 0, 
      duration: 0.5, 
      ease: "power2.inOut" 
    })

    .add(() => {           // - - - - - - - - - - - - Cambia el texto a “Universidad de Cartagena”
      const wrapper = h1.closest(".h1-wrapper");

      h1.classList.add("is-preparing");   // oculta 1 frame, porque cuando se cambia el texto, primero aparecia el texto normal y luego el texto dividido letra por letra (que tenia un estilo diferente)

      h1.textContent = "Universidad de Cartagena";

      aplicarWaveLetters(h1);             // divide letras + aplica estilos

      h1.classList.remove("is-preparing");// ya está listo

      gsap.set(h1, { y: 80, opacity: 0 });

      if (wrapper) {
        wrapper.classList.add("activo");
      }
    })

    .to(h1, {          // - - - - - - - - - - - - - - Muestra "Universidad de Cartagena" entrando desde abajo
      y: 0, 
      opacity: 1, 
      duration: 0.5, 
      ease: "power2.inOut",
      onComplete: () => {
        if (!IS_TOUCH) {         // - - - - - - - - - Si NO es celular, activa efecto de ondas en letras y efecto de que el texto sigue el mouse
          if (!h1.dataset.wave) aplicarWaveLetters(h1);
          activarEfectoMirada();
        }
      }
    });
}

// ----------------------------------------------------------------
// Efecto “wave” en las letras del título
// ----------------------------------------------------------------

function aplicarWaveLetters(titulo) {
  if (!titulo || titulo.dataset.wave || IS_TOUCH) return;

  titulo.dataset.wave = "true";

  // Generar nuevo contenido con letras separadas
  const texto = titulo.textContent.trim();                            // Obtiene el texto del h1 sin espacios (trim quita espacios)
  titulo.innerHTML = texto.split("").map(ch =>                        // Reemplaza el contenido del h1 por spans individuales, uno por letra
    `<span class="h1-char">${ch === " " ? "&nbsp;" : ch}</span>`      // si la "letra" es un espacio, escribir &nbsp (porque los espacios normales desaparecen en HTML), si NO es un espacio, escribir la letra normal.
  ).join("");                                                         // join("") junta todo eso en un solo string largo, sin comas

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
  let ultimoFrom = "center";                                          // recuerda desde dónde vino la ola

  const animar = (subir) => {
    gsap.killTweensOf(GrupoLetrasSeparadas);
    gsap.to(GrupoLetrasSeparadas, {
      y: subir ? (i) => -18 - (i % 4) : 0,                            // Si "subir" es true, sube las letras. Si es false, las baja a 0
      duration: subir ? 0.36 : 0.4,                                   // Duración de la animación (más corta al subir)
      ease: subir ? "power2.out" : "power2.inOut",
      stagger: { each: 0.03, from: ultimoFrom }                       // Hace que cada letra vaya con un pequeño retraso para crear la ola
    });
  };

  titulo.addEventListener("mouseenter", (e) => {
    const rect = titulo.getBoundingClientRect();                      // Obtiene el área ocupada por el título
    const fromLeft = e.clientX < rect.left + rect.width / 2;          // Verifica si el mouse entró por la izquierda o por la derecha
    ultimoFrom = fromLeft ? "start" : "end";                          // se guarda el lado
    animar(true);
  });

  // Eventos
  titulo.addEventListener("mouseleave", () => animar(false));
  titulo.addEventListener("focus", () => animar(true));
  titulo.addEventListener("blur", () => animar(false));
  titulo.setAttribute("tabindex", "-1");
}

// ----------------------------------------------------------------
// Interacción — “GIGAZER mira al mouse”
// ----------------------------------------------------------------

let onMove, onLeave;

function activarEfectoMirada() {
  if (IS_TOUCH) return;

  const sec1 = document.getElementById("sec1");
  const h1 = sec1?.querySelector("h1");
  if (!sec1 || !h1) return;

  onMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 30;             // Calcula un valor entre -15 y +15 basado en la posición X del mouse           e.clientX es cuántos píxeles el mouse está desde la izquierda
    const y = (e.clientY / window.innerHeight - 0.5) * 30;            // Igual pero con Y (se hace negativo para que el movimiento sea natural)
    gsap.to(h1, {
      rotationY: x,
      rotationX: -y,
      transformPerspective: 900,                                      // Da efecto 3D real
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

// ----------------------------------------------------------------
// CONTROL DE NUBES (PAUSAR / REANUDAR)
// ----------------------------------------------------------------

function actualizarEstadoSec1(activa) {
  const sec1 = document.getElementById("sec1");
  if (!sec1) return;

  sec1.classList.toggle("sec1-activa", activa);
}

// ----------------------------------------------------------------
// Flecha para siguiente sec
// ----------------------------------------------------------------

document.querySelector(".arrow-down")?.addEventListener("click", () => {
  if (window.goToSection) {
    window.goToSection(1);
  }
});

// ----------------------------------------------------------------
// Inicialización general
// ----------------------------------------------------------------

export function initSec1() {
  
  if (sessionStorage.getItem("preloaderMostrado")) {                  // Activar animación inicial después del preloader
    animarPresentacion();
  } else {
    document.addEventListener("loader:end", animarPresentacion, { once: true });  // Esperar a que el preloader termine y entonces animar la presentación
  }

  actualizarEstadoSec1(window.getCurrentSection?.() === 0);

  window.addEventListener("sectionChange", (e) => {                   // Activar/desactivar efecto de seguimiento de mouse según sección activa
    const index = e.detail.current;
    actualizarEstadoSec1(index === 0);
    if (index === 0 && !IS_TOUCH) {                                   // Si estamos en la sección 0 (la primera) y NO es móvil
      activarEfectoMirada();
    } else {
      desactivarEfectoMirada();
    }
  });
}

