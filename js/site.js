(() => {
  'use strict';

  const menuButton = document.querySelector('[data-menu-toggle]');
  const navigation = document.getElementById('site-nav');

  if (menuButton && navigation) {
    const menuLabel = menuButton.querySelector('.menu-label');
    const desktop = window.matchMedia('(min-width: 761px)');

    const setMenuOpen = (open, returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      navigation.classList.toggle('is-open', open);
      if (menuLabel) menuLabel.textContent = open ? 'Schließen' : 'Menü';
      if (returnFocus) menuButton.focus();
    };

    menuButton.setAttribute('aria-controls', navigation.id);
    setMenuOpen(false);

    menuButton.addEventListener('click', () => {
      setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a[href^="#"]')) setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false, true);
      }
    });

    desktop.addEventListener('change', (event) => {
      if (event.matches) setMenuOpen(false);
    });
  }

  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const fieldset = form.querySelector('.contact-fields');
  const interacted = new WeakSet();
  // The fieldset starts disabled: willValidate is false until enhancement is ready.
  const fields = Array.from(form.querySelectorAll('input, select, textarea'));
  const limits = { name: 100, email: 254, betrieb: 160, message: 1200 };
  Object.entries(limits).forEach(([name, limit]) => {
    const field = form.elements.namedItem(name);
    if (field) field.maxLength = limit;
  });
  const errorNodes = new Map(
    Array.from(form.querySelectorAll('[data-error-for]')).map((node) => [
      node.dataset.errorFor,
      node,
    ]),
  );

  // JavaScript supplies inline feedback. Native constraints remain the source of truth.
  form.noValidate = true;
  if (status) {
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
  }

  errorNodes.forEach((node, name) => {
    const field = form.elements.namedItem(name);
    if (!(field instanceof HTMLElement)) return;
    if (!node.id) node.id = `contact-error-${name}`;
    const descriptions = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    descriptions.add(node.id);
    field.setAttribute('aria-describedby', Array.from(descriptions).join(' '));
  });

  const setStatus = (message, state = '') => {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  };

  const clearError = (field) => {
    field.removeAttribute('aria-invalid');
    const error = errorNodes.get(field.name);
    if (error) error.textContent = '';
  };

  const validationMessage = (field) => {
    if (field.validity.valueMissing) {
      const requiredMessages = {
        name: 'Bitte tragen Sie Ihren Namen ein.',
        email: 'Bitte tragen Sie Ihre E-Mail-Adresse ein.',
      };
      return requiredMessages[field.name] || 'Bitte füllen Sie dieses Feld aus.';
    }
    if (field.validity.typeMismatch && field.type === 'email') {
      return 'Bitte prüfen Sie Ihre E-Mail-Adresse, zum Beispiel name@betrieb.de.';
    }
    if (field.validity.typeMismatch && field.type === 'url') {
      return 'Bitte geben Sie eine vollständige Website-Adresse ein, zum Beispiel https://betrieb.de.';
    }
    if (field.validity.tooShort) return `Bitte geben Sie mindestens ${field.minLength} Zeichen ein.`;
    if (field.validity.tooLong) return `Bitte verwenden Sie höchstens ${field.maxLength} Zeichen.`;
    return field.validationMessage || 'Bitte prüfen Sie Ihre Eingabe.';
  };

  const validateField = (field) => {
    field.setCustomValidity('');
    if (field.required && !field.value.trim()) {
      field.setCustomValidity(field.name === 'name' ? 'Bitte tragen Sie Ihren Namen ein.' : 'Bitte tragen Sie Ihre E-Mail-Adresse ein.');
    } else if (limits[field.name] && field.value.length > limits[field.name]) {
      field.setCustomValidity(`Bitte verwenden Sie höchstens ${limits[field.name]} Zeichen.`);
    }
    if (field.validity.valid) {
      clearError(field);
      return true;
    }
    field.setAttribute('aria-invalid', 'true');
    const error = errorNodes.get(field.name);
    if (error) error.textContent = validationMessage(field);
    return false;
  };

  fields.forEach((field) => {
    const onEdit = () => {
      interacted.add(field);
      field.setCustomValidity('');
      clearError(field);
      setStatus('');
    };
    field.addEventListener('input', onEdit);
    field.addEventListener('change', onEdit);
    field.addEventListener('blur', () => {
      if (interacted.has(field)) validateField(field);
    });
  });

  document.querySelectorAll('[data-package]').forEach((link) => {
    link.addEventListener('click', () => {
      const packageSelect = form.elements.namedItem('paket');
      if (!(packageSelect instanceof HTMLSelectElement)) return;
      const value = link.dataset.package;
      if (!Array.from(packageSelect.options).some((option) => option.value === value)) return;
      packageSelect.value = value;
      packageSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalidFields = fields.filter((field) => !validateField(field));
    if (invalidFields.length) {
      setStatus('Bitte prüfen Sie die markierten Felder. Ihre Anfrage wurde noch nicht versendet.', 'error');
      invalidFields[0].focus();
      return;
    }

    const values = new FormData(form);
    const getValue = (name) => String(values.get(name) || '').trim();
    const singleLine = (value) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    const packageValue = getValue('paket');
    const selectedPackage = ['Noch offen', 'Basis', 'Pro', 'Spezialanfertigung'].includes(packageValue) ? packageValue : 'Noch offen';
    const body = [
      'Hallo Marc,',
      '',
      'ich möchte einen 15-Minuten-Check für meinen Betrieb anfragen.',
      '',
      `Name: ${singleLine(getValue('name'))}`,
      `Betrieb: ${singleLine(getValue('betrieb')) || 'Nicht angegeben'}`,
      `E-Mail: ${singleLine(getValue('email'))}`,
      `Paket: ${selectedPackage}`,
      '',
      'Nachricht:',
      getValue('message').replace(/\r\n|\r|\n/g, '\r\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '') || 'Ich freue mich über eine persönliche Rückmeldung.',
      '',
      'Bitte melden Sie sich bei mir, damit wir einen Termin abstimmen können.',
    ].join('\r\n');
    const subject = `15-Minuten-Check: ${singleLine(getValue('betrieb') || getValue('name'))}`;
    let mailto;
    try {
      mailto = `mailto:marc.luepke@icloud.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch {
      setStatus('Ein Zeichen konnte nicht übernommen werden. Bitte schreiben Sie direkt an marc.luepke@icloud.com.', 'error');
      return;
    }
    // Mail applications have different URI limits. Never silently truncate an inquiry.
    if (mailto.length > 8000) {
      setStatus('Der Entwurf ist für den E-Mail-Link zu lang. Bitte kürzen Sie Ihre Nachricht oder schreiben Sie direkt an marc.luepke@icloud.com.', 'error');
      return;
    }

    setStatus(
      'Ihr E-Mail-Entwurf ist vorbereitet. Prüfen und senden Sie ihn in Ihrem E-Mail-Programm. Über diese Seite wurde keine Anfrage versendet und kein Termin gebucht.',
      'draft',
    );
    // Sending remains an explicit action in the visitor's own mail application.
    try {
      window.location.href = mailto;
    } catch {
      setStatus('Der E-Mail-Entwurf konnte nicht geöffnet werden. Bitte schreiben Sie direkt an marc.luepke@icloud.com.', 'error');
    }
  });
  // Enable last, after the submit prevention and validation handlers are installed.
  if (fieldset) fieldset.disabled = false;
  const fallback = form.querySelector('[data-form-fallback]');
  if (fallback) fallback.hidden = true;
})();
