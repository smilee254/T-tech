/* ── TOAST NOTIFICATIONS ── */
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* ── SCROLL REVEAL ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

/* ── INITIALIZATION ── */
window.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('loaderBar');
  const loader = document.getElementById('loader');
  const heroImg = document.getElementById('heroImg');

  if (bar) {
    setTimeout(() => { bar.style.width = '100%'; }, 100);
  }

  setTimeout(() => {
    if (loader) loader.classList.add('hide');
    if (heroImg) heroImg.classList.add('loaded');

    // Observe static reveal elements after loader hides
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
      revealObserver.observe(el);
    });
  }, 2800);
});

/* ── NAVBAR SCROLL ── */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
});

/* ── MOBILE MENU ── */
const menuBtn = document.getElementById('menuBtn');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
  });
}
document.querySelectorAll('.mobile-link').forEach(l => {
  l.addEventListener('click', () => {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.remove('open');
  });
});
