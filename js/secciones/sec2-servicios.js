import gsap from "gsap";
import { isTouchDevice, isMobileSize } from "../utilidades/detectarDispositivo.js"; 

export function initSec2() {

  const sec2 = document.querySelector("#sec2");
  if (!sec2) return;                                                   // Todo este archivo nada mas funciona si el usuario esta en la seccion 2

  const cols = sec2.querySelectorAll(".servicios__col");               // Todas las columnas de servicios
  const IS_TOUCH = isTouchDevice();
  const isMobile = isMobileSize();

  /* ======================================================
     ANIMACIONES DE ENTRADA (PC / MOBILE)
  ====================================================== */

  if (!isMobile) {                                                     // Si es un computador...
    const tl = gsap.timeline({
      paused: true,                                                    // No se reproduce automáticamente
      defaults: { ease: "power3.out" }                                 // Valores para todas las animaciones dentro de ese tl
    });

    cols.forEach((col, index) => {                                     // Recorre cada columna (servicio) individual
      const texto = col.querySelector(".servicios__texto");            // Dentro de cada columna obtiene el bloque completo de texto (texto y boton)

      tl.from(texto.children, {                                        // Crea una animación "from" para todos los hijos del texto, esto significa: anima h2, luego h1, luego p y luego el boton
        y: 30,                                                         // comienzan 30px más abajo
        opacity: 0,                                                    // comienzan invisibles
        duration: 0.6,                                                 // duración de cada animación
        stagger: 0.12                                                  // delay progresivo entre cada elemento
      }, index * 0.4);                                                 // retraso entre columnas (efecto cascada). index es la columna (0 o 1) y 0.4 para que crezca el delay
    });

    let played = false;                                                // Flag para evitar que la animación se reproduzca más de una vez. Es solo una vez por sesión

    const observer = new IntersectionObserver(                         // IntersectionObserver que sirve para detectar cuándo la sección entra en el viewport
      ([entry]) => {
        if (entry.isIntersecting && !played) {                         // entry.isIntersecting = true cuando la sección es visible
          played = true;
          tl.play();
          observer.unobserve(sec2);                                    // Deja de observar la sección (no se repetirá)
        }
      },
      { threshold: 0.6 }                                               // Se activa cuando el 60% de la sección es visible
    );

    observer.observe(sec2);                                            // Comienza a observar la sección

  } else {                                                             // Si es un dispositivo movil... → cada servicio anima por separado
    cols.forEach(col => {
      const texto = col.querySelector(".servicios__texto");

      const tl = gsap.timeline({                                       // Aqui el tl esta dentro de cols.forEach, asi que es uno por servicio y funcionan separados
        paused: true,
        defaults: { ease: "power3.out" }
      });

      tl.from(texto.children, {
        y: 25,                                                         // menos desplazamiento (pantalla pequeña)
        opacity: 0,
        duration: 0.5,
        stagger: 0.1
      });

      let played = false;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !played) {
            played = true;
            tl.play();
            observer.unobserve(col);
          }
        },
        { threshold: 0.35 }                                            // Se activa antes que en desktop
      );

      observer.observe(col);
    });
  }

  /* ======================================================
     EXPANSIÓN DE SERVICIOS (INTERACCIÓN)
  ====================================================== */

  const izq = cols[0];                                                 // Columna izquierda → Servicio 3D
  const der = cols[1];                                                 // Columna derecha → Servicio 360

  // Capa de expansión para cada lado
  const expandIzq = izq.querySelector(".servicio-expandido");
  const expandDer = der.querySelector(".servicio-expandido");

  const btnIzq = izq.querySelector("#mapa3dbtn");
  const btnDer = der.querySelector("#tour360btn");

  let estado = null;                                                   // Guarda qué servicio está abierto ("izq", "der" o null)
  let animando = false;                                                // Evita que se ejecuten animaciones simultáneas

  function animarBoton(btn) { // ---------------------------- ANIMACIÓN REBOTE BOTON
    gsap.fromTo(
      btn,
      { scale: 1 },
      {
        scale: 1.12,
        duration: 0.15,
        ease: "back.out(2.5)",
        yoyo: true,
        repeat: 1
      }
    );
  }

  function abrir(lado) { // --------------------------------- ABRIR EXPANSIÓN

    if (animando || estado) return;                                    // Si ya hay una animación en curso o un servicio abierto, no se hace nada
    animando = true;
    estado = lado;

    if (lado === "izq") {
      btnIzq.textContent = "VER MENOS";
      btnIzq.classList.add("is-open");
      animarBoton(btnIzq);

      gsap.to(expandIzq, {                                             // Anima la expansión del fondo izquierdo
        // clip-path: inset(top right bottom left) define un rectángulo visible dentro del elemento. Cada valor dice: “Recorta esta cantidad desde este lado”, lo que queda fuera de ese rectángulo NO se ve, pero el elemento sigue existiendo y no mueve el layout
        clipPath: "inset(0 0% 0 0)",                                   // se revela completamente, no corta ningun lado
        duration: 0.7,
        ease: "power3.inOut",
        onStart: () => {
          expandIzq.style.pointerEvents = "auto";                      // ahora si recibe clicks la expansión
        },
        onComplete: () => {
          der.style.pointerEvents = "none";                            // Desactiva interacción del servicio contrario
          animando = false;
        }
      });
    }

    if (lado === "der") {
      btnDer.textContent = "VER MENOS";
      btnDer.classList.add("is-open");
      animarBoton(btnDer);

      gsap.to(expandDer, {
        clipPath: "inset(0 0 0 0%)",
        duration: 0.7,
        ease: "power3.inOut",
        onStart: () => {
          expandDer.style.pointerEvents = "auto";
        },
        onComplete: () => {
          izq.style.pointerEvents = "none";
          animando = false;
        }
      });
    }
  }

  function cerrar() { // ------------------------------------ CERRAR EXPANSIÓN

    if (animando || !estado) return;                                   // Si no hay servicio abierto o hay animación en curso, no hace nada
    animando = true;

    // Reactiva interacción en ambos servicios
    izq.style.pointerEvents = "";
    der.style.pointerEvents = "";

    gsap.to(expandIzq, {                                               // Cierra la expansión izquierda
      clipPath: "inset(0 100% 0 0)",                                   // se oculta hacia la derecha. Recorta el 100% del ancho desde la derecha hacia adentro
      duration: 0.6,
      ease: "power3.inOut",
      onComplete: () => {
        expandIzq.style.pointerEvents = "none";                        // Vuelve a bloquear
      }
    });

    gsap.to(expandDer, {                                               // Cierra la expansión derecha
      clipPath: "inset(0 0 0 100%)",                                   // se oculta hacia la izquierda
      duration: 0.6,
      ease: "power3.inOut",
      onStart: () => {
        btnIzq.textContent = "VER MÁS";
        btnDer.textContent = "VER MÁS";
        btnIzq.classList.remove("is-open");
        btnDer.classList.remove("is-open");
      },
      onComplete: () => {
        estado = null;
        animando = false;
        expandDer.style.pointerEvents = "none";
      }
    });
  }

  // -------------------------------------------------------- LA EXPANSION DE SERVICIO 3D SE EXPANDE A TODA LA PANTALLA POR EL MODELO 3D

  let fullScreen3D = false;                                            // flag temporal para indicar que el 3D ocupa toda la sección
  const txtInferior = document.querySelector('.sec2__txtInferior');

  function expandir3DFullscreen() {
    if (animando || estado !== "izq" || fullScreen3D || (window.is3DTransitioning && window.is3DTransitioning())) return;

    animando = true;
    fullScreen3D = true;

    gsap.to(expandIzq, {
      width: "100vw",
      left: "0",
      duration: 0.7,
      ease: "power3.inOut",
      onStart: () => {
        txtInferior.style.display = 'none';
      },
      onComplete: () => {
        animando = false;
      }
    });
  }

  function restaurar3DMitad() {
    if (animando || !fullScreen3D) return;

    animando = true;
    fullScreen3D = false;

    gsap.to(expandIzq, {
      width: "50vw",
      left: "100%",
      duration: 0.6,
      ease: "power3.inOut",
      onStart: () => {
        txtInferior.style.display = '';
      },
      onComplete: () => {
        animando = false;
      }
    });
  }

  /* ======================== EVENTOS ======================== */

  btnIzq.addEventListener("click", e => {                              // Click en botón izquierdo
    e.preventDefault();                                                // Evita el comportamiento por defecto del <a>
    estado === "izq" ? cerrar() : abrir("izq");                        // Si ya está abierto → cerrar, si no → abrir
  });

  btnDer.addEventListener("click", e => {                              // Click en botón derecho
    e.preventDefault();
    estado === "der" ? cerrar() : abrir("der");
  });

  const modelContainer = document.getElementById("model-container");

  if (modelContainer) {
    modelContainer.addEventListener("click", () => {
      expandir3DFullscreen();
    });
  }
  window.restaurar3DMitad = restaurar3DMitad;

  window.addEventListener("sectionChange", (e) => {                    // En computadores (sistema snap on scroll), cierra la expansión cuando se cambia de sección
    const index = e.detail.current;
    if (index !== 1 && !IS_TOUCH) {                                    // Si estamos en la sección 0 (la primera) y NO es móvil
      cerrar();
    }
  });

  window.is3DPanelFullscreen = () => fullScreen3D === true;            // Función global que devuelve el estado real del panel 3D (fullscreen o no). modelo3d.js la consulta para saber si el modelo 3D tiene permiso de expandirse
}
