import gsap from "gsap";
import { isTouchDevice, isMobileSize } from "../utilidades/detectarDispositivo.js";

export function initSec3() {

  const circulo = document.querySelector("#sec3 .circle-bg");
  const contenido = document.querySelector("#sec3 .nosotros__contenido");
  const sec3 = document.querySelector("#sec3");

  const viewportReducido = () => isMobileSize() || window.innerWidth <= 1280; // Devuelve true cuando la UI debería usar animaciones más cortas y simples, porque en pantallas pequeñas las animaciones largas molestan y consumen más recursos
  const hideNextButton = () => isTouchDevice() || isMobileSize();           // Devuelve true cuando el botón "next" NO debe mostrarse

  if (!circulo || !contenido || !sec3) return;                              // Si alguno de los elementos no existe, se detiene la función para evitar errores

  // ----------------------------------------------------------------
  // Ajustar el texto para que encaje dentro del círculo
  // ----------------------------------------------------------------

  function ajustarContenidoAlCirculo() {

    gsap.killTweensOf(contenido, "scale");

    const c = circulo.getBoundingClientRect();                              // Tamaño actual del círculo en píxeles
    const t = contenido.getBoundingClientRect();                            // Tamaño actual del contenido (texto)

    const factorMargen = 0.9;                                               // Reducimos un poco el área útil (10% menos) para tener un pequeño margen interno
    const maxAncho = c.width * factorMargen;                                // Máximo ancho que puede tener el contenido
    const maxAlto = c.height * factorMargen;                                // Máxima altura permitida del contenido

    if (t.width === 0 || t.height === 0) {                                  // Si el contenido mide 0 (esta oculto), usamos un tamaño básico (escala 1)
      gsap.to(contenido, { scale: 1, duration: 0.2, ease: "power2.out" });
      return;
    }

    const escalaAncho = maxAncho / t.width;                                 // Escala posible basada en ancho (cuánto debo reducir el texto para que el ancho encaje dentro del círculo)
    const escalaAlto = maxAlto / t.height;                                  // Escala basada en altura
    const escalaFinal = Math.min(1, escalaAncho, escalaAlto);               // Elegimos la escala más pequeña. Porque si las otras escalas son menores que 1, el texto esta muy grande y debe hacerse mas pequeño; si son mayores, el texto ya cabe, incluso sobra espacio

    gsap.to(contenido, { scale: escalaFinal, duration: 0.22, ease: "power2.out" }); // Animamos el contenido para ajustarse suavemente al círculo
  }

  contenido.style.transformOrigin = "50% 50%";                              // Centro del contenido
  contenido.style.willChange = "transform, opacity";                        // Optimización para mejorar el rendimiento

  // ----------------------------------------------------------------
  // Ocultar botón next en pantallas táctiles
  // ----------------------------------------------------------------

  const btnNext = document.querySelector('#sec3 .btn-next');
  if (hideNextButton()) {                                                   // Evalua si el botón debe ocultarse
    if (btnNext) btnNext.style.display = 'none';                            // Oculta el botón en móviles
  }

  // ----------------------------------------------------------------
  // Observer principal de la sección - ANIMACIÓN DEL CÍRCULO Y APARICIÓN DE CONTENIDO
  // ----------------------------------------------------------------

  let contenidoMostrado = false;                                            // Variable para evitar repetir animaciones
  let sec3Visible = false;                                                  // Flag que indica si la sección 3 está actualmente visible en pantalla

  const sec3Observer = new IntersectionObserver((entradas) => {             // Detecta si se entra o se sale de la seccion 3
    entradas.forEach(entrada => {

      if (entrada.isIntersecting) {                                         // Si la sección entra al viewport...

        sec3Visible = true;                                                 // Marca la sección como activa
        updateNextButtonVisibility();                                       // Actualiza visibilidad del botón

        gsap.killTweensOf([circulo, contenido]);

        gsap.to(circulo, {
          width: hideNextButton() ? '92vw' : '85vw',                        // En móviles el círculo es más grande respecto a la pantalla
          height: hideNextButton() ? '86vh' : '70vh',
          borderRadius: '15%',
          duration: viewportReducido() ? 0.7 : 1.2,                        // Animación más corta en pantallas pequeñas, evita sensación pesada o lenta
          ease: "power2.out",
          onComplete: () => {
            if (!contenidoMostrado) {                                       // Solo si aún no se mostró...
              requestAnimationFrame(() => {
                ajustarContenidoAlCirculo();                                // Ajustamos texto al nuevo tamaño
                gsap.to(contenido, { opacity: 1, duration: 0.35, ease: "power1.out" });   // Mostramos contenido suavemente
                contenidoMostrado = true;                                   // Marcamos que ya fue mostrado, para evitar repetir la animación
              });
            }
          }
        });

      } else {                                                              // Si la sección sale del viewport…

        sec3Visible = false;
        gsap.killTweensOf([circulo, contenido]);                            // Cancelamos posibles animaciones

        gsap.to(circulo, {                                                  // Reducimos el círculo
          width: '40vw',
          height: '40vw',
          borderRadius: '30%',
          duration: viewportReducido() ? 0.5 : 0.8,
          ease: "power2.in",
          onComplete: () => {
            requestAnimationFrame(ajustarContenidoAlCirculo);               // Reajustamos contenido al tamaño reducido
            contenidoMostrado = false;
          }
        });

        if (viewportReducido()) {                                          // Ocultar el contenido (solo en pantallas pequeñas)
          gsap.to(contenido, {
            opacity: 0,
            duration: 0.25,
            ease: "power1.in"
          });
        }
      }

    });
  }, { threshold: 0.4 });                                                   // Se activa cuando 40% de la sección es visible

  sec3Observer.observe(sec3);


  // ----------------------------------------------------------------
  // Animación de texto por parrafos
  // ----------------------------------------------------------------
  
  const sec4Textos = document.querySelectorAll("#sec3 .nosotros__contenido p");

  if (sec4Textos.length > 0) {

    sec4Textos.forEach(el => {
      const span = document.createElement("span");                          // Envolvemos cada párrafo en un <span>
      span.classList.add("linea");                                          // Clase que identificará cada parrafo animable
      span.innerHTML = el.innerHTML;                                        // Copiamos el contenido original
      el.innerHTML = "";                                                    // Limpiamos el elemento
      el.appendChild(span);                                                 // Insertamos el nuevo contenedor
    });

    const textObserver = new IntersectionObserver(entradas => {             // Creamos un nuevo Observer para animar el texto
      entradas.forEach(entrada => {

        if (entrada.isIntersecting) {                                       // Cuando el texto es visible…
          const lineas = entrada.target.querySelectorAll(".linea");         // Seleccionamos las líneas recién creadas

          gsap.fromTo(lineas,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power2.out" }
          );
          textObserver.unobserve(entrada.target);                           // Dejamos de observar para que la animación no se repita nunca más
        }
      });
    }, { threshold: 0.5 });                                                 // Se activa cuando el contenido está al 50%

    textObserver.observe(contenido);
  }

  // ----------------------------------------------------------------
  // El titulo solo funciona cuando la sección es visible
  // ----------------------------------------------------------------

  const title = document.querySelector("#sec3 .title-aurora");

  const titleObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        title.style.animationPlayState = "running";
      } else {
        title.style.animationPlayState = "paused";
      }
    },
    { threshold: 0.2 }
  );
  if (title) titleObserver.observe(sec3);

  // ----------------------------------------------------------------
  // Al hacer resize
  // ----------------------------------------------------------------

  function updateNextButtonVisibility() {
    if (!btnNext) return;
    btnNext.style.display = hideNextButton() ? 'none' : '';
  }

  function updateCircleOnResize() {
  if (!sec3Visible) return;                                                 // Si la seccion esta activa...

  gsap.set(circulo, {                                                       // Ajustamos el tamaño del círculo SIN animar. gsap.set aplica valores inmediatos
    width: hideNextButton() ? '92vw' : '85vw',                              // Mismos valores que la animación principal
    height: hideNextButton() ? '86vh' : '70vh'
  });

  requestAnimationFrame(ajustarContenidoAlCirculo);                         // Recalculamos el escalado del texto al siguiente frame
}

  const resizeObserver = new ResizeObserver(() => ajustarContenidoAlCirculo()); // Observador para detectar cambios (en tiempo real) de tamaño en el círculo
  resizeObserver.observe(circulo);

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {                                           // Esperamos al próximo frame para evitar cálculos intermedios
      updateNextButtonVisibility();
      updateCircleOnResize();
    });
  });
}
