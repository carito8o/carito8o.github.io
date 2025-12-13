document.addEventListener("DOMContentLoaded", () => {
  
  const toggleBtn   = document.querySelector(".nav-toggle");
  const mobileMenu  = document.querySelector(".mobile-menu");
  const closeBtn    = document.querySelector(".close-menu");
  const overlay     = document.querySelector(".nav-overlay");
  const links       = mobileMenu.querySelectorAll("a");

  const openMenu = () => {
    mobileMenu.classList.add("open");
    closeBtn.classList.add("show");
    overlay.classList.add("active");
    toggleBtn.classList.add("hide");   // ocultar hamburguesa
    document.body.classList.add("no-scroll");
  };

  const closeMenu = () => {
    mobileMenu.classList.remove("open");
    closeBtn.classList.remove("show");
    overlay.classList.remove("active");
    toggleBtn.classList.remove("hide"); // mostrar hamburguesa
    document.body.classList.remove("no-scroll");
  };

  toggleBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);

  links.forEach(link => {
    link.addEventListener("click", closeMenu); // cerrar al seleccionar
  });
});
