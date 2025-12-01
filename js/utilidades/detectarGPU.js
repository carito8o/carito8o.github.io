export function tieneGPUReal() {

  const canvas = document.createElement("canvas");                                   // Elemento donde se intenta obtener un contexto WebGL
  const gl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });     // Solicita WebGL acelerado; con esta opción WebGL lento o por CPU se rechaza (gl = null)


  if (!gl) return false;                                                             // Si gl es null → no hay aceleración real de GPU

  const ext = gl.getExtension("WEBGL_debug_renderer_info");                          // Si el navegador lo permite, da información sobre la GPU real (fabricante y modelo)

  // Si logramos obtener la extensión, podemos leer el nombre REAL del renderizador.
  if (ext) {
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();     // Nombre exacto (en minusculas) del renderizador que WebGL está utilizando

    // Comprobamos si el renderizador es un "fallback", es decir, GPU emulada
    if (
      renderer.includes("swiftshader") ||                                            // swiftshader → renderizador de google que emula GPU usando CPU
      renderer.includes("llvmpipe") ||                                               // llvmpipe   → renderizador por CPU usado en Linux
      renderer.includes("software")                                                  // software   → cualquier renderizado no GPU
    ) {
      return false;                                                                  // GPU NO real → esta usando CPU → usar modo LITE
    }
  }

  // Test rápido de rendimiento para verificar que WebGL realmente va fluido
  const t0 = performance.now();                                                      // Tiempo incial
  for (let i = 0; i < 20000; i++) gl.clear(gl.COLOR_BUFFER_BIT);                     // Borrado WebGL básico repetido 20.000 veces (prueba de velocidad real)
  const t1 = performance.now();                                                      // Tiempo final

  return (t1 - t0) < 10;                                                             // Si el test tardó menos de 10 milisegundos → el hardware es rápido
}
