document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  const navLinks = [...mainNav.querySelectorAll('a')];

  const closeMenu = () => {
    menuToggle.classList.remove('active');
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    document.body.classList.remove('menu-open');
  };

  menuToggle.addEventListener('click', () => {
    const willOpen = !mainNav.classList.contains('open');
    menuToggle.classList.toggle('active', willOpen);
    mainNav.classList.toggle('open', willOpen);
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    menuToggle.setAttribute('aria-label', willOpen ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('menu-open', willOpen);
  });

  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });

  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 16);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px' });

  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

  const sections = [...document.querySelectorAll('main section[id]')];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  sections.forEach((section) => sectionObserver.observe(section));

  // Local asset placeholders stay polished until real campaign photos are added.
  document.querySelectorAll('.media-frame img, .gallery-item img').forEach((image) => {
    const markMissing = () => image.closest('.media-frame, .gallery-item').classList.add('is-missing');
    image.addEventListener('error', markMissing);
    if (image.complete && image.naturalWidth === 0) markMissing();
  });

  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalPlaceholder = document.getElementById('modalPlaceholder');
  const modalPath = document.getElementById('modalPath');
  const modalTitle = document.getElementById('modalTitle');
  let lastFocusedElement = null;

  const showModalFallback = () => {
    modalImage.style.display = 'none';
    modalPlaceholder.style.display = 'grid';
  };

  const openModal = (item) => {
    lastFocusedElement = item;
    const src = item.dataset.modalSrc;
    const title = item.dataset.modalTitle;
    modalTitle.textContent = title;
    modalPath.textContent = src;
    modalImage.alt = title;
    modalImage.style.display = 'block';
    modalPlaceholder.style.display = 'none';
    modalImage.src = src;
    modalImage.onerror = showModalFallback;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-close').focus();
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modalImage.src = '';
    if (lastFocusedElement) lastFocusedElement.focus();
  };

  document.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => openModal(item));
  });
  modal.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
    if (event.key === 'Escape' && mainNav.classList.contains('open')) closeMenu();
    if (event.key === 'Tab' && modal.classList.contains('open')) {
      const closeButton = modal.querySelector('.modal-close');
      event.preventDefault();
      closeButton.focus();
    }
  });

  const form = document.getElementById('ideaForm');
  const description = document.getElementById('descricao');
  const descriptionCount = document.getElementById('descricao-count');
  const formMessage = document.getElementById('formMessage');
  const submitButton = form.querySelector('.submit-button');
  const requiredFields = [...form.querySelectorAll('[required]')];

  description.addEventListener('input', () => {
    descriptionCount.textContent = `${description.value.length} / 1000`;
  });

  const validateField = (field) => {
    const error = document.getElementById(`${field.id}-error`);
    let message = '';
    const value = field.value.trim();

    if (!value) message = 'Este campo é obrigatório.';
    else if (field.minLength > 0 && value.length < field.minLength) message = `Use pelo menos ${field.minLength} caracteres.`;

    field.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message;
    return !message;
  };

  requiredFields.forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    formMessage.textContent = '';
    const isValid = requiredFields.map(validateField).every(Boolean);

    if (!isValid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid.focus();
      formMessage.textContent = 'Revise os campos destacados antes de continuar.';
      return;
    }

    submitButton.classList.add('loading');
    submitButton.querySelector('span').textContent = 'Verificando...';
    submitButton.querySelector('i').className = 'fa-solid fa-circle-notch fa-spin';

    window.setTimeout(() => {
      submitButton.classList.remove('loading');
      submitButton.querySelector('span').textContent = 'Verificar proposta';
      submitButton.querySelector('i').className = 'fa-solid fa-arrow-right';
      formMessage.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i> Formulário validado. O envio ainda não está ativo e nenhum dado foi armazenado.';
    }, 700);
  });

  document.getElementById('currentYear').textContent = new Date().getFullYear();
});