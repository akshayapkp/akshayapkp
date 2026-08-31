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
