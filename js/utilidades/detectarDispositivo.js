// Detecta si el dispositivo usa input táctil como principal
export function isTouchDevice() {
  return (
    navigator.maxTouchPoints > 0 ||                                             // true si el navegador reporta puntos táctiles (los móviles reportan cuántos dedos soportan)
    "ontouchstart" in window ||                                                 // fallback: si existe el evento ontouchstart en window, sugiere un dispositivo táctil
    window.matchMedia("(pointer: coarse)").matches                              // último recurso: media query que detecta un puntero "coarse" (dedo)
  );
}

// Detecta si hay hover real (mouse / trackpad)
export function hasHover() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

// Breakpoints coherentes
export function isMobileSize() {
  return window.innerWidth <= 768;
}

export function isTabletSize() {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

export function isDesktopSize() {
  return window.innerWidth > 1024;
}
