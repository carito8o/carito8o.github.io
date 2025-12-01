(function () {
  
  const paneles = Array.from(document.querySelectorAll('#main section, #main .panel'));   // Lista ordenada de todas las secciones o paneles dentro de #main
  let indiceSeccionActual = (typeof current !== 'undefined' ? current : 0);               // Índice de la sección visible actualmente (si existe una variable global "current", lo usa; si no, 0)

  const selectoresFocoPorSeccion = [                                                      // Lista de elementos que deben ser focusables en cada sección
    ['#sec1 .btn-sec1'],
    ['#model-container', '#sec2 .btn-sec2'],
    ['#sec3 .servicios__col'],
    ['#sec4 .btn-sec4'],
    ['#sec5 .card__article'],
    ['#sec6 .contact-card', '#sec6 button', '#sec6 a.contact-card']
  ];

  function establecerTabindex(elemento, valor) {
    if (!elemento) return;
    elemento.setAttribute('tabindex', valor);                                             // Aplica el valor (-1 o 0 --> desactivado o activado)
  }

  function indiceSeccionDeElemento(el) {                                                  // Devuelve a qué sección pertenece un elemento
    if (!el) return -1;                                                                   // (o -1 si no está dentro de una sección)
    const sec = el.closest('section, .panel');                                            // Busca su sección padre más cercana
    return paneles.indexOf(sec);                                                          // Obtiene su índice en "paneles"
  }

  // Lista de todos los tipos de elementos que pueden recibir foco dentro del sitio
  const partesSelectorTab = [
    'a[href]:not([tabindex="-1"])',                                                       // Significa: “Selecciona todos los links que no estén bloqueados con tabindex -1”
    'button:not([tabindex="-1"])',                                                        // not([tabindex="-1"]) se usa para evitar que TAB seleccione elementos que yo estoy desactivando cuando no corresponden a la sección actual
    'input:not([type="hidden"]):not([tabindex="-1"])',
    'select:not([tabindex="-1"])',
    'textarea:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '.card__article',
    '.servicios__col',
    '#model-container',
    '.btn-sec1', '.btn-sec2', '.btn-sec4',
    '.contact-card', '#sec6 a.contact-card'
  ];
  const selectorTabbables = partesSelectorTab.join(',');                                  // String final con todos los selectores combinados, usado para buscar elementos navegables por teclado


  // Sincroniza qué elementos son focusables según la sección activa --------------------------------------------------
  
  function sincronizarFocosSeccionActiva(indice) {

    // Lista de todos los elementos que pueden recibir foco (normalmente) en #main
    const todosFocus = Array.from(document.querySelectorAll('.focusable, #main a, #main button, #main [role="button"], #main [tabindex]'));

    todosFocus.forEach(el => {                                                            // para cada elemento
      const secIndex = indiceSeccionDeElemento(el);                                       // Saber a qué sección pertenece
      establecerTabindex(el, secIndex === indice ? '0' : '-1');                           // pone tabindex=0 si está en la sección activa, -1 si no
    });                                                                                   // Esto impide que al presionar TAB el foco salga inmediatamente a otra sección

    // Activar selectores extra (los personalizados) de la sección actual 
    (selectoresFocoPorSeccion[indice] || []).forEach(sel => {                             // Devuelve la lista de selectores para la sección que está activa
      document.querySelectorAll(sel).forEach(el => establecerTabindex(el, '0'));          // Y a todos esos elementos se les pone tabindex = 0
    });

    // Caso especial para Sección 5 (cartas)
    const cartas = Array.from(document.querySelectorAll('#sec5 .card__article'));
    if (indice === 4) {                                                                   // Si estamos en la sección 5...
      cartas.forEach(c => establecerTabindex(c, '0'));                                    // Las cartas deben ser navegables con TAB → tabindex=0
    } else {
      cartas.forEach(c => {
        establecerTabindex(c, '-1');                                                      // Sino, deben quedar desactivadas → tabindex=-1
        if (c.dataset.open === 'true') {                                                  // Si alguna está abierta...
          c.dataset.open = 'false';                                                       // Se cierra
          c.setAttribute('aria-expanded', 'false');                                       // Actualizar accesibilidad (cerrar info)
          c.classList.remove('open-by-keyboard', 'show-info');                            // Quitar estilos de apertura
          (c.querySelectorAll('.info a, .info button') || []).forEach(b => b.setAttribute('tabindex', '-1')); // Se desactiva el contenido interno (tabindex=-1)
        }
      });
    }

    if (document.activeElement && document.activeElement !== document.body) {             // Si hay un elemento actualmente enfocado...
      document.activeElement.blur();                                                      // Se le quita el foco
    }                                                                                     // ...para evitar que el foco quede en un elemento ahora inactivo
  }

  
  // Sección 3: servicios --------------------------------------------------
  // Hace que cada columna de servicios sea accesible con teclado, se pueda abrir/cerrar con ENTER y que solo una esté abierta a la vez

  function inicializarServicios() {
    const columnas = document.querySelectorAll('#sec3 .servicios__col');
    let abiertoPorTeclado = null;                                                         // Guarda cuál columna (actualmente) fue abierta por teclado

    columnas.forEach(col => {
      const txt = col.querySelector('.servicios__texto');
      const hint = col.querySelector('.servicios__hint');

      col.classList.add('focusable');                                                     // Marcar como elemento enfocable
      col.dataset.open = 'false';                                                         // Estado inicial: columna cerrada
      col.setAttribute('role', 'button');                                                 // Hace que el elemento que NO es un botón sea leído por el lector de pantalla como si fuera un botón
      col.setAttribute('aria-expanded', 'false');                                         // Indica que ese elemento controla contenido expandible (false porque esta cerrado)

      col.addEventListener('keydown', e => {
        if (e.key === 'Enter') {                                                         // Si presiona Enter...
          e.preventDefault();                                                            // Evita que Enter ejecute su acción automática (como activar un click)
          const estaAbierto = col.dataset.open === 'true';                               // Verificamos si ya estaba abierta

          // Cerrar la columna abierta previamente
          if (abiertoPorTeclado && abiertoPorTeclado !== col) {                          // Si esta abierto... y no es el que se esta intentando abrir...
            cerrarCol(abiertoPorTeclado);                                                // Cerrar el anterior
            try { abiertoPorTeclado.blur(); } catch (err) {}                             // Quitamos su foco
            abiertoPorTeclado = null;                                                    // Reiniciamos el registro de cuál estaba abierta.
          }

          if (!estaAbierto) {                                                            // Si está cerrado → abrirlo
            abrirCol(col);
            abiertoPorTeclado = col;
          } else {                                                                       // Si está abierto → cerrarlo
            cerrarCol(col);
            try { col.blur(); } catch (err) {}
            abiertoPorTeclado = null;
          }
        }
      });

      col.addEventListener('mousemove', () => {                                          // Si estaba abierta por teclado y el usuario pasa el mouse sobre otra columna, la abierta se cierra
        if (abiertoPorTeclado && abiertoPorTeclado !== col) {
          cerrarCol(abiertoPorTeclado);
          try { abiertoPorTeclado.blur(); } catch (err) {}
          abiertoPorTeclado = null;
        }
      });

      function abrirCol(targetCol) {
        const txt = targetCol.querySelector('.servicios__texto');
        const p = txt?.querySelector('p');
        const hintEl = targetCol.querySelector('.servicios__hint');

        targetCol.dataset.open = 'true';
        targetCol.setAttribute('aria-expanded', 'true');

        targetCol.classList.remove("no-hover");                                          // permitir que la columna pueda abrirse aunque esté en estado no-hover

        targetCol.classList.add("servicio-activo");                                      // Se usa .servicio-activo (lógica móvil) para que ENTER abra la columna incluso cuando el hover está bloqueado en PC

        if (txt) {
          txt.style.background = 'rgba(0,0,0,0.65)';                                   // Expande el fondo del texto
          txt.style.clipPath = 'inset(0 0 0 0 round 0.6rem)';
          txt.style.transform = 'translate(-50%, -50%) scale(1.02)';
        }
        if (p) {
          p.style.opacity = '1';                                                         // Muestra el párrafo interno
          p.style.maxHeight = '200px';
        }
        if (hintEl) hintEl.style.opacity = '0';                                          // Oculta la pista (“Toca para ver más”)
      }

      function cerrarCol(targetCol) {
        const txt = targetCol.querySelector('.servicios__texto');
        const p = txt?.querySelector('p');
        const hintEl = targetCol.querySelector('.servicios__hint');

        targetCol.dataset.open = 'false';
        targetCol.setAttribute('aria-expanded', 'false');

        targetCol.classList.remove("servicio-activo");                                   // Quitar estado activo

        if (txt) {
          txt.style.background = '';
          txt.style.clipPath = '';
          txt.style.transform = '';
        }
        if (p) {
          p.style.opacity = '';
          p.style.maxHeight = '';
        }
        if (hintEl) hintEl.style.opacity = '';
      }
    });
  }

  // Sección 5: cartas --------------------------------------------------
  
  function inicializarCartas() {
    const contenedor = document.getElementById('cards-container') ||
                      document.querySelector('#sec5 .card__container') ||
                      document.querySelector('#sec5');
    if (!contenedor) return;

    const selectorTodasCartas = '#sec5 .card__article';                                  // Cada tarjeta es un <article> con esta clase
    const obtenerTodasCartas = () => Array.from(document.querySelectorAll(selectorTodasCartas)); // Array con todas esas cartas

    function fijarTabindexInterno(articulo, valor) {                                     // Cambia tabindex de botones internos (en info, redes sociales)
      if (!articulo) return;
      (articulo.querySelectorAll('.info__link, .info a, .info button') || []).forEach(el => el.setAttribute('tabindex', valor));
    }

    let ultimaCartaAbiertaPorTeclado = null;                                             // Se guarda para que se puede cerrar cuando se abre otra

    function abrirCarta(articulo) {
      if (!articulo) return;
      if (ultimaCartaAbiertaPorTeclado && ultimaCartaAbiertaPorTeclado !== articulo) {
        cerrarCarta(ultimaCartaAbiertaPorTeclado);
      }

      articulo.classList.add('open-by-keyboard', 'show-info');                           // Marca que se abrió usando el teclado y activa animaciones y estilos de tarjeta abierta
      articulo.dataset.open = 'true';
      articulo.setAttribute('aria-expanded', 'true');

      fijarTabindexInterno(articulo, '0');                                               // Hacer foco en botones internos

      ultimaCartaAbiertaPorTeclado = articulo;                                           // Recordarla
    }

    function cerrarCarta(articulo) {
      if (!articulo) return;
      articulo.classList.remove('open-by-keyboard', 'show-info');
      articulo.dataset.open = 'false';
      articulo.setAttribute('aria-expanded', 'false');

      fijarTabindexInterno(articulo, '-1');                                              // Quitar foco interno

      if (ultimaCartaAbiertaPorTeclado === articulo) ultimaCartaAbiertaPorTeclado = null; // Si esta era la tarjeta guardada como abierta → limpiar variable
    }

    function alternarCarta(articulo) {                                                   // Abrir/cerrar según estado
      if (!articulo) return;
      if (articulo.dataset.open === 'true') cerrarCarta(articulo);
      else abrirCarta(articulo);
    }

    function inicializarCartasInternas() {
      const cartas = obtenerTodasCartas();
      if (!cartas.length) return false;

      cartas.forEach(carta => {
        if (carta._inited) return;                                                       // Evita inicializar dos veces la misma carta
        carta.classList.add('focusable');                                                // Hacerla enfocable
        carta.setAttribute('role', 'button');                                            // La tarjeta se comporta como botón para accesibilidad
        carta.dataset.open = carta.dataset.open === 'true' ? 'true' : 'false';           // Si es "true" dejalo asi, si es cualquier otra cosa (false, vacio, etc) dejalo como "false". Para que solo existan esos 2 estados
        carta.setAttribute('aria-expanded', carta.dataset.open === 'true' ? 'true' : 'false');

        carta.addEventListener('keydown', e => {
          
          if (e.target.closest('.info')) return;                                         // si estoy dentro de .info (link), no interferir

          if (e.key === 'Enter' || e.key === ' ') {                                      // Enter o barra...
            e.preventDefault();
            alternarCarta(carta);
          }

          if (e.key === 'Escape' && carta.classList.contains('open-by-keyboard')) {      // Escape siempre cierra
            e.preventDefault();
            cerrarCarta(carta);
            setTimeout(() => { try { carta.focus(); } catch (err) {} }, 0);              // Devuelve el foco al contenedor
          }
        });

        carta.addEventListener('click', e => {                                           // Abrir/cerrar con clic
          if (e.target.closest('.info')) return;                                         // Ignorar clic en botones internos
          alternarCarta(carta);
        });

        // Marca visualmente cuando el foco está en la tarjeta
        carta.addEventListener('focus', () => carta.classList.add('keyboard-focus'));
        carta.addEventListener('blur', () => carta.classList.remove('keyboard-focus'));

        fijarTabindexInterno(carta, '-1');                                               // Por defecto, los links internos NO deben ser enfocados, porque la carta está cerrada

        carta._inited = true;                                                            // Evita reinicializar la carta
      });

      return true;
    }

    function manejarCierrePorMouseOClic(evento) {
      if (!ultimaCartaAbiertaPorTeclado) return;

      const dentro = evento.target.closest('.card__article');
      if (dentro === ultimaCartaAbiertaPorTeclado) return;

      cerrarCarta(ultimaCartaAbiertaPorTeclado);
    }

    document.addEventListener('mousemove', manejarCierrePorMouseOClic);                  // Cerrar carta si el mouse sale de ella
    document.addEventListener('click', manejarCierrePorMouseOClic);                      // Cerrar carta si clic fuera

    const observerMutaciones = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) {
          if (inicializarCartasInternas()) {
            observerMutaciones.disconnect();
            break;
          }
        }
      }
    });

    observerMutaciones.observe(contenedor, { childList: true, subtree: true });
    if (!inicializarCartasInternas()) {
      window.addEventListener('load', () => inicializarCartasInternas());
    }
  }
  
  // Navegación global por TAB --------------------------------------------------
  
  let teclaTabPresionada = false;                                                        // Para evitar doble TAB rápido cuando se deja sostenida (porque lo descuadraba todo)
  let bloqueoTab = false;                                                                // Para evitar que TAB vuelva a dispararse mientras se pasa de sección

  function manejarNavegacionTab(e) {
    if (e.key !== 'Tab') return;

    if (teclaTabPresionada || bloqueoTab) {                                              // Evitar doble TAB en un mismo frame
      e.preventDefault();
      return;
    }

    teclaTabPresionada = true;

    const actual = document.activeElement;                                               // Elemento que tiene foco actualmente
    let seccionEl = (actual && actual.closest) ? actual.closest('section, .panel') : null;  // Encontrar su sección
    if (!seccionEl) seccionEl = paneles[indiceSeccionActual] || null;                    // Si no se encuentra, usa la sección actual según la variable global
    if (!seccionEl) return;

    const tabbables = Array.from(seccionEl.querySelectorAll(selectorTabbables)).filter(el => { // Obtiene todos los elementos que podrían recibir foco dentro de la sección actual
      const estilo = window.getComputedStyle(el);
      return !(estilo.display === 'none' || estilo.visibility === 'hidden' || (el.offsetParent === null && estilo.position !== 'fixed')); // Filtra los que están ocultos visualmente
    });

    if (!tabbables.length) return;                                                       // Si no hay nada para tabular, salir

    const primero = tabbables[0];
    const ultimo = tabbables[tabbables.length - 1];


    // manejo especial para sección 5 (cartas)
    if (indiceSeccionActual === 4) {
      const cartaAbierta = document.querySelector('#sec5 .card__article.open-by-keyboard, #sec5 .card__article.show-info');
      const todasCartas = Array.from(document.querySelectorAll('#sec5 .card__article'));

      if (cartaAbierta && cartaAbierta.contains(actual)) {
        const internos = Array.from(cartaAbierta.querySelectorAll(selectorTabbables)).filter(el => {
          const estilo = window.getComputedStyle(el);
          return !(estilo.display === 'none' || estilo.visibility === 'hidden' || (el.offsetParent === null && estilo.position !== 'fixed'));
        });

        if (internos.length) {
          const ultimoInterno = internos[internos.length - 1];

          if (!e.shiftKey && actual === ultimoInterno) {
            e.preventDefault();                                                          // Evitar salir mal de la carta

            cartaAbierta.dataset.open = 'false';
            cartaAbierta.setAttribute('aria-expanded', 'false');
            cartaAbierta.classList.remove('open-by-keyboard', 'show-info');

            internos.forEach(b => b.setAttribute('tabindex', '-1'));

            const indiceActual = todasCartas.indexOf(cartaAbierta);
            const siguienteCarta = todasCartas[indiceActual + 1];

            if (siguienteCarta) {
              siguienteCarta.focus();
              return;
            }

            const siguienteSeccion = Math.min(indiceSeccionActual + 1, paneles.length - 1);
            if (siguienteSeccion !== indiceSeccionActual) {
              indiceSeccionActual = siguienteSeccion;
              if (typeof window.goToSection === 'function') window.goToSection(siguienteSeccion);
              else if (typeof goTo === 'function') goTo(siguienteSeccion);
              sincronizarFocosSeccionActiva(siguienteSeccion);
            }
            return;
          }
        }
      }
    }

    // movimiento normal entre secciones --- TAB AVANZA A SIGUIENTE SECCIÓN ---
    if (!e.shiftKey && actual === ultimo) {                                              // Si se presiona TAB en el último elemento de la sección...
      e.preventDefault();
      const siguiente = Math.min(indiceSeccionActual + 1, paneles.length - 1);           // Evita saltar foco fuera del sitio y calcula la siguiente sección
      if (siguiente !== indiceSeccionActual) {
        bloqueoTab = true;                                                               // Evitar múltiples cambios
        indiceSeccionActual = siguiente;

        // Mueve visualmente la página a esa sección (scroll/animación global)
        if (typeof window.goToSection === 'function') window.goToSection(siguiente);
        else if (typeof goTo === 'function') goTo(siguiente);
        sincronizarFocosSeccionActiva(siguiente);                                        // Activa/desactiva elementos tabbables según la nueva sección
      }
      return;
    }

    // --- SHIFT+TAB RETROCEDE DE SECCIÓN ---
    // El mismo proceso, pero si se presiona Shift+TAB en el primer elemento → va a sección anterior
    if (e.shiftKey && actual === primero) {
      e.preventDefault();
      const anterior = Math.max(indiceSeccionActual - 1, 0);
      if (anterior !== indiceSeccionActual) {
        bloqueoTab = true;
        indiceSeccionActual = anterior;

        if (typeof window.goToSection === 'function') window.goToSection(anterior);
        else if (typeof goTo === 'function') goTo(anterior);
        sincronizarFocosSeccionActiva(anterior);
      }
      return;
    }
  }

  document.addEventListener('keyup', e => {                                              // Detectar liberación de TAB
    if (e.key === 'Tab') teclaTabPresionada = false;
  });

  // Sección 2: accesibilidad del contenedor del modelo 3D --------------------------------------------------
  
  function configurarContenedorModelo() {
    const contenedor = document.getElementById('model-container');
    if (!contenedor) return;

    contenedor.setAttribute('role', 'button');
    contenedor.setAttribute('aria-expanded', 'false');

    function estaExpandido() {
      return contenedor.classList.contains('expanded');
    }

    function abrirModelo() {
      contenedor.classList.add('expanded');
      contenedor.setAttribute('aria-expanded', 'true');

      if (window.expand3DContainer) window.expand3DContainer();
      else contenedor.click();
    }

    function cerrarModelo() {
      contenedor.classList.remove('expanded');
      contenedor.setAttribute('aria-expanded', 'false');

      if (window.collapse3DContainer) window.collapse3DContainer();
      else {
        const btnCerrar = contenedor.querySelector('#close-btn');
        if (btnCerrar) btnCerrar.click();
      }

      setTimeout(() => contenedor.focus(), 100);
    }

    contenedor.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !estaExpandido()) {
        e.preventDefault();
        abrirModelo();
      }
      if (e.key === 'Escape' && estaExpandido()) {
        e.preventDefault();
        cerrarModelo();
      }
      if (e.key === 'Tab' && estaExpandido()) {
        e.preventDefault();
        cerrarModelo();
        setTimeout(() => {
          const siguiente = contenedor.nextElementSibling;
          if (siguiente && siguiente.getAttribute('tabindex') === '0') siguiente.focus();
        }, 200);
      }
    });

    document.addEventListener('click', ev => {
      if (estaExpandido() && !contenedor.contains(ev.target)) {
        cerrarModelo();
      }
    });
  }
  
  // Inicialización --------------------------------------------------
  
  document.addEventListener('DOMContentLoaded', () => {
    inicializarServicios();
    inicializarCartas();
    configurarContenedorModelo();

    sincronizarFocosSeccionActiva(indiceSeccionActual);                                  // Configurar focos iniciales (seccion 1 al inicio)

    document.addEventListener('keydown', manejarNavegacionTab);

    setTimeout(() => {                                                                   // Quitar foco automático del navegador
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }, 50);

    // Evita que el título de la sección reciba foco inicial
    const primerH1 = document.querySelector('#sec1 .content .verde');
    if (primerH1) primerH1.setAttribute('tabindex', '-1');
  });

  // compatibilidad con eventos externos que cambian sección
  window.addEventListener('sectionChange', e => {

    // Cuando otro script cambia sección, resetear estado de TAB
    bloqueoTab = false;
    teclaTabPresionada = false;

    if (e?.detail && Number.isFinite(e.detail.current)) {                                // Analiza si el evento trae un número válido (real)
      indiceSeccionActual = e.detail.current;                                            // Actualiza la variable interna que guarda la sección que está activa ahora
      sincronizarFocosSeccionActiva(indiceSeccionActual);
    }
  });

})();