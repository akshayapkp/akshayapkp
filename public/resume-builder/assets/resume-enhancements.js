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
    education: ['SSLC', 'Plus Two', 'Higher Secondary', 'VHSE', 'CBSE 10th', 'CBSE 12th', 'ICSE', 'ISC', 'NIOS', 'ITI', 'Diploma', 'Polytechnic Diploma', 'Bachelor Degree', 'BA', 'BCom', 'BBA', 'BSc', 'BCA', 'BEd', 'BTech', 'BE', 'LLB', 'MBBS', 'BPharm', 'BSc Nursing', 'Master Degree', 'MA', 'MCom', 'MBA', 'MSc', 'MCA', 'MEd', 'MTech', 'ME', 'LLM', 'PhD'],
    educationBoard: ['University of Kerala', 'University of Calicut', 'Mahatma Gandhi University', 'Kannur University', 'Cochin University of Science and Technology (CUSAT)', 'APJ Abdul Kalam Technological University (KTU)', 'Kerala University of Health Sciences (KUHS)', 'Kerala Agricultural University', 'Sree Sankaracharya University of Sanskrit', 'Thunchath Ezhuthachan Malayalam University', 'National University of Advanced Legal Studies (NUALS)', 'Indira Gandhi National Open University (IGNOU)', 'University of Madras', 'Bharathiar University', 'Kerala Board of Public Examinations', 'Directorate of Higher Secondary Education (DHSE), Kerala', 'Vocational Higher Secondary Education (VHSE), Kerala', 'Kerala State Board', 'Central Board of Secondary Education (CBSE)', 'Council for the Indian School Certificate Examinations (CISCE)', 'National Institute of Open Schooling (NIOS)', 'Board of Technical Education, Kerala'],
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

  const educationDropdowns = new WeakSet();
  const educationOptions = {
    education: lists.education,
    educationBoard: lists.educationBoard
  };
  const readCustomEducation = key => {
    try {
      const all = JSON.parse(localStorage.getItem(storeKey) || '{}');
      const old = JSON.parse(localStorage.getItem('resume-builder-education-suggestions') || '{}');
      const legacy = key === 'education' ? (old.degrees || []) : (old.schools || []);
      return [...(all[key] || []), ...legacy];
    } catch { return []; }
  };
  const saveEducationOption = (key, value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    const all = custom();
    const current = all[key] || [];
    if (current.some(item => item.toLowerCase() === clean.toLowerCase()) ||
        (educationOptions[key] || []).some(item => item.toLowerCase() === clean.toLowerCase())) return;
    all[key] = [...current, clean];
    localStorage.setItem(storeKey, JSON.stringify(all));
  };
  const enhanceEducationDropdown = (input, key) => {
    if (!input || educationDropdowns.has(input)) return;
    educationDropdowns.add(input);
    input.removeAttribute('list');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('placeholder', key === 'education' ? 'Select or type qualification' : 'Select or type university / board');
    let menu = null, active = -1;
    const close = () => { if (menu) menu.remove(); menu = null; active = -1; input.setAttribute('aria-expanded', 'false'); };
    const options = () => [...new Map([...(educationOptions[key] || []), ...readCustomEducation(key)].filter(Boolean).map(v => [v.toLowerCase(), v])).values()];
    const choose = value => { input.value = value; saveEducationOption(key, value); input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('change', {bubbles:true})); close(); };
    const render = () => {
      close();
      const q = input.value.trim().toLowerCase();
      const matches = options().filter(v => !q || v.toLowerCase().includes(q)).slice(0, 80);
      menu = document.createElement('div');
      menu.setAttribute('role','listbox');
      menu.style.cssText = 'position:fixed;z-index:1000002;max-height:240px;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:5px;box-sizing:border-box;';
      const rect = input.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(Math.max(rect.width,240), window.innerWidth-16) - 8)) + 'px';
      menu.style.width = Math.min(Math.max(rect.width,240), window.innerWidth-16) + 'px';
      menu.style.top = Math.min(rect.bottom + 4, window.innerHeight - 250) + 'px';
      matches.forEach((value,index) => {
        const option=document.createElement('button'); option.type='button'; option.textContent=value;
        option.setAttribute('role','option');
        option.style.cssText='display:block;width:100%;text-align:left;border:0;background:#fff;color:#1e293b;padding:9px 11px;border-radius:7px;font:inherit;cursor:pointer;';
        option.addEventListener('mouseenter',()=>{active=index;});
        option.addEventListener('pointerdown',e=>{e.preventDefault();choose(value);});
        menu.appendChild(option);
      });
      if (q && !matches.some(v=>v.toLowerCase()===q)) {
        const add=document.createElement('button');add.type='button';add.textContent='＋ Add "'+input.value.trim()+'"';
        add.style.cssText='display:block;width:100%;text-align:left;border:0;border-top:1px solid #e2e8f0;background:#f8fafc;color:#0369a1;padding:10px 11px;border-radius:7px;font:inherit;font-weight:700;cursor:pointer;';
        add.addEventListener('pointerdown',e=>{e.preventDefault();const value=input.value.trim();saveEducationOption(key,value);choose(value);});
        menu.appendChild(add);
      }
      if (!matches.length && !q) { const empty=document.createElement('div');empty.textContent='No saved options yet. Type to add one.';empty.style.cssText='padding:10px;color:#64748b;font-size:12px;';menu.appendChild(empty); }
      document.body.appendChild(menu);
      input.setAttribute('aria-expanded','true');
    };
    input.addEventListener('focus',render);
    input.addEventListener('click',render);
    input.addEventListener('input',render);
    input.addEventListener('blur',()=>{setTimeout(()=>{if(!menu)return;const value=input.value.trim();if(value)saveEducationOption(key,value);close();},140);});
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();return;}
      if(e.key==='Enter'&&menu){e.preventDefault();const first=menu.querySelector('button');if(first)first.dispatchEvent(new Event('pointerdown',{bubbles:true}));else{saveEducationOption(key,input.value);close();}}
    });
  };

  const enhanceDynamicFields = () => {
    document.querySelectorAll('#guardianList .g-rel').forEach(input => enhance(input, 'guardian'));
    document.querySelectorAll('#languagesList .lang-name').forEach(input => enhance(input, 'language'));
    document.querySelectorAll('#educationList .edu-degree').forEach(input => enhanceEducationDropdown(input, 'education'));
    document.querySelectorAll('#educationList .edu-school').forEach(input => enhanceEducationDropdown(input, 'educationBoard'));
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
