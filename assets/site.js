/* Prisme Logiciels — script commun à toutes les pages.
   Chaque bloc vérifie que ses éléments existent : une page sans onglets ni formulaire fonctionne aussi. */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // année du pied de page
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // en-tête au défilement
  const hdr = $('#hdr');
  if (hdr) {
    const onScroll = () => hdr.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // menu mobile
  const mBtn = $('#menuBtn');
  const panel = $('#mobilePanel');
  if (mBtn && panel) {
    const closeMenu = () => { panel.classList.remove('open'); mBtn.classList.remove('open'); mBtn.setAttribute('aria-expanded', false); };
    mBtn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      mBtn.classList.toggle('open', open);
      mBtn.setAttribute('aria-expanded', open);
    });
    $$('a', panel).forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) { closeMenu(); mBtn.focus(); } });
  }

  // thème clair / sombre
  const themeBtn = $('#themeBtn');
  const rootEl = document.documentElement;
  const metaTheme = $('#metaTheme');
  const themeColors = { dark: '#0a1520', light: '#f6f8fb' };
  const syncMeta = () => { if (metaTheme) metaTheme.setAttribute('content', themeColors[rootEl.getAttribute('data-theme')] || themeColors.dark); };
  syncMeta();
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    rootEl.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncMeta();
  });

  // apparition au défilement
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in'); io.unobserve(e.target);
        // le délai d'apparition ne doit pas retarder les survols ensuite
        setTimeout(() => e.target.classList.remove('d1', 'd2', 'd3', 'd4'), 1300);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // onglets (motif ARIA « tabs », navigation au clavier)
  const tabs = $$('[role="tab"]');
  if (tabs.length) {
    const selectTab = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = j === i;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(i));
      t.addEventListener('keydown', e => {
        const n = tabs.length;
        const map = { ArrowDown: (i + 1) % n, ArrowRight: (i + 1) % n, ArrowUp: (i - 1 + n) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
        if (e.key in map) { e.preventDefault(); selectTab(map[e.key], true); }
      });
    });
  }

  // formulaire de contact
  const form = $('#contactForm');
  if (!form) return;
  const typeSelect = $('#type');
  // /contact?produit=ONG360 présélectionne la solution
  const wanted = new URLSearchParams(location.search).get('produit');
  if (typeSelect && wanted && [...typeSelect.options].some(o => o.value === wanted)) typeSelect.value = wanted;

  const note = $('#formNote');
  const submitBtn = $('button[type="submit"]', form);
  const noteDefault = note ? note.innerHTML : '';
  const setNote = (msg, color) => { if (!note) return; note.innerHTML = msg; note.style.color = color || ''; };

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    let premierInvalide = null;
    ['nom', 'email', 'message'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const ok = el.value.trim() !== '' && (id !== 'email' || el.checkValidity());
      el.style.borderColor = ok ? '' : '#d05a5a';
      el.setAttribute('aria-invalid', !ok);
      if (!ok && !premierInvalide) premierInvalide = el;
    });
    if (premierInvalide) { setNote('Merci de renseigner votre nom, un email valide et votre message.', '#d05a5a'); premierInvalide.focus(); return; }

    const btnLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Envoi en cours…';
    setNote('Envoi de votre demande…');
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const data = await res.json();
      if (res.ok && data.success) {
        form.reset();
        setNote('✓ Demande envoyée. Nous revenons vers vous rapidement.', '#3f9d6b');
      } else {
        throw new Error(data.message || 'Échec de l’envoi');
      }
    } catch (err) {
      setNote('L’envoi a échoué. Réessayez ou écrivez-nous à contact@prismelogiciels.com.', '#d05a5a');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = btnLabel;
      setTimeout(() => { if (note && note.style.color === 'rgb(63, 157, 107)') setNote(noteDefault); }, 6000);
    }
  });
})();
