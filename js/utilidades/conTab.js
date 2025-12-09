(function () {
  
  const paneles = Array.from(document.querySelectorAll('#main section, #main .panel'));   // Lista ordenada de todas las secciones dentro de #main

  let indiceSeccionActual = (typeof window.getCurrentSection === 'function' ? window.getCurrentSection() : 0); // Índice de la sección visible actualmente (si existe una variable global "current", lo usa; si no, 0)

  const selectoresFocoPorSeccion = [                                                      // Lista de elementos que deben ser enfocados con tab en cada sección
    ['#sec1 .btn-sec1'],                                                                  // Sección 1
    ['#model-container', '#sec2 .btn-sec2'],                                              // Sección 2
    ['#sec3 .servicios__col'],                                                            // Sección 3
    ['#sec4 .btn-sec4'],                                                                  // Sección 4
    ['#sec5 .card__article'],                                                             // Sección 5
    ['#sec6 .contact-card', '#sec6 button', '#sec6 a.contact-card']                       // Sección 6
  ]; 

  function establecerTabindex(elemento, valor) {                                          // Función auxiliar para aplicar tabindex a un elemento
    if (elemento) elemento.setAttribute('tabindex', valor);                               // Aplica el valor (-1 o 0 --> restringido o enfocable)
  }

  function indiceSeccionDeElemento(el) {                                                  // Devuelve a qué sección pertenece un elemento
    if (!el) return -1;                                                                   // Sin elemento → -1 si no está dentro de una sección
    const sec = el.closest('section, .panel');                                            // Busca su sección padre más cercana, sube por el DOM
    return paneles.indexOf(sec);                                                          // Obtiene su índice en "paneles"
  }

  // Lista de todos los tipos de elementos que pueden recibir foco dentro del sitio
  const partesSelectorTab = [
    'a[href]:not([tabindex="-1"])',                                                       // Significa: “Selecciona todos los links que no estén bloqueados con tabindex -1”
    'button:not([tabindex="-1"])',                                                        // not([tabindex="-1"]) se usa para evitar que TAB seleccione elementos que yo estoy desactivando cuando no corresponden a la sección actual
    'input:not([type="hidden"]):not([tabindex="-1"])',
    'select:not([tabindex="-1"])',
    'textarea:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',                                                    // Cualquier elemento con tabindex ≥ 0
    '.card__article',                                                                     // Desde aqui van los elementos específicos navegables...
    '.servicios__col',
    '#model-container',
    '.btn-sec1', '.btn-sec2', '.btn-sec4',
    '.contact-card', '#sec6 a.contact-card'
  ];

  const selectorTabbables = partesSelectorTab.join(',');                                  // String final con todos los selectores combinados, usado para buscar elementos navegables por teclado

  // ----------------------------------------------------------------
  // Sincroniza qué elementos son focusables según la sección activa
  // ----------------------------------------------------------------
  
  function sincronizarFocosSeccionActiva(indice) {

    // Lista de todos los elementos que pueden recibir foco (normalmente) en #main
    const todosFocus = Array.from(document.querySelectorAll(selectorTabbables));          // usamos el selectorTabbables ya definido para evitar duplicados y búsquedas extras

    todosFocus.forEach(el => {                                                            // para cada elemento
      const secIndex = indiceSeccionDeElemento(el);                                       // Saber a qué sección pertenece
      establecerTabindex(el, secIndex === indice ? '0' : '-1');                           // pone tabindex=0 si está en la sección activa, -1 si no. Esto impide que al presionar TAB el foco salga inmediatamente a otra sección
    });

    // Activar selectores extra (los personalizados) de la sección actual 
    (selectoresFocoPorSeccion[indice] || []).forEach(sel => {                             // Devuelve la lista de selectores para la sección que está activa
      document.querySelectorAll(sel).forEach(el => establecerTabindex(el, '0'));          // Y a todos esos elementos se les pone tabindex = 0
    });

    // Caso especial para Sección 5 (cartas) ---------
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
      document.activeElement.blur();                                                      // Se le quita el foco para evitar que TAB empiece foco en un elemento desactivado por esta función
    }
  }

  // ----------------------------------------------------------------
  // Sección 3: servicios
  // ----------------------------------------------------------------
  // Hace que cada columna de servicios sea accesible con teclado, se pueda abrir/cerrar con ENTER y que solo una esté abierta a la vez

  function inicializarServicios() {
    const columnas = document.querySelectorAll('#sec3 .servicios__col');
    let abiertoPorTeclado = null;                                                         // Guarda la columna que fue abierta mediante teclado (Enter)

    document.addEventListener('mousemove', () => {                                        // Cierre por mouse en un único listener global
      if (abiertoPorTeclado) {
        abiertoPorTeclado.dataset.open = 'false';
        abiertoPorTeclado.setAttribute('aria-expanded', 'false');
        abiertoPorTeclado.classList.remove("servicio-activo");

        abiertoPorTeclado = null;
      }
    });

    columnas.forEach(col => {

      col.classList.add('focusable');                                                     // Marcar como elemento enfocable
      col.dataset.open = 'false';                                                         // Estado inicial: columna cerrada
      col.setAttribute('role', 'button');                                                 // Hace que el elemento que NO es un botón sea leído por el lector de pantalla como si fuera un botón
      col.setAttribute('aria-expanded', 'false');                                         // Indica que ese elemento controla contenido expandible (false porque esta cerrado)

      function abrirCol(targetCol) {
        targetCol.dataset.open = 'true';                                                  // Marca el estado como abierto
        targetCol.setAttribute('aria-expanded', 'true');                                  // Accesibilidad: ahora está expandida
        targetCol.classList.remove("no-hover");                                           // Quitar clase que impedía hover (si existía)
        targetCol.classList.add("servicio-activo");                                       // Se usa .servicio-activo (lógica móvil) para que ENTER abra la columna incluso cuando el hover está bloqueado en PC
      }

      function cerrarCol(targetCol) {                                                     // Función que revierte lo hecho por abrirCol
        targetCol.dataset.open = 'false';                                                 // Marca como cerrado
        targetCol.setAttribute('aria-expanded', 'false');                                 // Accesibilidad: no expandido
        targetCol.classList.remove("servicio-activo");                                    // Quitar clase de estado activo
      }

      // -----------------------------------

      col.addEventListener('keydown', e => {                                              // Escucha teclas cuando la columna tiene foco
        if (e.key === 'Enter') {                                                          // Si presiona Enter...
          e.preventDefault();                                                             // Evita que Enter ejecute su acción nativa
          const estaAbierto = col.dataset.open === 'true';                                // Verificamos si la columna ya estaba abierta

          // Cerrar la columna abierta previamente (si existe y no es la misma)
          if (abiertoPorTeclado && abiertoPorTeclado !== col) {                           // Si esta abierto... y no es el que se esta intentando abrir...
            cerrarCol(abiertoPorTeclado);                                                 // Cerrar el anterior
            abiertoPorTeclado = null;                                                     // Reiniciamos el registro de cuál estaba abierta.
          }

          if (!estaAbierto) {                                                             // Si la columna actual estaba cerrada...
            abrirCol(col);                                                                // La abrimos visualmente y en estado
            abiertoPorTeclado = col;                                                      // Guardamos que fue abierta por teclado
          } else {                                                                        // Si ya estaba abierta...
            cerrarCol(col);
            abiertoPorTeclado = null;
          }
        }
      });
    });
  }

  // ----------------------------------------------------------------
  // Sección 5: cartas
  // ----------------------------------------------------------------

  function inicializarCartas() {
    const contenedor = document.getElementById('cards-container') ||                      // Busca el contenedor principal de las cartas en varias ubicaciones posibles
                      document.querySelector('#sec5 .card__container') ||
                      document.querySelector('#sec5');
    if (!contenedor) return;

    const selectorTodasCartas = '#sec5 .card__article';                                   // Selector que representa cada tarjeta
    const obtenerTodasCartas = () => Array.from(document.querySelectorAll(selectorTodasCartas)); // Array con todas esas cartas

    function fijarTabindexInterno(articulo, valor) {                                      // Cambia tabindex de botones internos (en info, redes sociales)
      if (!articulo) return;
      (articulo.querySelectorAll('.info__link, .info a, .info button') || []).forEach(el => el.setAttribute('tabindex', valor)); // Aplica el valor recibido (ej. '-1' o '0')
    }

    let ultimaCartaAbiertaPorTeclado = null;                                              // Guarda la última carta que se abrió con el teclado, para que se puede cerrar cuando se abre otra

    function abrirCarta(articulo) {
      if (!articulo) return;
      if (ultimaCartaAbiertaPorTeclado && ultimaCartaAbiertaPorTeclado !== articulo) {
        cerrarCarta(ultimaCartaAbiertaPorTeclado);                                        // Si había otra abierta, la cerramos primero
      }

      articulo.classList.add('open-by-keyboard', 'show-info');                            // Marca que se abrió usando el teclado y activa animaciones y estilos de tarjeta abierta
      articulo.dataset.open = 'true';                                                     // Estado lógico: abierta
      articulo.setAttribute('aria-expanded', 'true');                                     // Accesibilidad: expandida

      fijarTabindexInterno(articulo, '0');                                                // Hacer foco en botones internos

      ultimaCartaAbiertaPorTeclado = articulo;                                            // Guarda cual fue la última abierta
    }

    function cerrarCarta(articulo) {
      if (!articulo) return;
      articulo.classList.remove('open-by-keyboard', 'show-info');
      articulo.dataset.open = 'false';
      articulo.setAttribute('aria-expanded', 'false');

      fijarTabindexInterno(articulo, '-1');                                               // Quitar foco interno

      if (ultimaCartaAbiertaPorTeclado === articulo) ultimaCartaAbiertaPorTeclado = null; // Si esta era la tarjeta guardada como abierta → limpiar variable
    }

    function alternarCarta(articulo) {                                                    // Abrir/cerrar según estado
      if (articulo.dataset.open === 'true') cerrarCarta(articulo);
      else abrirCarta(articulo);
    }

    function inicializarCartasInternas() {
      const cartas = obtenerTodasCartas();                                                // Obtener lista actual de cartas
      if (!cartas.length) return false;                                                   // Si no hay cartas, indicar que no se inicializó

      cartas.forEach(carta => {
        if (carta._inited) return;                                                        // Evita inicializar dos veces la misma carta
        carta.classList.add('focusable');                                                 // Hacer la tarjeta enfocable
        carta.setAttribute('role', 'button');                                             // La tarjeta se comporta como botón para lectores de pantalla
        carta.dataset.open = carta.dataset.open === 'true' ? 'true' : 'false';            // Si es "true" dejalo asi, si es cualquier otra cosa (false, vacio, etc) dejalo como "false". Para que solo existan esos 2 estados
        carta.setAttribute('aria-expanded', carta.dataset.open);

        // ------------- ACCESIBILIDAD TECLADO -------------
        carta.addEventListener('keydown', e => {                                          // Manejo de teclado en la carta
          if (e.target.closest('.info')) return;                                          // Si el foco/tecla viene de dentro de .info (links) no interferir

          if (e.key === 'Enter' || e.key === ' ') {                                       // Enter o espacio -> alternar la carta
            e.preventDefault();
            alternarCarta(carta);
          }

          if (e.key === 'Escape' && carta.classList.contains('open-by-keyboard')) {       // Escape cierra si fue abierta por teclado
            e.preventDefault();
            cerrarCarta(carta);
            setTimeout(() => { try { carta.focus(); } catch (err) {} }, 0);               // Devuelve foco al contenedor después de cerrar (pequeña espera)
          }
        });

        // ------------- CLICK -------------
        carta.addEventListener('click', e => {                                            // Abrir/cerrar con clic
          if (e.target.closest('.info')) return;                                          // Ignorar clic en botones internos
          alternarCarta(carta);
        });

        // Marca visualmente cuando el foco está en la tarjeta -------------
        carta.addEventListener('focus', () => carta.classList.add('keyboard-focus'));
        carta.addEventListener('blur', () => carta.classList.remove('keyboard-focus'));

        fijarTabindexInterno(carta, '-1');                                                // Por defecto, los links internos NO deben ser enfocados, porque la carta está cerrada

        carta._inited = true;                                                             // Marcar como inicializada para evitar re-inicializar
      });

      return true;                                                                        // Indica que la inicialización se logró
    }

    const manejarCierrePorInteraccion = evento => {                                       // Cierra la carta abierta si el usuario mueve el mouse o hace click fuera
      if (!ultimaCartaAbiertaPorTeclado) return;

      const dentro = evento.target.closest('.card__article');                             // Determina si el evento ocurrió dentro de alguna carta
      if (dentro === ultimaCartaAbiertaPorTeclado) return;                                // Si dentro es la misma abierta, no hacer nada

      cerrarCarta(ultimaCartaAbiertaPorTeclado);
    }

    document.addEventListener('mousemove', manejarCierrePorInteraccion);                   // Cerrar carta si el mouse sale de ella
    document.addEventListener('click', manejarCierrePorInteraccion);                       // Cerrar carta si clic fuera

    const observerMutaciones = new MutationObserver(muts => {                             // Observador para detectar cuando se agregan cartas dinámicamente
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) {
          if (inicializarCartasInternas()) {
            observerMutaciones.disconnect();
            break;
          }
        }
      }
    });

    observerMutaciones.observe(contenedor, { childList: true, subtree: true });           // Comenzar a observar cambios en el contenedor de cartas
    if (!inicializarCartasInternas()) {                                                   // Intento inicial inmediato; si falla, esperar al load
      window.addEventListener('load', () => inicializarCartasInternas());
    }
  }
  
  // ----------------------------------------------------------------
  // Navegación global por TAB
  // ----------------------------------------------------------------
  
  let teclaTabPresionada = false;                                                         // Para evitar que si el usuario deja presionado TAB, se generen múltiples eventos seguidos en el mismo “frame”
  let bloqueoTab = false;                                                                 // Para evitar que TAB vuelva a dispararse mientras esta la animación de cambio de sección

  function manejarNavegacionTab(e) {
    if (e.key !== 'Tab') return;

    if (teclaTabPresionada || bloqueoTab) {                                               // Si TAB ya está presionado o el sistema está bloqueado debido a un cambio de sección...
      e.preventDefault();                                                                 // Cancelamos el evento para evitar caos
      return;
    }

    teclaTabPresionada = true;                                                            // Marcamos que TAB se está presionando

    const actual = document.activeElement;                                                // Elemento que tiene foco actualmente
    let seccionEl = (actual && actual.closest) ? actual.closest('section, .panel') : null;  // Busca la sección o panel en el que está ese elemento
    if (!seccionEl) seccionEl = paneles[indiceSeccionActual] || null;                     // Si no se encuentra, usa la sección actual según la variable global
    if (!seccionEl) return;

    const tabbables = Array.from(seccionEl.querySelectorAll(selectorTabbables)).filter(el => { // Obtiene todos los elementos que podrían recibir foco dentro de la sección actual
      const estilo = window.getComputedStyle(el);
      return !(estilo.display === 'none' || estilo.visibility === 'hidden' || (el.offsetParent === null && estilo.position !== 'fixed')); // Filtra los que están ocultos visualmente (aunque estén en DOM)
    });

    if (!tabbables.length) return;                                                        // Si no hay nada para tabular, salir

    const primero = tabbables[0];                                                         // Primer elemento tabbable de la sección
    const ultimo = tabbables[tabbables.length - 1];                                       // Último tabbable de la sección


    // manejo especial para sección 5 (cartas) ----------------

    // Esta sección requiere lógica especial porque una carta puede tener elementos propios internos que solo son tabbables si la carta está abierta

    if (indiceSeccionActual === 4) {                                                      // Estamos en sección 5
      const cartaAbierta = document.querySelector('#sec5 .card__article.open-by-keyboard, #sec5 .card__article.show-info'); // Busca una carta abierta
      const todasCartas = Array.from(document.querySelectorAll('#sec5 .card__article'));

      if (cartaAbierta && cartaAbierta.contains(actual)) {                                // Si existe una carta abierta y el foco actual está dentro de ella
        const internos = Array.from(cartaAbierta.querySelectorAll(selectorTabbables)).filter(el => { // Buscar elementos tabbables dentro de esa carta
          const estilo = window.getComputedStyle(el);
          return !(estilo.display === 'none' || estilo.visibility === 'hidden' || (el.offsetParent === null && estilo.position !== 'fixed'));
        });

        if (internos.length) {
          const ultimoInterno = internos[internos.length - 1];

          if (!e.shiftKey && actual === ultimoInterno) {                                  // Si estamos en el último elemento interno y se presiona TAB (sin Shift)
            e.preventDefault();                                                           // Evitar salir mal de la carta

            // CERRAR LA CARTA ACTUAL
            cartaAbierta.dataset.open = 'false';
            cartaAbierta.setAttribute('aria-expanded', 'false');
            cartaAbierta.classList.remove('open-by-keyboard', 'show-info');

            internos.forEach(b => b.setAttribute('tabindex', '-1'));

            // Ir a la siguiente carta en la lista
            const indiceActual = todasCartas.indexOf(cartaAbierta);
            const siguienteCarta = todasCartas[indiceActual + 1];

            if (siguienteCarta) {
              siguienteCarta.focus();
              return;
            }

            // Si no hay más cartas → ir a Siguiente Sección
            const siguienteSeccion = Math.min(indiceSeccionActual + 1, paneles.length - 1);
            if (siguienteSeccion !== indiceSeccionActual) {
              bloqueoTab = false;                                                         // Se restablece porque sectionChange lo ajustará
              indiceSeccionActual = siguienteSeccion;
              if (window.goToSection) window.goToSection(siguienteSeccion);
              sincronizarFocosSeccionActiva(siguienteSeccion);
            }
            return;
          }
        }
      }
    }

    // -----------------------------------------
    // TAB NORMAL: AVANZAR A SIGUIENTE SECCIÓN
    // -----------------------------------------
    if (!e.shiftKey && actual === ultimo) {                                               // Si se presiona TAB en el último elemento de la sección...
      e.preventDefault();
      const siguiente = Math.min(indiceSeccionActual + 1, paneles.length - 1);            // Evita saltar foco fuera del sitio y calcula la siguiente sección
      if (siguiente !== indiceSeccionActual) {
        bloqueoTab = true;                                                                // Bloquear TAB mientras se hace el cambio
        indiceSeccionActual = siguiente;

        if (window.goToSection) window.goToSection(siguiente);
        sincronizarFocosSeccionActiva(siguiente);                                         // Activa/desactiva elementos tabbables según la nueva sección
      }
      return;
    }

    // -----------------------------------------
    // SHIFT+TAB RETROCEDE DE SECCIÓN
    // -----------------------------------------
    // El mismo proceso, pero si se presiona Shift+TAB en el primer elemento → va a sección anterior
    if (e.shiftKey && actual === primero) {
      e.preventDefault();
      const anterior = Math.max(indiceSeccionActual - 1, 0);
      if (anterior !== indiceSeccionActual) {
        bloqueoTab = true;
        indiceSeccionActual = anterior;

        if (window.goToSection) window.goToSection(anterior);
        sincronizarFocosSeccionActiva(anterior);
      }
      return;
    }
  }

  document.addEventListener('keyup', e => {                                               // Cuando se suelta la tecla TAB, marcamos que ya no está presionada
    if (e.key === 'Tab') teclaTabPresionada = false;
  });

  // ----------------------------------------------------------------
  // Sección 2: accesibilidad del contenedor del modelo 3D
  // ----------------------------------------------------------------
  
  function configurarContenedorModelo() {
    const contenedor = document.getElementById('model-container');                        // Obtiene el contenedor del modelo 3D
    if (!contenedor) return;

    contenedor.setAttribute('role', 'button');                                            // Se comporta como botón ante lectores de pantalla
    contenedor.setAttribute('aria-expanded', 'false');                                    // Inicialmente está cerrado/colapsado

    const estaExpandido = () => contenedor.classList.contains('expanded');                // Saber si el contenedor está abierto

    function abrirModelo() {                                                              // Abrir el contenedor 3D
      contenedor.classList.add('expanded');
      contenedor.setAttribute('aria-expanded', 'true');

      if (window.expand3DContainer) window.expand3DContainer();                           // Si existe la función global llamada expand3DContainer(), la usa para abrir el modelo
      else contenedor.click();                                                            // si no, dispara el comportamiento predeterminado que ya hace el contenedor cuando se hace clic con el mouse
    }

    function cerrarModelo() {                                                             // Cerrar contenedor 3D
      contenedor.classList.remove('expanded');
      contenedor.setAttribute('aria-expanded', 'false');

      if (window.collapse3DContainer) window.collapse3DContainer();
      else {
        const btnCerrar = contenedor.querySelector('#close-btn');
        if (btnCerrar) btnCerrar.click();
      }

      setTimeout(() => contenedor.focus(), 100);                                          // Después de cerrar, devolver el foco al contenedor
    }

    // MANEJO DE TECLADO EN EL CONTENEDOR 3D -------------------
    contenedor.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !estaExpandido()) {                     // ENTER o ESPACIO → abrir si está cerrado
        e.preventDefault();
        abrirModelo();
        return;
      }
      if (e.key === 'Escape' && estaExpandido()) {                                        // ESCAPE → cerrar si está abierto
        e.preventDefault();
        cerrarModelo();
        return;
      }
      if (e.key === 'Tab' && estaExpandido()) {                                           // TAB → si está abierto, cerrarlo y mover el foco hacia el siguiente elemento
        e.preventDefault();
        cerrarModelo();
        setTimeout(() => {                                                                // Mover foco al siguiente elemento tabbable
          let siguiente = contenedor.nextElementSibling;
          if (siguiente && siguiente.getAttribute('tabindex') === '0') siguiente.focus();
        }, 200);
      }
    });

    document.addEventListener('click', ev => {                                            // Cerrar modelo 3D si se hace clic fuera de él
      if (estaExpandido() && !contenedor.contains(ev.target)) {
        cerrarModelo();
      }
    });
  }

  // ----------------------------------------------------------------
  //  ACCESIBILIDAD GLOBAL — MANEJO DE MODALES (TRAP FOCUS + BLOQUEO EXTERNO)
  // ----------------------------------------------------------------

  (function() {

    let modalAbierto = null;                                                              // Guarda una referencia al modal actualmente abierto (si hay uno)
    let focusRoot = null;                                                                 // Contenedor dentro del modal donde se debe mantener el foco atrapado
    let ultimoFoco = null;                                                                // Guarda qué elemento tenía foco antes de abrir el modal (para restaurarlo)

    function esEnfocableVisible(el) {                                                     // Determina si un elemento es realmente enfocables y visible
      if (!el) return false;
      try {
        const selector = [                                                                // lista de elementos estándar que SÍ pueden recibir foco
          'a[href]',
          'area[href]',
          'input:not([type="hidden"]):not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'button:not([disabled])',
          'iframe',
          '[tabindex]'
        ].join(',');
        if (!el.matches(selector)) {                                                      // Si no coincide, se revisa si tiene tabIndex >= 0 (enfocable manualmente)
          if (typeof el.tabIndex === 'number' && el.tabIndex >= 0) {
            // ok, es focuseable
          } else {
            return false;
          }
        }
      } catch (err) {
          return false;
      }

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;        // También debe ser visible
      if (el.offsetParent === null && style.position !== 'fixed' && style.position !== 'sticky') return false; // offsetParent === null significa invisible salvo fixed/sticky

      return true;
    }

    // Obtiene TODOS los elementos focuseables dentro del focusRoot
    function obtenerFocos() {                                                             // Necesario para poder hacer el "ciclo" de TAB dentro del modal
      if (!focusRoot) return [];

      const raw = Array.from(focusRoot.querySelectorAll(                                  // Seleccionamos todos los elementos enfocables "normales"
        'a[href], area[href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]'
      ));

      const focos = raw.filter(esEnfocableVisible);                                       // Filtramos para eliminar los invisibles o no válidos

      // fallback: si no hay focos, intentar encontrar un botón de cerrar dentro del modal y hacerlo enfocable
      if (focos.length === 0) {
        const posibleCerrar = focusRoot.querySelector('.close-modal, [data-modal-close], [aria-label="close"], button[aria-label="close"]');
        if (posibleCerrar) {
          if (!posibleCerrar.hasAttribute('tabindex')) posibleCerrar.setAttribute('tabindex', '0');
          if (esEnfocableVisible(posibleCerrar)) return [posibleCerrar];
        }
      }

      return focos;
    }

    // ESCUCHAR: cuando sec6-contacto.js abre un modal, dispara "modal-abierto"
    window.addEventListener("modal-abierto", e => {
      modalAbierto = e.detail.modal;
      focusRoot = e.detail.focusRoot;

      ultimoFoco = document.activeElement;                                                // Recordamos dónde estaba el foco antes de abrir el modal

      document.body.classList.add("modal-open");                                          // Bloquear TAB fuera del modal

      const focos = obtenerFocos();                                                       // Enfocar el primer elemento del modal
      if (focos.length) {
        try { focos[0].focus({ preventScroll: true }); } catch (err) { focos[0].focus(); }
      } else {
      // si no hay focos, intentar enfocar el focusRoot (si tiene tabindex)
      if (focusRoot && typeof focusRoot.tabIndex === 'number' && focusRoot.tabIndex >= 0) {
        try { focusRoot.focus({ preventScroll: true }); } catch (err) { focusRoot.focus(); }
      }
    }

      document.addEventListener("keydown", trapFocus, true);                              // Activamos el trapFocus global SOLO mientras el modal esté abierto
    });

    // ESCUCHAR: cuando sec6-contacto.js cierra el modal → dispara "modal-cerrado"
    window.addEventListener("modal-cerrado", () => {
      modalAbierto = null;                                                                // Ya no hay modal
      focusRoot = null;

      document.body.classList.remove("modal-open");                                       // Restablece pointer-events normales
      document.removeEventListener("keydown", trapFocus, true);                           // Desactivamos el trap focus

      if (ultimoFoco && ultimoFoco.focus) {                                               // Devuelve el foco al elemento que lo tenía antes
        setTimeout(() => { try { ultimoFoco.focus(); } catch (err) {} }, 30);
      }
    });

    function trapFocus(e) {                                                               // Evita que TAB salga del modal
      if (!modalAbierto || e.key !== "Tab") return;

      e.preventDefault();                                                                 // Cancelamos el TAB normal
      e.stopImmediatePropagation();                                                       // Prevenimos conflictos con otros listeners

      const focos = obtenerFocos();
      if (!focos.length) return;

      const primero = focos[0];                                                           // Primer elemento del ciclo
      const ultimo  = focos[focos.length - 1];                                            // Último elemento del ciclo
      const actual = document.activeElement;

      if (e.shiftKey) {                                                                   // SHIFT + TAB → atrás
        if (!modalAbierto.contains(actual) || actual === primero) {                       // si el foco está fuera del modal o en el primero → llevar al último
          try { ultimo.focus({ preventScroll: true }); } catch (err) { ultimo.focus(); }
        } else {                                                                          // si está en medio de la lista → ir al elemento anterior
          const idx = focos.indexOf(actual);
          if (idx > 0) {
            try { focos[idx - 1].focus({ preventScroll: true }); } catch (err) { focos[idx - 1].focus(); }
          } else {
            try { ultimo.focus({ preventScroll: true }); } catch (err) { ultimo.focus(); } // fallback por seguridad
          }
        }
      } else {                                                                            // TAB normal → adelante
        if (!modalAbierto.contains(actual) || actual === ultimo) {                        // si está fuera del modal o en el último → regresar al primero
          try { primero.focus({ preventScroll: true }); } catch (err) { primero.focus(); }
        } else {                                                                          // avanzar en la lista normal
          const idx = focos.indexOf(actual);
          if (idx !== -1 && idx < focos.length - 1) {
            try { focos[idx + 1].focus({ preventScroll: true }); } catch (err) { focos[idx + 1].focus(); }
          } else {
            try { primero.focus({ preventScroll: true }); } catch (err) { primero.focus(); } // fallback por seguridad
          }
        }
      }
    }

  })(); // fin IIFE modales

  // ----------------------------------------------------------------
  // Inicialización
  // ----------------------------------------------------------------
  
  document.addEventListener('DOMContentLoaded', () => {
    inicializarServicios();
    inicializarCartas();
    configurarContenedorModelo();

    sincronizarFocosSeccionActiva(indiceSeccionActual);                                   // Configurar focos iniciales (seccion 1 al inicio)

    document.addEventListener('keydown', manejarNavegacionTab);                           // Activamos la navegación global por TAB

    setTimeout(() => {                                                                    // Quitar foco automático del navegador al cargar
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    }, 50);

    const primerH1 = document.querySelector('#sec1 .content .verde');                     // Evita que el título de la sección reciba foco inicial
    if (primerH1) primerH1.setAttribute('tabindex', '-1');
  });

  window.addEventListener('sectionChange', e => {                                         // compatibilidad con eventos externos que cambian sección

    // Cuando otro script cambia sección, resetear estado de TAB
    bloqueoTab = false;
    teclaTabPresionada = false;

    if (e?.detail && Number.isFinite(e.detail.current)) {                                 // Analiza si el evento trae un número válido (la sección actual real)
      indiceSeccionActual = e.detail.current;                                             // Actualizamos nuestra sección interna
      sincronizarFocosSeccionActiva(indiceSeccionActual);                                 // Activamos/desactivamos los tabbables correctos según la nueva sección
    }
  });

})();
