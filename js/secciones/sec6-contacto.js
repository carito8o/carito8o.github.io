import gsap from "gsap";

export function initSec6() {

  const section = document.querySelector("#sec6");
  if (!section) return;

  const tl = gsap.timeline({ paused: true });                                               // Creamos una línea de tiempo, pero pausada (no se ejecuta cuando se crea, se ejecuta al llegar a la seccion 6)

  // Animación de títulos y descripciones (la inicial)
  tl.fromTo(
    section.querySelectorAll(".contact-title, .contact-desc"),
    { opacity: 0, y: 30 },                                                                  // Estado inicial: abajo + invisible
    { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" }                  // Estado final: visible + arriba
  )
  // Animación de las tarjetas de contacto
    .fromTo(
      section.querySelectorAll(".contact-card"),
      { opacity: 0, y: 40, scale: 0.98 },                                                   // Ligeramente pequeñas y escondidas
      { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: "power3.out" },
      0.15                                                                                  // Inicia 0.15s después de la animación anterior
    )
    // Animación del footer
    .fromTo(
      section.querySelector(".contact-footer"),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      0.5                                                                                   // Empieza medio segundo después del primer bloque
    )
    .eventCallback("onComplete", () => {                                                    // Cuando TODA la animación del timeline termine...
      requestAnimationFrame(() => {                                                         // Esperamos al siguiente frame del navegador, para que no se eliminen estilos en el mismo momento exacto en que la animación acaba y no "parpadee"
        gsap.set(
          section.querySelectorAll(".contact-title, .contact-desc, .contact-card, .contact-footer"),
          { clearProps: "transform, opacity" }                                              // Elimina los estilos inline que GSAP añadió durante la animación para que los elementos vuelvan a depender solo del CSS normal y evitar que queden transformaciones activas que interfieran después
        );
      });
    });

    // Observer: activa la animación cuando 60% de la sección está visible
  const observer = new IntersectionObserver(([entry], obs) => {
    if (entry.isIntersecting) {
      tl.play(0);                                                                           // Ejecuta la animación desde el inicio, cuando entramos a la seccion
      obs.unobserve(section);                                                               // Ya no observar más (no repetir la animación)
    }
  }, { threshold: 0.6 });

  observer.observe(section);

  // Copiar teléfono y mostrar notificación -------------------------

  const phoneEl = document.getElementById("phone-number");

  if (phoneEl) {
    phoneEl.addEventListener("click", () => {
      navigator.clipboard.writeText("+57 304 302 1622").then(() => {                        // Copiar y luego...

        // Buscamos si ya existe una notificación previa
        let notiTel = document.querySelector(".copy-notiTel");
        if (!notiTel) {
          notiTel = document.createElement("div");
          notiTel.className = "copy-notiTel";                                               // Le asignamos la clase CSS que define su estilo
          notiTel.textContent = "Número copiado";
          document.body.appendChild(notiTel);                                               // Lo agregamos al final del <body> para que se superponga visualmente
        }

        // Mostrar animación
        notiTel.classList.add("show");

        // Ocultar después de 2s
        setTimeout(() => {
          notiTel.classList.remove("show");
        }, 2000);
      });
    });
  }
}

//   MODAL DE CONTACTO (EMAIL) ===============================================================================

const modal = document.getElementById("mail-modal");                                        // Fondo oscuro
const modalContent = document.querySelector(".mail-modal-content");                         // Cuadro del modal 
const btnCorreo = document.querySelector(".contact-card.gmail");                            // Boton de correo en la sec6
const btnClose = document.querySelector(".close-modal");

// Datos del correo
const email = "contacto.gigazer@gmail.com";
const subject = encodeURIComponent("Consulta desde Gigazer");                               // Codificamos espacios/caracteres para que funcionen en URLs

// --- Abrir modal ---
btnCorreo?.addEventListener("click", e => {
  e.preventDefault();
  modal.style.display = "flex";                                                             // Mostramos el modal
});

// --- Cerrar con la X ---
btnClose?.addEventListener("click", () => {
  modal.style.display = "none";
});

// --- Cerrar tocando afuera ---
modal.addEventListener("click", e => {                                                      // Cerrar si se toca el fondo oscuro
  if (!modalContent.contains(e.target)) {                                                   // Detecta si se hizo clic fuera del cuadro (modal)
    modal.style.display = "none";
  }
});

// --- Acciones de los botones (Gmail, Outlook, Yahoo, etc.) ---
document.querySelectorAll(".mail-options button").forEach(btn => {
  btn.addEventListener("click", () => {

    const type = btn.dataset.mail;                                                          // Detectamos qué botón tocó el usuario

    let url = "";

    switch (type) {
      case "gmail":
        url = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}`;
        break;

      case "outlook":
        url = `https://outlook.live.com/mail/0/deeplink/compose?to=${email}&subject=${subject}`;
        break;

      case "yahoo":
        url = `https://compose.mail.yahoo.com/?to=${email}&subject=${subject}`;
        break;

      case "mailto":
        // Abre el programa de correo instalado en la PC/telefono
        url = `mailto:${email}?subject=${subject}`;
        break;
    }

    // Abrir en pestaña nueva (menos "mailto", que no funciona en _blank)
    if (type === "mailto") {
      window.location.href = url;                                                           // Abre el cliente de correo local
    } else {
      window.open(url, "_blank");                                                           // Abre Gmail/Outlook/Yahoo en nueva pestaña
    }

    modal.style.display = "none";                                                           // Oculta el modal después de elegir una opción
  });
});



