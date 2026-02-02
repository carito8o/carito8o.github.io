import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { isTouchDevice } from "./utilidades/detectarDispositivo.js";
import gsap from "gsap";

export const modelPromise = new Promise((resolve) => {                          // Exportamos una promesa que representa el proceso COMPLETO de carga del modelo 3D y se resolverá cuando termine de cargar
  const manager = new THREE.LoadingManager();                                   // Coordina y vigila TODOS los recursos cargados por los loaders que usen este manager (modelos, texturas, etc.)
  const loader = new GLTFLoader(manager).setPath("../../modelos/Cartagena glft/"); // Conecta el loader al manager para que el manager sepa cuándo empieza y termina cada archivo cargado
  let sceneCache = null;                                                        // Variable donde almacenaremos la escena del modelo una vez cargado

  manager.onLoad = () => {                                                      // Este callback se ejecuta AUTOMÁTICAMENTE cuando LoadingManager detecta que TODOS los recursos registrados han terminado de cargarse correctamente
    requestAnimationFrame(() => {                                               // Espera un frame adicional del navegador para asegurar que Three.js haya terminado cualquier tarea interna pendiente
      resolve(sceneCache);                                                      // Resuelve la promesa devolviendo la escena del modelo
    });
  };

  manager.onError = () => resolve(null);                                        // Si algún recurso falla durante la carga gestionada por el manager, resuelve la promesa con null en lugar de rechazarla
    loader.load("scene.gltf", (gltf) => {                                       // Callback que se ejecuta cuando el archivo scene.gltf se ha descargado y parseado correctamente
        sceneCache = gltf.scene;                                                // Extrae la escena del archivo GLTF. Esta escena contiene todos los meshes, luces, jerarquías, etc.

      sceneCache.traverse(obj => {                                              // Recorre recursivamente TODOS los objetos de la escena
        if (obj.isMesh) {                                                       // Filtra únicamente los objetos que son Mesh, ya que solo ellos tienen geometría y materiales
          obj.frustumCulled = false;                                            // Desactiva el frustum culling automático. Esto evita que el mesh desaparezca si Three.js cree erróneamente que está fuera de cámara
          if (obj.material) {                                                   // Verificamos que el mesh tenga material asignado. Algunos nodos pueden no tenerlo
            const materials = Array.isArray(obj.material)
              ? obj.material                                                    // - Si es un array (multi-material), lo usa tal cual
              : [obj.material];                                                 // - Si es un solo material, lo convierte a un array. Esto permite tratar ambos casos con la misma lógica

            materials.forEach(m => {
              m.needsUpdate = true;                                             // Marca explícitamente el material como "necesita actualización". Esto obliga a Three.js a: Recompilar shaders, sincronizar texturas y asegurar que el material esté listo para renderizar
            });
            
          }
        }
      });
    }, undefined, () => resolve(null));                                         // Callback: Si hay error, resuelve la promesa con null para que todo continúe sin romperse
});

export function initModelo3d() {

  let expanded = false;
  let isTransitioning = false;
  window.is3DTransitioning = () => isTransitioning;                             // Función global que permite a main.js saber si el contenedor 3D está actualmente en una transición. Devuelve true si hay una animación en curso

  const container = document.getElementById("model-container");
  if (!container) return; // si la sección no existe aún

  const titulo3D = document.querySelector('#sec2 .tituloContenedor3D');
  const btn3D = document.querySelector('#sec2 #btnContenedor3D');
  const width = container.clientWidth;                                          // Obtiene el ancho actual del contenedor
  const height = container.clientHeight;                                        // Obtiene el alto actual del contenedor

  // Asegurar que el título esté visible al iniciar
  if (titulo3D) {
    titulo3D.setAttribute('aria-hidden', 'false');                                 // Indica a los lectores de pantalla que el título es relevante
    titulo3D.style.pointerEvents = 'auto';
  }

  // Guardar tamaño inicial del contenedor para restaurarlo al colapsar
  let initialWidth = container.offsetWidth;
  let initialHeight = container.offsetHeight;

  // ======== BOTÓN X ==========================
  const closeBtn = document.createElement("div");
  closeBtn.id = "close-btn";                                                   // id para identificarlo en CSS
  closeBtn.innerHTML = ""; 
  container.appendChild(closeBtn);
  closeBtn.style.display = "none";                                             // Oculto al inicio

  // ======== RENDERER =========================
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });  // antialias = bordes suaves           alpha = permite fondo transparente
  renderer.setSize(width, height);                                             // Ajusta el tamaño del renderer al tamaño del contenedor HTML
  renderer.setPixelRatio(window.devicePixelRatio);                             // Ajusta la densidad de píxeles según la pantalla
  renderer.outputColorSpace = THREE.SRGBColorSpace;                            // Configura el espacio de color para hacer los colores más realistas (?)
  container.appendChild(renderer.domElement);

  // ======== ESCENA ===========================
  const scene = new THREE.Scene();

  // ======== CÁMARA ===========================
  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);     // 45 Campo de visión, 1 Distancia mínima de renderizado, 1000 maxima
  camera.position.set(0, 80, -250);

  // ======== CONTROLES ========================
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;                                               // Habilita amortiguación (movimiento suave)
  controls.enablePan = false;                                                  // Desactiva arrastrar hacia los lados (solo rotación y zoom)
  controls.dampingFactor = 0.12;                                               // Suavidad del movimiento amortiguado
  controls.minDistance = 80;                                                   // es de zoom
  controls.maxDistance = 200;
  controls.maxPolarAngle = Math.PI / 2;                                        // Evita que la cámara pueda mirar por debajo del modelo
  controls.autoRotate = true;
  controls.target = new THREE.Vector3(0, 1, 30);
  controls.update();

  const initialCameraPos = camera.position.clone();
  const initialTarget = controls.target.clone();

  function resetCamera() {                                                     // Función para reiniciar cámara y controles
    gsap.to(camera.position, {
      x: initialCameraPos.x,
      y: initialCameraPos.y,
      z: initialCameraPos.z,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {                                                        // Cada vez que la posición cambia, refrescamos controles y renderer
        controls.update();
        renderer.render(scene, camera);
      }
    });

    gsap.to(controls.target, {
      x: initialTarget.x,
      y: initialTarget.y,
      z: initialTarget.z,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {
        controls.update();
        renderer.render(scene, camera);
      }
    });
  }
  window.reset3DCamera = resetCamera;                                          // Para que se pueda reiniciar desde main.js al cambiar de sección



  // Suelo
  //const groundGeometry = new THREE.PlaneGeometry(20, 20);
  //groundGeometry.rotateX(-Math.PI / 2);
  //const groundMaterial = new THREE.MeshStandardMaterial({
  //  color: 0x555555,
  //  side: THREE.DoubleSide,
  //});
  //const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  //scene.add(groundMesh);


  // ======== LUCES ============================
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(0xffffff, 3, 100, 0.2, 0.5);           // 3 intensidad, 100 distancia máxima, 0.2 ángulo del cono, 0.5 suavidad del borde del cono
  spotLight.position.set(0, 25, 0);
  spotLight.castShadow = true;
  scene.add(spotLight);

  // ======== CARGAR MODELO ====================
  modelPromise.then(mesh => {                                                  // mesh es el modelo cargado desde scene.gltf
    if (mesh) {
      mesh.position.set(0, 1.05, -1);
      scene.add(mesh);
      renderer.compile(scene, camera);
      renderer.render(scene, camera);

    }
  });

  // ======== ANIMACIÓN =========================
  let animationId;                                                             // ID del requestAnimationFrame para cancelarlo
  let isVisible = false;
  let activeRender = false;
  let needsRender = true;

  controls.addEventListener("change", () => needsRender = true);               // Si el usuario mueve los controles → hay que volver a renderizar

  function animate() {
    if (!isVisible) return;
    animationId = requestAnimationFrame(animate);

    if (expanded || activeRender) {                                            // Render continuo si el contenedor está expandido
      controls.update();
      renderer.render(scene, camera);
    } else if (controls.autoRotate && !expanded) {                             // Si no está expandido pero tiene auto-rotación → render
      renderer.render(scene, camera);
    }
    else if (needsRender) {                                                    // Si no hay auto-rotación, solo renderizamos mínimo cuando sea necesario
      renderer.render(scene, camera);
      needsRender = false;                                                     // ya se actualizó
    }
  }

  // ======== HINT =============================
  const hint = document.createElement("div");
  hint.id = "model-hint";
  hint.innerText = "Toca para interactuar";
  container.appendChild(hint);
  hint.style.opacity = "0";                                                    // oculto al inicio


  // ----------------------------------------------------------------
  // Observer → Detecta si la sección está en pantalla
  // ----------------------------------------------------------------

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {

      if (entry.isIntersecting) {
        isVisible = true;                                                      // La sección es visible
        animate();

        if (hint.style.opacity === "0") {                                      // Mostrar hint ("Toca para interactuar") solo la primera vez
          hint.style.opacity = "1";
          setTimeout(() => {
            hint.style.opacity = "0";
          }, 3000);
        }
      } else {                                                                 // La sección dejó de ser visible → parar animación
        isVisible = false;
      cancelAnimationFrame(animationId);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(container);

  // ----------------------------------------------------------------
  // RESIZE
  // ----------------------------------------------------------------
  function resizeRenderer() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    if (!expanded) {                                                           // Solo cuando está colapsado guardamos el tamaño inicial
      initialWidth = newWidth;
      initialHeight = newHeight;
    }
  }

  // Ejecutar resize cada vez que cambie tamaño de ventana
  window.addEventListener("resize", resizeRenderer);
  window.resize3DRenderer = resizeRenderer;

  // ----------------------------------------------------------------
  // EXPANDIR
  // ----------------------------------------------------------------
  function expandContainer() {
    if (expanded || isTransitioning) return;                                   // prevenir doble toque
  
    renderer.setPixelRatio(window.devicePixelRatio);                           // máxima calidad
    isTransitioning = true;
    expanded = true;
    activeRender = true;
    controls.enabled = false;
    controls.autoRotate = false;
    controls.update();

    animate();                                                                 // asegurar render continuo
    container.classList.add("expanded");                                       // activar CSS fullscreen

    if (isTouchDevice()) {                                                     // cuando se expande en móviles, ajustar sec2
        const sec2 = document.getElementById("sec2");
        if (sec2) {
            sec2.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    gsap.killTweensOf(container);                                              // cancela cualquier animación previa
    gsap.to(container, {
      width: "90vw",
      height: "85vh",
      borderColor: "#7ED957",
      duration: 0.5,
      ease: "power2.inOut",
      onUpdate: () => {
        resizeRenderer();
      },
      onComplete: () => {
        isTransitioning = false;                                               // libera
        controls.enabled = true;
        controls.autoRotate = true;
      }
    });

    if (titulo3D) {
      gsap.killTweensOf(titulo3D);
      gsap.to(titulo3D, {
        y: -20,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        onStart: () => {
          titulo3D.style.pointerEvents = 'none';                                  // evitar interacciones mientras se anima fuera
        },
        onComplete: () => {
          titulo3D.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (btn3D) {
      gsap.killTweensOf(btn3D);
      gsap.to(btn3D, {
        y: 20,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        onStart: () => { btn3D.style.pointerEvents = 'none'; },
        onComplete: () => { btn3D.setAttribute('aria-hidden', 'true'); }
      });
    }

    hint.style.display = "none";                                               // Ocultar el mensaje de ayuda
    closeBtn.style.display = "block";                                          // mostrar la X
  }

  function guardedExpand3D() {                                                 // Autoriza o bloquea la expansión del contenedor del modelo 3D, consultando en sec2 si la expansión está permitida
    if (!window.is3DPanelFullscreen || !window.is3DPanelFullscreen()) {        // Si el panel NO está en fullscreen (100vw), el modelo 3D NO tiene permiso para expandirse
      return;
    }
    if (isTransitioning || expanded) {                                         // Si esta en transición o ya esta expandido, no se puede volver a expandir el modelo 3D
      return;
    }
    expandContainer();
  }

  // ----------------------------------------------------------------
  // COLAPSAR
  // ----------------------------------------------------------------
  window.__isCollapsing3D = false;

  function pauseScene() {
    cancelAnimationFrame(animationId);
    controls.autoRotate = false;
  }

  function collapseContainer() {
    if (!expanded || isTransitioning) return;
    window.__isCollapsing3D = true;                                            // Flag global que indica que el 3D está en proceso de colapso

    renderer.setPixelRatio(1);                                                 // baja calidad para reducir carga
    isTransitioning = true;
    expanded = false;
    activeRender = false;
    controls.autoRotate = false;
    controls.enabled = false;

    container.classList.remove("expanded");                                    // Quita la clase CSS que indicaba estado expandido

    gsap.killTweensOf(container);                                              // Animación inversa del contenedor
    gsap.to(container, {                                                       // Animación de colapso del contenedor al tamaño original
      width: initialWidth,
      height: initialHeight,
      borderColor: "transparent",
      duration: 0.5,
      ease: "power2.inOut",
      onUpdate: () => {
        resizeRenderer();                                                      // Reajusta el renderer de Three.js para que coincida con el tamaño actual del contenedor
        renderer.render(scene, camera);                                        // Fuerza render manual para evitar frames vacíos
      },
      onComplete: () => {
        isTransitioning = false;                                               // libera
        pauseScene();                                                          // Detiene el render loop
        window.__isCollapsing3D = false;                                       // Indica que el colapso ya terminó

        if (typeof window.after3DCollapse === "function") {                    // Si existe un callback pendiente (ej: navegación retrasada)...
          const callback = window.after3DCollapse;                             // Guarda la referencia
          window.after3DCollapse = null;                                       // Limpia inmediatamente para evitar dobles ejecuciones
          callback();                                                          // Ejecuta el callback (goTo()), la navegación que estaba bloqueada
        }
      }
    });

    if (titulo3D) {                                                               // Mostrar título nuevamente
      gsap.killTweensOf(titulo3D);
      titulo3D.setAttribute('aria-hidden', 'false');
      titulo3D.style.pointerEvents = 'auto';
      gsap.to(titulo3D, {
        y: 0,
        opacity: 1,
        duration: 0.45,
        ease: "power2.out"
      });
    }

    if (btn3D) {
      gsap.killTweensOf(btn3D);
      btn3D.setAttribute('aria-hidden', 'false');
      btn3D.style.pointerEvents = 'auto';
      gsap.to(btn3D, {
        y: 0,
        opacity: 1,
        duration: 0.45,
        ease: "power2.out"
      });
    }

    closeBtn.style.display = "none";                                           // ocultar X

    if (window.restaurar3DMitad) {
      window.restaurar3DMitad();
    }
  }

  // ----------------------------------------------------------------
  // EVENTOS
  // ----------------------------------------------------------------

  // --- TAP vs SCROLL en pantallas táctiles ---
  let touchStartY = 0;
  let touchEndY = 0;

  container.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
  });

  container.addEventListener("touchend", (e) => {
    touchEndY = e.changedTouches[0].clientY;

    // ---- Si tocó la X, cerramos y salimos ----
    if (e.target === closeBtn || e.target.closest && e.target.closest("#close-btn")) {
      ; // dejar que closeBtn procese su click
    }

    // Diferencia pequeña → fue un TAP, no un scroll
    if (Math.abs(touchStartY - touchEndY) < 10) {
      guardedExpand3D();
    }
  }, { passive: true });

  // Clic en el contenedor → expandir (si no se tocó la X)
  container.addEventListener("click", (e) => {
    if (e.target === closeBtn || (e.target.closest && e.target.closest("#close-btn"))) { // Si el click vino de la X (o de un hijo), no expandir
      return;
    }
    guardedExpand3D();                                                         // No se expande directamente. guardedExpand3D() consulta al panel (sec2) y decide si la expansión está permitida
  }, { passive: true });

  closeBtn.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    collapseContainer();
  }, { passive: true });                         

  // clic en X → colapsar
  closeBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    collapseContainer();
  }, { passive: false });

  // Clic fuera del contenedor → colapsar
  document.addEventListener("click", (e) => {
    if (expanded && !container.contains(e.target)) {
      collapseContainer();
    }
  });

  // ----------------------------------------------------------------
  // Evitar scroll de la página mientras se interactúa con el canvas expandido
  // ----------------------------------------------------------------
  function preventDocScrollIfExpanded(e) {                                     // intenta prevenir scroll y propagación cuando hay interacción dentro del contenedor
    if (!expanded) return;                                                     // si no está expandido, permitir comportamiento normal
    if (e.cancelable) e.preventDefault();                                      // previene scroll/zoom nativo si el evento puede cancelarse
    e.stopPropagation();                                                       // evita que el evento suba al document/body
  }

  // Rueda del mouse sobre el contenedor -> evitar que mueva la página (pero permitir zoom de cámara con wheel)
  container.addEventListener('wheel', (e) => {
    preventDocScrollIfExpanded(e);
  }, { passive: false });

  // Touch dentro del contenedor -> bloquear scroll nativo mientras está expandido
  container.addEventListener('touchstart', (e) => {
    if (!expanded) return;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    preventDocScrollIfExpanded(e);
  }, { passive: false });

  // pointerdown para evitar que drags sobre la barra/scroll causen efectos
  container.addEventListener('pointerdown', (e) => {
    if (!expanded) return;
    e.stopPropagation();
  }, { passive: true });


  window.collapse3DContainer = collapseContainer;
  window.is3DExpanded = () => expanded;                                        // Exponemos si el contenedor 3D está expandido o no. Permite que main.js tome decisiones de navegación: colapsar antes de cambiar de sección
  window.after3DCollapse = null;                                               // Variable global usada como callback diferido. main.js puede asignar aquí una función que se ejecutará JUSTO cuando el colapso del 3D haya terminado

}
