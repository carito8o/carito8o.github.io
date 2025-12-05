import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from "gsap";

// Exportamos una promesa que empieza a cargar el modelo 3D desde ya.
export const modelPromise = new Promise((resolve) => {
    const loader = new GLTFLoader().setPath("../../modelos/Cartagena glft/");
    loader.load("scene.gltf", (gltf) => {
        resolve(gltf.scene);                                                    // Si se carga correctamente, resolvemos la promesa con la escena del modelo
    }, undefined, () => resolve(null));                                         // Si hay error, resolvemos null para evitar romper la app
});

export function initSec2() {

  let expanded = false;
  let isTransitioning = false;

  const container = document.getElementById("model-container");
  if (!container) return; // si la sección no existe aún

  const title = document.querySelector('#sec2 .content h1') || document.querySelector('#sec2 h1') || document.querySelector('#sec2 h2');
  const btnSec2 = document.querySelector('#sec2 .btn-sec2');
  const width = container.clientWidth;                                          // Obtiene el ancho actual del contenedor
  const height = container.clientHeight;                                        // Obtiene el alto actual del contenedor

  // Asegurar que el título esté visible al iniciar
  if (title) {
    title.setAttribute('aria-hidden', 'false');                                 // Indica a los lectores de pantalla que el título es relevante
    title.style.pointerEvents = 'auto';
  }

  // Guardar tamaño inicial del contenedor para restaurarlo al colapsar
  let initialWidth = container.offsetWidth;
  let initialHeight = container.offsetHeight;

  // ======== BOTÓN X ==========================
  const closeBtn = document.createElement("div");
  closeBtn.id = "close-btn";                                                   // id para identificarlo en CSS
  closeBtn.innerHTML = "✕"; 
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

  // Función para reiniciar cámara y controles
  function resetCamera() {
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
  window.reset3DCamera = resetCamera;



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
      renderer.render(scene, camera);
    }
  });

  // ======== ANIMACIÓN =========================
  let animationId;                                                             // ID del requestAnimationFrame para cancelarlo
  let isVisible = false;
  let activeRender = false;
  let needsRender = true;

  // Si el usuario mueve los controles → hay que volver a renderizar
  controls.addEventListener("change", () => needsRender = true);

  function animate() {
    if (!isVisible) return;
    animationId = requestAnimationFrame(animate);

      // Bloquea interacción si está colapsado
      controls.enabled = expanded;

    // Render continuo si el contenedor está expandido
    if (expanded || activeRender) {
      controls.update();
      renderer.render(scene, camera);
      // Si no está expandido pero tiene auto-rotación → render
    } else if (controls.autoRotate && !expanded) {
      renderer.render(scene, camera);
    }

    // Si no hay auto-rotación, solo renderizamos mínimo cuando sea necesario
    else if (needsRender) {
      renderer.render(scene, camera);
      needsRender = false;           // ya se actualizó
    }
  }

  // ======== HINT =============================
  const hint = document.createElement("div");
  hint.id = "model-hint";
  hint.innerText = "Toca para interactuar";
  container.appendChild(hint);
  hint.style.opacity = "0"; // oculto al inicio


  // Observer → Detecta si la sección está en pantalla --------------------------------------------
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {

      if (entry.isIntersecting) {
        // La sección es visible
        isVisible = true;
        animate();

        // Mostrar hint ("Toca para interactuar") solo la primera vez
        if (hint.style.opacity === "0") {
          hint.style.opacity = "1";
          setTimeout(() => {
            hint.style.opacity = "0";
          }, 3000);
        }
      } else {
        // La sección dejó de ser visible → parar animación
        isVisible = false;
      cancelAnimationFrame(animationId);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(container);

  // ======== RESIZE ===========================
  function resizeRenderer() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // Solo cuando está colapsado guardamos el tamaño inicial
    if (!expanded) {
      initialWidth = newWidth;
      initialHeight = newHeight;
    }
  }

  // Ejecutar resize cada vez que cambie tamaño de ventana
  window.addEventListener("resize", resizeRenderer);
  window.resize3DRenderer = resizeRenderer;

  // ======= EXPANDIR ==========================
  function expandContainer() {
    if (expanded || isTransitioning) return;                                   // prevenir doble toque
  
    renderer.setPixelRatio(window.devicePixelRatio);                           // máxima calidad
    isTransitioning = true;
    expanded = true;
    activeRender = true;
    controls.autoRotate = true;
    controls.enabled = true;
    controls.update();

    animate();                                                                 // asegurar render continuo

    container.classList.add("expanded");                                       // activar CSS fullscreen

    gsap.killTweensOf(container);                                              // cancela cualquier animación previa
    gsap.to(container, {
      width: "90vw",
      height: "85vh",
      borderColor: "#7ED957",
      duration: 0.5,
      ease: "power2.inOut",
      onUpdate: () => {
        resizeRenderer();
        renderer.render(scene, camera);                                        // fuerza render durante la animación
      },
      onComplete: () => {
        isTransitioning = false;                                               // libera
      }
    });

    if (title) {
      gsap.killTweensOf(title);
      gsap.to(title, {
        y: -20,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        onStart: () => {
          // evitar interacciones mientras se anima fuera
          title.style.pointerEvents = 'none';
        },
        onComplete: () => {
          title.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (btnSec2) {
      gsap.killTweensOf(btnSec2);
      gsap.to(btnSec2, {
        y: 20,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        onStart: () => { btnSec2.style.pointerEvents = 'none'; },
        onComplete: () => { btnSec2.setAttribute('aria-hidden', 'true'); }
      });
    }

    hint.style.display = "none";                                               // Ocultar el mensaje de ayuda
    closeBtn.style.display = "block";                                          // mostrar la X
  }

  // ======= COLAPSAR =========================
  function pauseScene() {
    cancelAnimationFrame(animationId);
    controls.autoRotate = false;
  }

  function collapseContainer() {
    if (!expanded || isTransitioning) return;

    renderer.setPixelRatio(1);                                                 // baja calidad para reducir carga
    isTransitioning = true;
    expanded = false;
    activeRender = false;
    controls.autoRotate = false;
    controls.enabled = false;

    container.classList.remove("expanded");

    // Animación inversa del contenedor
    gsap.killTweensOf(container);
    gsap.to(container, {
      width: initialWidth,
      height: initialHeight,
      borderColor: "transparent",
      duration: 0.5,
      ease: "power2.inOut",
      onUpdate: () => {
        resizeRenderer();
        renderer.render(scene, camera);
      },
      onComplete: () => {
        isTransitioning = false;                                              // libera
        pauseScene();
      }
    });

    // Mostrar título nuevamente
    if (title) {
      gsap.killTweensOf(title);
      title.setAttribute('aria-hidden', 'false');
      title.style.pointerEvents = 'auto';
      gsap.to(title, {
        y: 0,
        opacity: 1,
        duration: 0.45,
        ease: "power2.out"
      });
    }

    if (btnSec2) {
      gsap.killTweensOf(btnSec2);
      btnSec2.setAttribute('aria-hidden', 'false');
      btnSec2.style.pointerEvents = 'auto';
      gsap.to(btnSec2, {
        y: 0,
        opacity: 1,
        duration: 0.45,
        ease: "power2.out"
      });
    }


    closeBtn.style.display = "none";                                          // ocultar X
  }

  // ======= EVENTOS ==========================

  // --- TAP vs SCROLL en pantallas táctiles ---
  let touchStartY = 0;
  let touchEndY = 0;

  container.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
  });

  container.addEventListener("touchend", (e) => {
    touchEndY = e.changedTouches[0].clientY;

    // Diferencia pequeña → fue un TAP, no un scroll
    if (Math.abs(touchStartY - touchEndY) < 10 && e.target !== closeBtn) {
      expandContainer();
    }
  });

  // Clic en el contenedor → expandir (si no se tocó la X)
  container.addEventListener("click", (e) => {
    if (e.target !== closeBtn) {
      expandContainer();
    }
  });

  // clic en X → colapsar
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();                                                      // evita que el clic también active expansión
    collapseContainer();
  });

  // Clic fuera del contenedor → colapsar
  document.addEventListener("click", (e) => {
    if (expanded && !container.contains(e.target)) {
      collapseContainer();
    }
  });

  // ----------------------------------------
  // Evitar scroll de la página mientras se interactúa con el canvas expandido
  // ----------------------------------------
  function preventDocScrollIfExpanded(e) {                                    // intenta prevenir scroll y propagación cuando hay interacción dentro del contenedor
    if (!expanded) return;                                                    // si no está expandido, permitir comportamiento normal
    if (e.cancelable) e.preventDefault();                                     // previene scroll/zoom nativo si el evento puede cancelarse
    e.stopPropagation();                                                      // evita que el evento suba al document/body
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

  window.expand3DContainer = expandContainer;
  window.collapse3DContainer = collapseContainer;
}

