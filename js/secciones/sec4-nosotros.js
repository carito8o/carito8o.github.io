import gsap from "gsap";

export function initSec4() {

  const circulo = document.querySelector("#sec4 .circle-bg");
  const contenido = document.querySelector("#sec4 .nosotros__contenido");
  const sec4 = document.querySelector("#sec4");

  if (!circulo || !contenido || !sec4) return;                              // Si alguno de los elementos no existe, se detiene la función para evitar errores

  // Ajustar el texto para que encaje dentro del círculo ---------------------------------------------------------

  function ajustarContenidoAlCirculo() {

    gsap.killTweensOf(contenido);

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

  const resizeObserver = new ResizeObserver(() => ajustarContenidoAlCirculo()); // Observador para detectar cambios (en tiempo real) de tamaño en el círculo
  resizeObserver.observe(circulo);

  window.addEventListener("resize", () => {
    requestAnimationFrame(ajustarContenidoAlCirculo);
  });


  // Ocultar botón next en pantallas táctiles ---------------------------------------------------------

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch) {
    const btnNext = document.querySelector('#sec4 .btn-next');
    if (btnNext) btnNext.style.display = 'none';                            // Ocultamos el botón en móviles
  }


  // Observer principal de la sección - ANIMACIÓN DEL CÍRCULO Y APARICIÓN DE CONTENIDO ---------------------------------------------------------

  let contenidoMostrado = false;                                            // Variable para evitar repetir animaciones

  const sec4Observer = new IntersectionObserver((entradas) => {             // Detecta si se entra o se sale de la seccion 4
    entradas.forEach(entrada => {

      const esPantallaPequeña = window.innerWidth <= 1280;

      if (entrada.isIntersecting) {                                         // Si la sección entra al viewport...

        gsap.killTweensOf([circulo, contenido]);

        gsap.to(circulo, {
          width: isTouch ? '92vw' : '85vw',                                 // En móviles el círculo es más grande (ocupa más pantalla)
          height: isTouch ? '86vh' : '70vh',
          borderRadius: '15%',
          duration: esPantallaPequeña ? 0.7 : 1.2,                          // Duración diferente según tamaño de pantalla
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

        gsap.killTweensOf([circulo, contenido]);                            // Cancelamos posibles animaciones

        gsap.to(circulo, {                                                  // Reducimos el círculo
          width: '40vw',
          height: '40vw',
          borderRadius: '30%',
          duration: esPantallaPequeña ? 0.5 : 0.8,
          ease: "power2.in",
          onComplete: () => {
            requestAnimationFrame(ajustarContenidoAlCirculo);               // Reajustamos contenido al tamaño reducido
            contenidoMostrado = false;
          }
        });

        if (esPantallaPequeña) {                                            // Ocultar el contenido (solo en pantallas pequeñas)
          gsap.to(contenido, {
            opacity: 0,
            duration: 0.25,
            ease: "power1.in"
          });
        }
      }

    });
  }, { threshold: 0.4 });                                                   // Se activa cuando 40% de la sección es visible

  sec4Observer.observe(sec4);


  // Animación de texto por parrafos ---------------------------------------------------------
  
  const sec4Textos = document.querySelectorAll("#sec4 .nosotros__contenido p, #sec4 .nosotros__contenido h1");

  if (sec4Textos.length > 0) {

    // Envolvemos cada párrafo en un <span>
    sec4Textos.forEach(el => {
      const span = document.createElement("span");
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
}
