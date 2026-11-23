/* Resume Builder: editable suggestions for common fields.
   Load this file AFTER resume_script_0gtt.js. */
(() => {
  const storeKey = 'resume-builder-custom-suggestions-v1';

  const lists = {
    marital: ['Married', 'Unmarried', 'Divorced', 'Widowed', 'Separated'],
    country: ['India', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 'Singapore', 'Malaysia'],
    guardian: ['Father', 'Mother', 'Husband', 'Wife', 'Son', 'Daughter', 'Brother', 'Sister', 'Guardian'],
    skill: ['Communication', 'Customer Service', 'MS Office', 'Excel', 'Tally', 'Data Entry', 'Typing', 'Accounting', 'Sales', 'HTML', 'CSS', 'JavaScript', 'React', 'PHP', 'Python', 'Photoshop'],
    language: ['English', 'Malayalam', 'Hindi', 'Arabic', 'Tamil', 'Urdu', 'Kannada', 'Telugu', 'Bengali', 'French', 'German'],
    hobby: ['Reading', 'Travelling', 'Music', 'Sports', 'Cooking', 'Photography', 'Drawing', 'Gardening', 'Movies', 'Volunteering'],
    education: ['SSLC', 'Plus Two', 'VHSE', 'ITI', 'Diploma', 'Bachelor Degree', 'BCom', 'BBA', 'BSc', 'BA', 'BCA', 'BTech', 'Master Degree', 'MCom', 'MBA', 'MSc', 'MA', 'MCA', 'MTech', 'PhD'],
    job: ['Salesman', 'Sales Executive', 'Accountant', 'Cashier', 'Teacher', 'Office Assistant', 'Data Entry Operator', 'Customer Service Executive', 'Receptionist', 'Driver', 'Electrician', 'Plumber', 'Nurse', 'Chef', 'Store Keeper', 'Computer Operator']
  };

  const custom = () => {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); }
    catch { return {}; }
  };

  const saveCustom = (key, rawValue) => {
    const values = String(rawValue || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!values.length) return;
    const saved = custom();
    const known = new Set([...(lists[key] || []), ...(saved[key] || [])].map(value => value.toLowerCase()));
    const additions = values.filter(value => !known.has(value.toLowerCase()));
    if (!additions.length) return;
    saved[key] = [...(saved[key] || []), ...additions];
    localStorage.setItem(storeKey, JSON.stringify(saved));
    refreshList(key);
  };

  const idFor = key => `resume-suggestions-${key}`;
  const refreshList = key => {
    const list = document.getElementById(idFor(key));
    if (!list) return;
    const unique = [...new Set([...(lists[key] || []), ...(custom()[key] || [])].map(value => value.trim()).filter(Boolean))];
    list.replaceChildren(...unique.map(value => {
      const option = document.createElement('option');
      option.value = value;
      return option;
    }));
  };

  const ensureList = key => {
    let list = document.getElementById(idFor(key));
    if (!list) {
      list = document.createElement('datalist');
      list.id = idFor(key);
      document.body.appendChild(list);
    }
    refreshList(key);
    return list.id;
  };

  const enhance = (input, key) => {
    if (!input) return;
    input.setAttribute('list', ensureList(key));
    if (input.dataset.resumeSuggestionReady === 'true') return;
    input.dataset.resumeSuggestionReady = 'true';
    input.addEventListener('change', () => saveCustom(key, input.value));
    input.addEventListener('blur', () => saveCustom(key, input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') saveCustom(key, input.value);
    });
  };

  const enhanceDynamicFields = () => {
    document.querySelectorAll('#guardianList .g-rel').forEach(input => enhance(input, 'guardian'));
    document.querySelectorAll('#languagesList .lang-name').forEach(input => enhance(input, 'language'));
    document.querySelectorAll('#educationList .edu-degree').forEach(input => enhance(input, 'education'));
    document.querySelectorAll('#experienceList .exp-title').forEach(input => enhance(input, 'job'));
  };

  const setup = () => {
    const marital = document.querySelector('input[data-preview="prev-marital"]');
    const nationality = document.querySelector('input[data-preview="prev-nationality"]');
    const skills = document.getElementById('skills');
    const hobbies = document.getElementById('hobbies');

    enhance(marital, 'marital');
    enhance(nationality, 'country');
    enhance(skills, 'skill');
    enhance(hobbies, 'hobby');
    enhanceDynamicFields();

    if (nationality && !nationality.value.trim()) {
      nationality.value = 'India';
      nationality.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const countryLabel = nationality?.closest('.form-group')?.querySelector('label');
    if (countryLabel) countryLabel.textContent = 'Country / Nationality';
  };

  // New repeatable rows get the same editable suggestion lists.
  ['addGuardian', 'addLanguage', 'addEducation', 'addExperience'].forEach(name => {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      const result = original.apply(this, args);
      requestAnimationFrame(enhanceDynamicFields);
      return result;
    };
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();


// Legacy perspective-crop override removed. Resume Builder now uses the PSC-aligned Rect Crop Dialog in index.html.

// Profile photo shape and position controls for Resume Builder preview.
(() => {
  const setupProfilePhotoControls = () => {
    const shape = document.getElementById('profilePhotoShape');
    const photo = document.getElementById('prev-photo');
    const wrap = document.getElementById('wrap-photo');
    if (!shape || !photo || !wrap || shape.dataset.ready) return;
    shape.dataset.ready = 'true';
    let dragging = false, startX = 0, startY = 0, startPosX = 50, startPosY = 50;
    const clamp = (v) => Math.max(0, Math.min(100, v));
    const applyShape = () => {
      const isCircle = shape.value === 'circle';
      photo.style.width = isCircle ? '150px' : '113px';
      photo.style.height = isCircle ? '150px' : '151px';
      photo.style.aspectRatio = isCircle ? '1 / 1' : '3 / 4';
      photo.style.borderRadius = isCircle ? '50%' : '4px';
      photo.style.objectFit = 'cover';
      photo.style.objectPosition = photo.dataset.position || '50% 50%';
      photo.style.display = 'block';
      photo.style.marginLeft = 'auto';
      photo.style.marginRight = 'auto';
      photo.style.cursor = photo.getAttribute('src') ? 'move' : 'default';
      photo.title = 'Drag to reposition photo';
      wrap.style.display = photo.getAttribute('src') ? 'flex' : 'none';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.justifyContent = 'center';
      wrap.style.width = '100%';
      wrap.style.boxSizing = 'border-box';
    };
    const readPosition = () => {
      const parts = (photo.dataset.position || '50% 50%').split(/\\s+/);
      return [parseFloat(parts[0]) || 50, parseFloat(parts[1]) || 50];
    };
    shape.addEventListener('change', applyShape);
    photo.addEventListener('pointerdown', e => {
      if (!photo.getAttribute('src')) return;
      dragging = true; startX = e.clientX; startY = e.clientY;
      [startPosX, startPosY] = readPosition();
      photo.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    photo.addEventListener('pointermove', e => {
      if (!dragging) return;
      const rect = photo.getBoundingClientRect();
      const x = clamp(startPosX - ((e.clientX - startX) / Math.max(1, rect.width)) * 100);
      const y = clamp(startPosY - ((e.clientY - startY) / Math.max(1, rect.height)) * 100);
      photo.dataset.position = x + '% ' + y + '%';
      photo.style.objectPosition = photo.dataset.position;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => photo.addEventListener(name, () => { dragging = false; }));
    new MutationObserver(applyShape).observe(photo, { attributes: true, attributeFilter: ['src'] });
    applyShape();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupProfilePhotoControls);
  else setupProfilePhotoControls();
})();
