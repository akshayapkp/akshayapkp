// Expose dynamic generator functions globally before DOM parsing completes
window.addContact = function() {
    const container = document.getElementById('contactList');
    if (!container) return;
    const html = `
        <div class="dynamic-item" style="flex-direction: row; gap: 0.5rem; align-items: center; padding: 0.8rem; flex-wrap: wrap;">
            <button class="remove-btn" type="button" style="top: 0.8rem;" onclick="this.parentElement.remove(); updateDynamicPreview('contact')"><i class="fas fa-trash"></i></button>
            <select class="contact-type" onchange="updateDynamicPreview('contact')" style="padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px;">
                <option value="fas fa-phone">Mobile</option>
                <option value="fab fa-whatsapp">WhatsApp</option>
            </select>
            <div class="phone-input-group" style="flex-grow: 1;">
                <span class="phone-prefix">+91</span>
                <input type="tel" class="contact-num" maxlength="10" inputmode="numeric" placeholder="98765 43210" oninput="validateIndianMobile(this); updateDynamicPreview('contact')" style="flex-grow: 1; padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 4px;">
            </div>
            <span class="field-error contact-error" style="display:none; width:100%;"></span>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('contact');
};

window.addGuardian = function() {
    const container = document.getElementById('guardianList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('guardian')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="g-rel" placeholder="Relationship (e.g. Father)" oninput="updateDynamicPreview('guardian')">
                <input type="text" class="g-name" placeholder="Name" oninput="updateDynamicPreview('guardian')">
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('guardian');
};

window.addIDCard = function() {
    const container = document.getElementById('idCardsList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('idcard')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="id-type" placeholder="ID Name (e.g. Passport)" oninput="updateDynamicPreview('idcard')">
                <input type="text" class="id-number" placeholder="ID Number" oninput="updateDynamicPreview('idcard')">
                <input type="text" class="id-expiry" placeholder="Expiry Date (e.g. 12/2030)" style="grid-column: span 2;" oninput="updateDynamicPreview('idcard')">
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('idcard');
};

window.addEducation = function() {
    const container = document.getElementById('educationList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('edu')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="edu-degree" placeholder="Degree / Qualification" oninput="updateDynamicPreview('edu')">
                <input type="text" class="edu-school" placeholder="University / Board" oninput="updateDynamicPreview('edu')">
                <input type="text" class="edu-date" placeholder="e.g. 2016 - 2020" style="grid-column: span 2;" oninput="updateDynamicPreview('edu')">
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('edu');
};

window.addExperience = function() {
    const container = document.getElementById('experienceList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('exp')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="exp-title" placeholder="Job Title" oninput="updateDynamicPreview('exp')">
                <input type="text" class="exp-company" placeholder="Company Name" oninput="updateDynamicPreview('exp')">
                <input type="text" class="exp-date" placeholder="e.g. 2020 - Present" style="grid-column: span 2;" oninput="updateDynamicPreview('exp')">
                <textarea class="exp-desc" placeholder="Responsibilities & Achievements..." rows="3" style="grid-column: span 2;" oninput="updateDynamicPreview('exp')"></textarea>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('exp');
};

window.addProject = function() {
    const container = document.getElementById('projectsList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('proj')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="proj-name" placeholder="Project Name" oninput="updateDynamicPreview('proj')">
                <input type="text" class="proj-tech" placeholder="Tech Used (e.g. React)" oninput="updateDynamicPreview('proj')">
                <textarea class="proj-desc" placeholder="Project Description..." rows="2" style="grid-column: span 2;" oninput="updateDynamicPreview('proj')"></textarea>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('proj');
};

window.addLanguage = function() {
    const container = document.getElementById('languagesList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('lang')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="lang-name" placeholder="Language (e.g. English)" oninput="updateDynamicPreview('lang')">
                <select class="lang-prof" onchange="updateDynamicPreview('lang')">
                    <option value="5">Native (5 Stars)</option>
                    <option value="4">Fluent (4 Stars)</option>
                    <option value="3">Intermediate (3 Stars)</option>
                    <option value="2">Basic (2 Stars)</option>
                    <option value="1">Beginner (1 Star)</option>
                </select>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('lang');
};

window.addReference = function() {
    const container = document.getElementById('referencesList');
    if (!container) return;
    const html = `
        <div class="dynamic-item">
            <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('ref')"><i class="fas fa-trash"></i></button>
            <div class="form-grid">
                <input type="text" class="ref-name" placeholder="Reference Name" oninput="updateDynamicPreview('ref')">
                <input type="text" class="ref-desig" placeholder="Designation" oninput="updateDynamicPreview('ref')">
                <input type="text" class="ref-comp" placeholder="Company Name" style="grid-column: span 2;" oninput="updateDynamicPreview('ref')">
                <input type="text" class="ref-mob" placeholder="Mobile No" oninput="updateDynamicPreview('ref')">
                <input type="email" class="ref-email" placeholder="Email ID" oninput="updateDynamicPreview('ref')">
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    updateDynamicPreview('ref');
};

window.validateEmailField = function(input) {
    if (!input) return true;
    const val = input.value.trim();
    const errorEl = document.getElementById('err-email');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!val) {
        input.classList.remove('invalid');
        if (errorEl) errorEl.style.display = 'none';
        return true;
    }
    if (!emailPattern.test(val)) {
        input.classList.add('invalid');
        if (errorEl) { errorEl.textContent = 'Enter a valid email address'; errorEl.style.display = 'block'; }
        return false;
    }
    input.classList.remove('invalid');
    if (errorEl) errorEl.style.display = 'none';
    return true;
};

window.validateIndianMobile = function(input) {
    if (!input) return true;
    let digits = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digits;

    const wrapper = input.closest('.dynamic-item');
    const errorEl = wrapper ? wrapper.querySelector('.contact-error') : null;
    const isValid = /^[6-9]\d{9}$/.test(digits);

    if (!digits) {
        input.classList.remove('invalid');
        if (errorEl) errorEl.style.display = 'none';
    } else if (!isValid) {
        input.classList.add('invalid');
        if (errorEl) {
            errorEl.textContent = digits.length < 10
                ? 'Enter a 10-digit mobile number'
                : 'Must start with 6-9 (valid Indian mobile number)';
            errorEl.style.display = 'block';
        }
    } else {
        input.classList.remove('invalid');
        if (errorEl) errorEl.style.display = 'none';
    }
    return isValid;
};

window.updateDynamicPreview = function(type) {
    let html = '', targetId;

    if (type === 'contact') {
        const items = document.querySelectorAll('#contactList .dynamic-item');
        targetId = 'prev-contact-list';
        items.forEach(item => {
            const icon = item.querySelector('.contact-type')?.value || 'fas fa-phone';
            const num = item.querySelector('.contact-num')?.value.trim() || '';
            if (num) {
                html += `<p style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 8px;"><i class="${icon}"></i> <span>+91 ${num}</span></p>`;
            }
        });
    }
    else if (type === 'guardian') {
        const items = document.querySelectorAll('#guardianList .dynamic-item');
        targetId = 'prev-guardian-list';
        items.forEach(item => {
            const rel = item.querySelector('.g-rel')?.value.trim() || '';
            const name = item.querySelector('.g-name')?.value.trim() || '';
            if (rel || name) {
                html += `<p class="guardian-preview-item" style="margin-bottom:0;"><strong>${rel ? rel + ':' : 'Guardian:'}</strong> <span>${name}</span></p>`;
            }
        });
        const detailsContainer = document.getElementById('personal-details-block');
        if (detailsContainer) {
            detailsContainer.style.display = (html || detailsContainer.innerText.trim().length > 0) ? '' : 'none';
        }
    }
    else if (type === 'idcard') {
        const items = document.querySelectorAll('#idCardsList .dynamic-item');
        targetId = 'prev-idcards-list';
        items.forEach(item => {
            const idType = item.querySelector('.id-type')?.value.trim() || '';
            const num = item.querySelector('.id-number')?.value.trim() || '';
            const exp = item.querySelector('.id-expiry')?.value.trim() || '';

            if (idType || num || exp) {
                html += `
                    <div class="item-block" style="background: rgba(100,100,100,0.1); padding: 8px; border-radius: 4px; font-size: 0.85rem;">
                        ${idType ? `<strong>${idType}</strong><br>` : ''}
                        ${num ? `No: ${num}<br>` : ''}
                        ${exp ? `Exp: ${exp}` : ''}
                    </div>`;
            }
        });
        const detailsContainer = document.getElementById('personal-details-block');
        if (detailsContainer) {
            detailsContainer.style.display = (html || detailsContainer.innerText.trim().length > 0) ? '' : 'none';
        }
    }
    else if (type === 'edu') {
        const items = document.querySelectorAll('#educationList .dynamic-item');
        targetId = 'prev-education-list';
        items.forEach(item => {
            const deg = item.querySelector('.edu-degree')?.value.trim() || '';
            const school = item.querySelector('.edu-school')?.value.trim() || '';
            const date = item.querySelector('.edu-date')?.value.trim() || '';
            if (deg || school || date) {
                html += `
                    <div class="item-block">
                        <div class="item-header"><span>${deg}</span><span>${date}</span></div>
                        <div class="item-sub">${school}</div>
                    </div>`;
            }
        });
    }
    else if (type === 'exp') {
        const items = document.querySelectorAll('#experienceList .dynamic-item');
        targetId = 'prev-experience-list';
        items.forEach(item => {
            const title = item.querySelector('.exp-title')?.value.trim() || '';
            const comp = item.querySelector('.exp-company')?.value.trim() || '';
            const date = item.querySelector('.exp-date')?.value.trim() || '';
            const desc = item.querySelector('.exp-desc')?.value.trim() || '';
            if (title || comp || date || desc) {
                html += `
                    <div class="item-block">
                        <div class="item-header"><span>${title}</span><span>${date}</span></div>
                        <div class="item-sub">${comp}</div>
                        <p>${desc}</p>
                    </div>`;
            }
        });
    }
    else if (type === 'proj') {
        const items = document.querySelectorAll('#projectsList .dynamic-item');
        targetId = 'prev-projects-list';
        items.forEach(item => {
            const name = item.querySelector('.proj-name')?.value.trim() || '';
            const tech = item.querySelector('.proj-tech')?.value.trim() || '';
            const desc = item.querySelector('.proj-desc')?.value.trim() || '';
            if (name || tech || desc) {
                html += `
                    <div class="item-block">
                        <div class="item-header"><span>${name}</span><span style="font-weight: normal; font-size: 0.85rem">${tech}</span></div>
                        <p>${desc}</p>
                    </div>`;
            }
        });
    }
    else if (type === 'lang') {
        const items = document.querySelectorAll('#languagesList .dynamic-item');
        targetId = 'prev-languages-list';
        items.forEach(item => {
            const name = item.querySelector('.lang-name')?.value.trim() || '';
            const score = parseInt(item.querySelector('.lang-prof')?.value || '5', 10);
            if (name) {
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    starsHtml += (i <= score) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
                }
                html += `<div class="lang-item-preview"><span>${name}</span><div class="stars">${starsHtml}</div></div>`;
            }
        });
    }
    else if (type === 'ref') {
        const items = document.querySelectorAll('#referencesList .dynamic-item');
        targetId = 'prev-references-list';
        items.forEach(item => {
            const name = item.querySelector('.ref-name')?.value.trim() || '';
            const desig = item.querySelector('.ref-desig')?.value.trim() || '';
            const comp = item.querySelector('.ref-comp')?.value.trim() || '';
            const mob = item.querySelector('.ref-mob')?.value.trim() || '';
            const email = item.querySelector('.ref-email')?.value.trim() || '';
            if (name || desig || comp || mob || email) {
                html += `
                    <div class="item-block">
                        <div class="item-header"><span>${name}</span></div>
                        ${desig || comp ? `<div class="item-sub">${desig}${desig && comp ? ' at ' : ''}${comp}</div>` : ''}
                        <p style="font-size: 0.85rem; margin-top: 4px;">
                            ${mob ? `<i class="fas fa-phone"></i> ${mob} &nbsp;&nbsp;` : ''}
                            ${email ? `<i class="fas fa-envelope"></i> ${email}` : ''}
                        </p>
                    </div>`;
            }
        });
    }
    const targetElem = document.getElementById(targetId);
    if (targetElem) targetElem.innerHTML = html;
};

const generatedContentIndex = { summary: 0, hobbies: 0, strengths: 0, skills: 0 };
const generatedContent = {
    general: {
        summary: ['Motivated professional seeking a challenging position where I can contribute to organizational success and continue professional growth.', 'Results-oriented professional with strong communication, teamwork and problem-solving abilities.', 'Dedicated individual eager to bring reliability, adaptability and a positive attitude to a progressive organization.'],
        hobbies: ['Reading, Writing, Travelling', 'Learning new skills, Music, Community activities', 'Photography, Sports, Volunteering'],
        strengths: ['Hardworking, Positive attitude, Adaptable, Teamwork', 'Quick learner, Reliable, Organized, Problem solver', 'Leadership, Communication, Time management, Creativity'],
        skills: ['Communication, Teamwork, Problem Solving, Time Management', 'Microsoft Office, Customer Service, Organization, Adaptability', 'Planning, Documentation, Presentation, Critical Thinking']
    },
    teacher: {
        summary: ['Dedicated educator committed to fostering student development through engaging lessons and a supportive classroom environment.', 'Passionate teacher skilled in classroom management, lesson planning and student assessment.', 'Creative education professional focused on inclusive learning and measurable student progress.'],
        hobbies: ['Drawing, Painting, Reading, Story Telling', 'Public Speaking, Music, Educational activities', 'Writing, Travelling, Community service'],
        strengths: ['Patient with students, Classroom management, Honest and punctual, Adaptable', 'Creative teaching, Communication, Leadership, Motivating', 'Empathy, Planning, Organization, Continuous learning'],
        skills: ['Classroom Management, Lesson Planning, Student Assessment, Communication', 'Presentation, Leadership, Curriculum Planning, Microsoft Office', 'Child Development, Public Speaking, Educational Technology, Teamwork']
    },
    sales: {
        summary: ['Hardworking sales professional focused on achieving targets, supporting customers and contributing to business growth.', 'Customer-focused sales executive with strong communication and product knowledge.', 'Target-oriented professional experienced in building relationships and converting opportunities into results.'],
        hobbies: ['Reading, Networking, Travelling', 'Craft Work, Writing, Sports', 'Music, Public Speaking, Social activities'],
        strengths: ['Customer-focused, Persuasive communication, Target-oriented, Confident', 'Negotiation, Relationship building, Energetic, Resilient', 'Positive attitude, Listening, Product knowledge, Teamwork'],
        skills: ['Customer Service, Sales, Communication, Teamwork, Product Knowledge', 'Retail Operations, Negotiation, Lead Generation, CRM, Target Achievement', 'Visual Merchandising, Billing, Relationship Management, Presentation']
    },
    medical: {
        summary: ['Committed healthcare professional dedicated to quality patient care, accurate procedures and continuous learning.', 'Responsible medical professional with a patient-first approach and strong clinical support skills.', 'Detail-oriented healthcare worker committed to safety, compassion and reliable clinical service.'],
        hobbies: ['Reading, Community Service, Writing', 'Craft Work, Health awareness, Music', 'Volunteering, Travelling, Learning'],
        strengths: ['Patient care, Attention to detail, Calm under pressure, Responsible', 'Empathy, Discipline, Observation, Teamwork', 'Compassionate, Safety-conscious, Reliable, Quick learner'],
        skills: ['Laboratory Assistance, Sample Handling, ECG, Nebulization, IV', 'Patient Care, Vital Monitoring, Medical Records, Reception', 'First Aid, Infection Control, Healthcare Communication, Teamwork']
    },
    accountant: {
        summary: ['Detail-oriented accounting professional seeking to apply accounting knowledge, financial software skills and organizational ability.', 'Analytical finance professional committed to accurate records, timely reporting and responsible financial operations.', 'Organized accountant with strong numerical ability and a focus on compliance and business support.'],
        hobbies: ['Reading, Writing, Learning finance', 'Travelling, Music, Volunteering', 'Technology, Research, Community activities'],
        strengths: ['Numerical accuracy, Integrity, Time management, Analytical thinking', 'Attention to detail, Organization, Confidentiality, Problem solving', 'Planning, Responsibility, Communication, Decision making'],
        skills: ['Accounting, Team Leadership, Communication, Negotiation, Management', 'Tally, SAP Finance, Excel, Bookkeeping, GST, Financial Reporting', 'Accounts Payable, Accounts Receivable, Reconciliation, Auditing']
    },
    mechanical: {
        summary: ['Certified mechanical QA/QC and NDT professional committed to precision, safety and reliable inspection results.', 'Safety-focused mechanical professional experienced in inspection, testing and quality documentation.', 'Detail-oriented NDT technician dedicated to standards, accuracy and continuous technical learning.'],
        hobbies: ['Reading, Technical learning, Travelling', 'Safety awareness, Sports, Photography', 'Research, Volunteering, Fitness'],
        strengths: ['Safety-conscious, Quality-focused, Problem solving, Discipline', 'Attention to detail, Technical aptitude, Team collaboration, Reliability', 'Inspection mindset, Documentation, Patience, Continuous learning'],
        skills: ['QA/QC Mechanical, Ultrasonic Testing, Radiographic Testing', 'Magnetic Particle Testing, Welding Inspection, HSE Management', 'Visual Inspection, Documentation, Safety Standards, Quality Control']
    }
};

window.generateResumeContent = function(type) {
    const category = document.getElementById('resumeCategory')?.value || 'general';
    const options = generatedContent[category]?.[type];
    if (options?.length) {
        const index = generatedContentIndex[type] % options.length;
        generatedContentIndex[type] += 1;
        const field = document.querySelector({ summary: '#summaryInput', hobbies: '#hobbies', strengths: '#strengths', skills: '#skills' }[type]);
        if (field) {
            field.value = options[index];
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            const toggle = document.querySelector(`[data-toggle="prev-${type === 'summary' ? 'summary' : `${type}-container`}"]`);
            if (toggle && !toggle.checked) { toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        return;
    }
    const content = {
        general: {
            summary: 'Motivated professional seeking a challenging position where I can use my skills, contribute to organizational success and continue professional growth.',
            hobbies: 'Reading, Writing, Travelling, Learning new skills',
            strengths: 'Hardworking, Positive attitude, Adaptable, Teamwork'
        },
        teacher: {
            summary: 'Dedicated and passionate educator committed to fostering student development in a nurturing and inclusive classroom environment. Skilled in communication, classroom management and lesson planning.',
            hobbies: 'Drawing, Painting, Reading, Story Telling, Public Speaking',
            strengths: 'Patient with students, Classroom management, Honest and punctual, Adaptable, Motivating'
        },
        sales: {
            summary: 'Hardworking sales professional focused on achieving targets, supporting customers and contributing to business growth through strong communication and product knowledge.',
            hobbies: 'Reading, Craft Work, Writing, Networking',
            strengths: 'Customer-focused, Persuasive communication, Target-oriented, Confident, Teamwork'
        },
        medical: {
            summary: 'Committed healthcare professional dedicated to quality patient care, accurate procedures and continuous learning in a clinical environment.',
            hobbies: 'Reading, Craft Work, Writing, Community Service',
            strengths: 'Patient care, Attention to detail, Calm under pressure, Responsible, Teamwork'
        },
        accountant: {
            summary: 'Detail-oriented accounting professional seeking to apply accounting knowledge, financial software skills and organizational ability in a growth-focused company.',
            hobbies: 'Reading, Writing, Learning finance, Travelling',
            strengths: 'Numerical accuracy, Integrity, Time management, Analytical thinking, Responsible'
        },
        mechanical: {
            summary: 'Certified mechanical QA/QC and NDT professional committed to precision, safety and reliable inspection results across industrial projects.',
            hobbies: 'Reading, Technical learning, Safety awareness, Travelling',
            strengths: 'Safety-conscious, Quality-focused, Problem solving, Discipline, Team collaboration'
        }
    }[category] || null;
    if (!content) return;
    const fieldMap = { summary: '#summaryInput', hobbies: '#hobbies', strengths: '#strengths' };
    const field = document.querySelector(fieldMap[type]);
    if (!field) return;
    field.value = content[type];
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    const toggle = document.querySelector(`[data-toggle="prev-${type === 'summary' ? 'summary' : `${type}-container`}"]`) || document.querySelector(`[data-toggle="prev-${type}-container"]`);
    if (toggle && !toggle.checked) { toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
};

window.fillResumeLanguages = function() {
    const category = document.getElementById('resumeCategory')?.value || 'general';
    const languages = {
        general: [['English', '5'], ['Malayalam', '5']],
        teacher: [['English', '5'], ['Malayalam', '5'], ['Hindi', '3'], ['Arabic', '3']],
        sales: [['English', '5'], ['Hindi', '3'], ['Malayalam', '5']],
        medical: [['English', '5'], ['Malayalam', '5']],
        accountant: [['English', '5'], ['Malayalam', '5'], ['Arabic', '3']],
        mechanical: [['English', '5'], ['Malayalam', '5'], ['Hindi', '3'], ['Tamil', '3']]
    }[category] || [];
    const list = document.getElementById('languagesList');
    if (!list || !languages.length) return;
    list.innerHTML = languages.map(([name, level]) => `<div class="dynamic-item">
        <button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('lang')"><i class="fas fa-trash"></i></button>
        <div class="form-grid">
            <input type="text" class="lang-name" value="${name}" placeholder="Language (e.g. English)" oninput="updateDynamicPreview('lang')">
            <select class="lang-prof" onchange="updateDynamicPreview('lang')">
                <option value="5" ${level === '5' ? 'selected' : ''}>Native (5 Stars)</option>
                <option value="4" ${level === '4' ? 'selected' : ''}>Fluent (4 Stars)</option>
                <option value="3" ${level === '3' ? 'selected' : ''}>Intermediate (3 Stars)</option>
                <option value="2" ${level === '2' ? 'selected' : ''}>Basic (2 Stars)</option>
                <option value="1" ${level === '1' ? 'selected' : ''}>Beginner (1 Star)</option>
            </select>
        </div>
    </div>`).join('');
    const toggle = document.querySelector('[data-toggle="prev-languages-container"]');
    if (toggle && !toggle.checked) { toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
    updateDynamicPreview('lang');
};

const categoryDetailPresets = {
    general: {
        education: [{ degree: 'Higher Secondary', school: 'State Board', date: '' }],
        experience: [{ title: 'Professional', company: '', date: '', desc: '' }],
        projects: []
    },
    teacher: {
        education: [
            { degree: 'Secondary School Leaving Certificate (SSLC)', school: 'Kerala Public Examination Board', date: '' },
            { degree: 'Higher Secondary (HSE)', school: '', date: '' },
            { degree: 'Diploma in Montessori Training (MTTC)', school: '', date: '' }
        ],
        experience: [{ title: 'Primary Teacher', company: '', date: '', desc: 'Planned lessons, supported student development and maintained a positive classroom environment.' }],
        projects: []
    },
    sales: {
        education: [{ degree: 'SSLC', school: '', date: '' }, { degree: 'PLUS TWO', school: '', date: '' }],
        experience: [{ title: 'Salesman', company: 'Bharath Super Market', date: '6 Year', desc: 'Supported customers, maintained product displays and contributed to sales targets.' }],
        projects: []
    },
    medical: {
        education: [
            { degree: 'Diploma in Medical Laboratory', school: 'Jain University', date: '2023' },
            { degree: 'PLUS TWO', school: 'Kerala Board of Higher Secondary Examination', date: '2020' },
            { degree: 'S.S.L.C', school: 'Board of Public Examinations, Kerala', date: '2018' }
        ],
        experience: [
            { title: 'Lab Assistant Trainee', company: 'Venniyur GHC, Malappuram', date: '6 Month', desc: '' },
            { title: 'Lab Assistant Technician', company: 'Family Medical Center, Pookiparamba, Malappuram', date: '1 Year', desc: '' }
        ],
        projects: []
    },
    accountant: {
        education: [
            { degree: 'S.S.L.C', school: 'N I O S', date: '2017' },
            { degree: 'PLUSTWO', school: 'N I O S', date: '2021' },
            { degree: 'PG Diploma in Indian and Foreign Accounting', school: 'ITPC Campus, Kottakkal', date: '2024' },
            { degree: 'TALLY ESSENTIAL LEVEL-1', school: 'ITPC Campus, Kottakkal', date: '2024' },
            { degree: 'SAP S/4HANA Finance & Controlling', school: 'ITPC Campus, Kottakkal', date: '2024' }
        ],
        experience: [{ title: 'Accountant & Manager', company: 'V G R Rent House', date: '6 month', desc: 'Managed accounting records, customer coordination and daily financial operations.' }],
        projects: []
    },
    mechanical: {
        education: [
            { degree: 'S.S.L.C', school: 'Kerala Board Of Public Examinations', date: '2022' },
            { degree: 'PLUSTWO', school: 'Kerala Board Of Higher Secondary Examinations', date: '2025' },
            { degree: 'Diploma in Fire and Safety Engineering', school: 'Knowit Education', date: '2026' }
        ],
        experience: [{ title: 'QA/QC Mechanical / NDT Professional', company: '', date: '', desc: 'Performed inspection and testing activities while following safety and quality standards.' }],
        projects: [{ name: 'Industrial Visit: Fire Station, Tirur', tech: 'Fire Safety', desc: 'Gained exposure to emergency response protocols and fire safety equipment handling.' }]
    }
};

function applyCategoryDetailPreset(category) {
    const preset = categoryDetailPresets[category];
    if (!preset) return;
    const education = document.getElementById('educationList');
    const experience = document.getElementById('experienceList');
    const projects = document.getElementById('projectsList');
    if (education) education.innerHTML = preset.education.map(item => `<div class="dynamic-item"><button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('edu')"><i class="fas fa-trash"></i></button><div class="form-grid"><input type="text" class="edu-degree" value="${item.degree}" placeholder="Degree / Qualification" oninput="updateDynamicPreview('edu')"><input type="text" class="edu-school" value="${item.school}" placeholder="University / Board" oninput="updateDynamicPreview('edu')"><input type="text" class="edu-date" value="${item.date}" placeholder="e.g. 2016 - 2020" style="grid-column: span 2;" oninput="updateDynamicPreview('edu')"></div></div>`).join('');
    if (experience) experience.innerHTML = preset.experience.map(item => `<div class="dynamic-item"><button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('exp')"><i class="fas fa-trash"></i></button><div class="form-grid"><input type="text" class="exp-title" value="${item.title}" placeholder="Job Title" oninput="updateDynamicPreview('exp')"><input type="text" class="exp-company" value="${item.company}" placeholder="Company Name" oninput="updateDynamicPreview('exp')"><input type="text" class="exp-date" value="${item.date}" placeholder="e.g. 2020 - Present" style="grid-column: span 2;" oninput="updateDynamicPreview('exp')"><textarea class="exp-desc" placeholder="Responsibilities & Achievements..." rows="3" style="grid-column: span 2;" oninput="updateDynamicPreview('exp')">${item.desc}</textarea></div></div>`).join('');
    if (projects) projects.innerHTML = (preset.projects || []).map(item => `<div class="dynamic-item"><button class="remove-btn" type="button" onclick="this.parentElement.remove(); updateDynamicPreview('proj')"><i class="fas fa-trash"></i></button><div class="form-grid"><input type="text" class="proj-name" value="${item.name}" placeholder="Project Name" oninput="updateDynamicPreview('proj')"><input type="text" class="proj-tech" value="${item.tech}" placeholder="Tech Used" oninput="updateDynamicPreview('proj')"><textarea class="proj-desc" placeholder="Project Description..." rows="2" style="grid-column: span 2;" oninput="updateDynamicPreview('proj')">${item.desc}</textarea></div></div>`).join('');
    updateDynamicPreview('edu');
    updateDynamicPreview('exp');
    updateDynamicPreview('proj');
}

window.applyResumeCategory = function() {
    const category = document.getElementById('resumeCategory')?.value || 'general';
    const presets = {
        general: {
            title: 'Professional',
            summary: 'Motivated professional seeking a challenging position where I can use my skills, contribute to organizational success and continue professional growth.',
            skills: 'Communication, Teamwork, Problem Solving, Time Management',
            hobbies: 'Reading, Writing'
        },
        teacher: {
            title: 'Teacher',
            summary: 'Dedicated and passionate educator committed to fostering student development in a nurturing and inclusive classroom environment. Skilled in communication, classroom management and lesson planning.',
            skills: 'Classroom Management, Lesson Planning, Student Assessment, Communication, Presentation, Leadership',
            hobbies: 'Drawing, Painting, Reading, Speaking, Story Telling'
        },
        sales: {
            title: 'Sales Professional',
            summary: 'Hardworking sales professional with customer service and retail experience, focused on achieving targets, supporting customers and contributing to business growth.',
            skills: 'Customer Service, Sales, Communication, Teamwork, Product Knowledge, Time Management',
            hobbies: 'Reading, Craft Work, Writing'
        },
        medical: {
            title: 'Medical Laboratory Technician',
            summary: 'Committed healthcare professional seeking a position in a forward-looking hospital where I can apply my technical knowledge, practical skills and dedication to quality patient care.',
            skills: 'Laboratory Assistance, Sample Handling, ECG, Nebulization, IV, Pulse Monitoring, Reception',
            hobbies: 'Reading, Craft Work, Writing'
        },
        accountant: {
            title: 'Accountant / Manager',
            summary: 'To obtain a challenging position in a forward-looking company where I can utilize my accounting skills and abilities while contributing to organizational success and professional growth.',
            skills: 'Accounting, Team Leadership, Communication, Negotiation, Management, Tally, SAP Finance',
            hobbies: 'Reading, Writing'
        },
        mechanical: {
            title: 'QA/QC Mechanical / NDT Professional',
            summary: 'Certified NDT professional with a strong foundation in material testing and inspection techniques, committed to precision, safety and continuous learning.',
            skills: 'QA/QC Mechanical, Ultrasonic Testing, Radiographic Testing, Magnetic Particle Testing, Welding Inspection, HSE Management',
            hobbies: 'Reading'
        }
    }[category];
    if (!presets) return;
    const setValue = (selector, value) => {
        const field = document.querySelector(selector);
        if (!field) return;
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue('input[data-preview="prev-title"], textarea[data-preview="prev-title"]', presets.title);
    setValue('#summaryInput', presets.summary);
    setValue('#skills', presets.skills);
    setValue('#hobbies', presets.hobbies);
    const strengthsByCategory = {
        general: 'Hardworking, Positive attitude, Adaptable, Teamwork',
        teacher: 'Patient with students, Honest and punctual, Adaptable, Motivating',
        sales: 'Customer-focused, Persuasive communication, Target-oriented, Confident',
        medical: 'Patient care, Attention to detail, Calm under pressure, Responsible',
        accountant: 'Numerical accuracy, Integrity, Time management, Analytical thinking',
        mechanical: 'Safety-conscious, Quality-focused, Problem solving, Discipline'
    };
    setValue('#strengths', strengthsByCategory[category] || strengthsByCategory.general);
    window.fillResumeLanguages();
    applyCategoryDetailPreset(category);
    ['prev-summary-container', 'prev-skills-container', 'prev-hobbies-container', 'prev-strengths-container', 'prev-languages-container', 'prev-education-container', 'prev-experience-container', 'prev-projects-container'].forEach((id) => {
        const toggle = document.querySelector(`[data-toggle="${id}"]`);
        if (toggle && !toggle.checked) { toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
    });
};

const EDUCATION_SUGGESTIONS_KEY = 'resume-builder-education-suggestions';
function readEducationSuggestions() {
    try { return JSON.parse(localStorage.getItem(EDUCATION_SUGGESTIONS_KEY) || '{"degrees":[],"schools":[]}'); } catch { return { degrees: [], schools: [] }; }
}
function renderEducationSuggestions() {
    const container = document.getElementById('educationSavedSuggestions');
    if (!container) return;
    const saved = readEducationSuggestions();
    const values = [...saved.degrees.map(value => `Degree: ${value}`), ...saved.schools.map(value => `Board: ${value}`)];
    container.innerHTML = values.map(label => `<span class="saved-suggestion">${label}<button type="button" aria-label="Delete saved education suggestion" onclick="window.deleteEducationSuggestion('${label.replace(/^(Degree: |Board: )/, '').replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button></span>`).join('');
}
window.deleteEducationSuggestion = function(value) {
    const saved = readEducationSuggestions();
    saved.degrees = saved.degrees.filter(item => item !== value);
    saved.schools = saved.schools.filter(item => item !== value);
    localStorage.setItem(EDUCATION_SUGGESTIONS_KEY, JSON.stringify(saved));
    renderEducationSuggestions();
};
function saveEducationSuggestions() {
    const saved = readEducationSuggestions();
    document.querySelectorAll('.edu-degree').forEach(field => { const value = field.value.trim(); if (value && !saved.degrees.includes(value)) saved.degrees.push(value); });
    document.querySelectorAll('.edu-school').forEach(field => { const value = field.value.trim(); if (value && !saved.schools.includes(value)) saved.schools.push(value); });
    localStorage.setItem(EDUCATION_SUGGESTIONS_KEY, JSON.stringify(saved));
    renderEducationSuggestions();
}

document.addEventListener('DOMContentLoaded', () => {
    renderEducationSuggestions();
    const categorySelect = document.getElementById('resumeCategory');
    const categoryButton = document.getElementById('resumeCategoryAutoFill');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            window.fillResumeLanguages();
            categoryButton?.focus();
        });
    }
    document.addEventListener('blur', (event) => {
        if (event.target.matches?.('.edu-degree, .edu-school')) saveEducationSuggestions();
    }, true);

    let currentResumeId = null;

    const updatePreview = (e) => {
        if (!e || !e.target) return;
        const val = e.target.value.trim();
        const targetId = e.target.getAttribute('data-preview');

        if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.textContent = val;

            const prevName = document.getElementById('prev-name');
            if (targetId === 'prev-name' && prevName) prevName.style.display = val ? 'block' : 'none';

            const prevTitle = document.getElementById('prev-title');
            if (targetId === 'prev-title' && prevTitle) prevTitle.style.display = val ? 'block' : 'none';

            const wrapAddress = document.getElementById('wrap-address');
            if (targetId === 'prev-address' && wrapAddress) wrapAddress.style.display = val ? 'flex' : 'none';

            const wrapEmail = document.getElementById('wrap-email');
            if (targetId === 'prev-email' && wrapEmail) {
                wrapEmail.style.display = val ? 'flex' : 'none';
                validateEmailField(e.target);
            }
        }

        if (['skills', 'hobbies'].includes(e.target.id)) {
            const containerList = document.getElementById(`prev-${e.target.id}-list`);
            const containerBlock = document.getElementById(`prev-${e.target.id}-container`);
            if (val && containerList && containerBlock) {
                const items = val.split(',').map(i => i.trim()).filter(Boolean);
                containerList.innerHTML = items.map(item => `<span>${item}</span>`).join('');
                containerBlock.style.display = 'block';
            } else if (containerBlock) {
                containerBlock.style.display = 'none';
            }
        }

        const gender = document.getElementById('genderSelect')?.value || '';
        const marital = document.querySelector('input[data-preview="prev-marital"]')?.value.trim() || '';
        const nationality = document.querySelector('input[data-preview="prev-nationality"]')?.value.trim() || '';
        const idCardsExist = document.querySelectorAll('#idCardsList .dynamic-item').length > 0;
        const guardiansExist = document.querySelectorAll('#guardianList .dynamic-item').length > 0;

        const wrapGender = document.getElementById('wrap-gender');
        if (wrapGender) wrapGender.style.display = gender ? 'flex' : 'none';

        const wrapMarital = document.getElementById('wrap-marital');
        if (wrapMarital) wrapMarital.style.display = marital ? 'flex' : 'none';

        const wrapNationality = document.getElementById('wrap-nationality');
        if (wrapNationality) wrapNationality.style.display = nationality ? 'flex' : 'none';

        const detailsContainer = document.getElementById('personal-details-block');
        if (detailsContainer) {
            if (gender || marital || nationality || idCardsExist || guardiansExist) {
                detailsContainer.style.display = '';
            } else {
                detailsContainer.style.display = 'none';
            }
        }
    };

    document.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    const dateInput = document.getElementById('dateInput');
    if (dateInput) {
        dateInput.addEventListener('change', (e) => {
            const val = e.target.value;
            const prevDate = document.getElementById('prev-date');
            const wrapDate = document.getElementById('wrap-date');
            if (prevDate) prevDate.textContent = val;
            if (wrapDate) wrapDate.style.display = val ? 'block' : 'none';
        });
    }

    let cropper;
    const photoInput = document.getElementById('photoInput');
    const modal = document.getElementById('cropperModal');
    const imageToCrop = document.getElementById('imageToCrop');

    if (photoInput && modal && imageToCrop) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    imageToCrop.src = event.target.result;
                    modal.style.display = 'flex';
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1 });
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('cancelCrop')?.addEventListener('click', () => {
            modal.style.display = 'none';
            photoInput.value = '';
        });

        document.getElementById('applyCrop')?.addEventListener('click', () => {
            if (cropper) {
                const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
                const prevPhoto = document.getElementById('prev-photo');
                const wrapPhoto = document.getElementById('wrap-photo');
                if (prevPhoto && wrapPhoto) {
                    prevPhoto.src = canvas.toDataURL('image/jpeg', 0.92);
                    wrapPhoto.style.display = 'block';
                }
            }
            modal.style.display = 'none';
        });
    }

    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const targetContainerId = e.target.getAttribute('data-toggle');
            const container = document.getElementById(targetContainerId);
            const textSpan = e.target.parentElement.querySelector('.toggle-text');

            if (container) container.style.display = e.target.checked ? 'block' : 'none';
            if (textSpan) textSpan.textContent = e.target.checked ? 'Enabled' : 'Disabled';
        });
        toggle.dispatchEvent(new Event('change'));
    });

    const bioForm = document.getElementById('bioDataForm');
    if (bioForm) {
        const autoEnableSection = (e) => {
            const section = e.target.closest('.form-section');
            if (!section || e.target.closest('.toggle-switch')) return;

            const sectionToggle = section.querySelector('.toggle-switch input[data-toggle]');
            if (sectionToggle && !sectionToggle.checked) {
                sectionToggle.checked = true;
                sectionToggle.dispatchEvent(new Event('change'));
            }
        };
        bioForm.addEventListener('input', autoEnableSection);
        bioForm.addEventListener('click', autoEnableSection);
    }

    // Initialize 1 default empty item in each dynamic form section
    addContact(); addGuardian(); addIDCard(); addEducation(); addExperience(); addProject(); addReference(); addLanguage();

    const templateSelector = document.getElementById('templateSelector');
    const updateTemplateLayout = () => {
        if (!templateSelector) return;
        const template = templateSelector.value;
        const resumePreview = document.getElementById('resumePreview');
        if (resumePreview) resumePreview.className = `resume-document ${template}`;

        const detailsContainer = document.getElementById('personal-details-block');
        if (detailsContainer && detailsContainer.innerText.trim().length > 0) {
            detailsContainer.style.display = '';
        }

        const skillsContainer = document.getElementById('prev-skills-container');
        const languagesContainer = document.getElementById('prev-languages-container');
        const hobbiesContainer = document.getElementById('prev-hobbies-container');
        const idCardsContainer = document.getElementById('prev-idcards-container');

        let idHeader = idCardsContainer ? idCardsContainer.querySelector('h4') : null;
        if (idCardsContainer && !idHeader) {
            idHeader = document.createElement('h4');
            idHeader.textContent = 'ID DETAILS';
            idHeader.style.display = 'none';
            idCardsContainer.prepend(idHeader);
        }

        const educationContainer = document.getElementById('prev-education-container');
        const sidebar = document.querySelector('.resume-sidebar');

        if (!skillsContainer || !languagesContainer || !hobbiesContainer) return;

        if (template === 'template-3' || template === 'template-4') {
            [skillsContainer, languagesContainer, hobbiesContainer].forEach(el => {
                el.classList.remove('sidebar-section');
                el.classList.add('content-section');
                el.style.marginTop = '0';
            });

            if (idCardsContainer) {
                idCardsContainer.classList.add('content-section');
                idCardsContainer.style.marginTop = '0';
                if (idHeader) idHeader.style.display = 'block';
            }

            if (educationContainer && educationContainer.parentNode) {
                const parent = educationContainer.parentNode;
                const nextNode = educationContainer.nextElementSibling;

                if (idCardsContainer) parent.insertBefore(idCardsContainer, nextNode);
                parent.insertBefore(skillsContainer, nextNode);
                parent.insertBefore(languagesContainer, nextNode);
                parent.insertBefore(hobbiesContainer, nextNode);
            }

        } else {
            [skillsContainer, languagesContainer, hobbiesContainer].forEach(el => {
                el.classList.remove('content-section');
                el.classList.add('sidebar-section');
            });

            skillsContainer.style.marginTop = '2rem';
            languagesContainer.style.marginTop = '1.5rem';
            hobbiesContainer.style.marginTop = '1.5rem';

            if (idCardsContainer && detailsContainer) {
                idCardsContainer.classList.remove('content-section');
                idCardsContainer.style.marginTop = '15px';
                if (idHeader) idHeader.style.display = 'none';
                detailsContainer.appendChild(idCardsContainer);
            }

            if (sidebar) {
                sidebar.appendChild(skillsContainer);
                sidebar.appendChild(languagesContainer);
                sidebar.appendChild(hobbiesContainer);
            }
        }
    };

    if (templateSelector) {
        templateSelector.addEventListener('change', updateTemplateLayout);
        updateTemplateLayout();
    }

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) {
            alert(msg);
            return;
        }
        const icon = toast.querySelector('i');
        toast.className = 'toast ' + type;
        if (icon) {
            icon.className = type === 'success' ? 'fas fa-circle-check' : 'fas fa-circle-exclamation';
        }
        const msgEl = document.getElementById('toastMsg');
        if (msgEl) msgEl.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4500);
    }

    function collectResumeData() {
        const val = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.value.trim() : '';
        };

        const contacts = Array.from(document.querySelectorAll('#contactList .dynamic-item')).map(item => {
            const digits = item.querySelector('.contact-num')?.value.trim() || '';
            return {
                icon: item.querySelector('.contact-type')?.value || 'fas fa-phone',
                number: digits ? `+91 ${digits}` : ''
            };
        }).filter(c => c.number);

        const guardians = Array.from(document.querySelectorAll('#guardianList .dynamic-item')).map(item => ({
            rel: item.querySelector('.g-rel')?.value.trim() || '',
            name: item.querySelector('.g-name')?.value.trim() || ''
        })).filter(g => g.rel || g.name);

        const idCards = Array.from(document.querySelectorAll('#idCardsList .dynamic-item')).map(item => ({
            type: item.querySelector('.id-type')?.value.trim() || '',
            number: item.querySelector('.id-number')?.value.trim() || '',
            expiry: item.querySelector('.id-expiry')?.value.trim() || ''
        })).filter(c => c.type || c.number || c.expiry);

        const education = Array.from(document.querySelectorAll('#educationList .dynamic-item')).map(item => ({
            degree: item.querySelector('.edu-degree')?.value.trim() || '',
            school: item.querySelector('.edu-school')?.value.trim() || '',
            date: item.querySelector('.edu-date')?.value.trim() || ''
        })).filter(i => i.degree || i.school || i.date);

        const experience = Array.from(document.querySelectorAll('#experienceList .dynamic-item')).map(item => ({
            title: item.querySelector('.exp-title')?.value.trim() || '',
            company: item.querySelector('.exp-company')?.value.trim() || '',
            date: item.querySelector('.exp-date')?.value.trim() || '',
            desc: item.querySelector('.exp-desc')?.value.trim() || ''
        })).filter(i => i.title || i.company || i.date || i.desc);

        const projects = Array.from(document.querySelectorAll('#projectsList .dynamic-item')).map(item => ({
            name: item.querySelector('.proj-name')?.value.trim() || '',
            tech: item.querySelector('.proj-tech')?.value.trim() || '',
            desc: item.querySelector('.proj-desc')?.value.trim() || ''
        })).filter(i => i.name || i.tech || i.desc);

        const references = Array.from(document.querySelectorAll('#referencesList .dynamic-item')).map(item => ({
            name: item.querySelector('.ref-name')?.value.trim() || '',
            desig: item.querySelector('.ref-desig')?.value.trim() || '',
            comp: item.querySelector('.ref-comp')?.value.trim() || '',
            mob: item.querySelector('.ref-mob')?.value.trim() || '',
            email: item.querySelector('.ref-email')?.value.trim() || ''
        })).filter(r => r.name || r.desig || r.comp || r.mob || r.email);

        const languages = Array.from(document.querySelectorAll('#languagesList .dynamic-item')).map(item => ({
            name: item.querySelector('.lang-name')?.value.trim() || '',
            score: parseInt(item.querySelector('.lang-prof')?.value || '5', 10)
        })).filter(i => i.name);

        const skills = val('#skills').split(',').map(s => s.trim()).filter(Boolean);
        const hobbies = val('#hobbies').split(',').map(s => s.trim()).filter(Boolean);

        const isEnabled = (containerId) => {
            const el = document.getElementById(containerId);
            return el ? el.style.display !== 'none' : true;
        };

        const photoImg = document.getElementById('prev-photo');
        const wrapPhoto = document.getElementById('wrap-photo');

        return {
            template: document.getElementById('templateSelector')?.value || 'template-1',
            personal: {
                name: val('input[data-preview="prev-name"]'),
                title: val('input[data-preview="prev-title"]'),
                email: val('input[data-preview="prev-email"]'),
                address: val('input[data-preview="prev-address"]'),
                gender: document.getElementById('genderSelect')?.value || '',
                marital: val('input[data-preview="prev-marital"]'),
                nationality: val('input[data-preview="prev-nationality"]')
            },
            photo: (wrapPhoto && wrapPhoto.style.display !== 'none' && photoImg && photoImg.src && photoImg.src.startsWith('data:')) ? photoImg.src : null,
            contacts,
            guardians,
            idCards,
            idCardsEnabled: isEnabled('prev-idcards-container') || (document.querySelector('.toggle-switch input[data-toggle="prev-idcards-container"]')?.checked ?? false),
            summary: {
                enabled: document.querySelector('input[data-toggle="prev-summary-container"]')?.checked ?? true,
                text: document.getElementById('summaryInput')?.value.trim() || ''
            },
            skills: {
                enabled: document.querySelector('input[data-toggle="prev-skills-container"]')?.checked ?? false,
                items: skills
            },
            languages: {
                enabled: document.querySelector('input[data-toggle="prev-languages-container"]')?.checked ?? true,
                items: languages
            },
            hobbies: {
                enabled: document.querySelector('input[data-toggle="prev-hobbies-container"]')?.checked ?? false,
                items: hobbies
            },
            education: {
                enabled: document.querySelector('input[data-toggle="prev-education-container"]')?.checked ?? true,
                items: education
            },
            experience: {
                enabled: document.querySelector('input[data-toggle="prev-experience-container"]')?.checked ?? true,
                items: experience
            },
            projects: {
                enabled: document.querySelector('input[data-toggle="prev-projects-container"]')?.checked ?? true,
                items: projects
            },
            references: {
                enabled: document.querySelector('input[data-toggle="prev-references-container"]')?.checked ?? false,
                items: references
            },
            declaration: {
                enabled: document.querySelector('input[data-toggle="prev-declaration-container"]')?.checked ?? true,
                text: document.getElementById('declarationInput')?.value.trim() || '',
                place: val('input[data-preview="prev-place"]'),
                date: document.getElementById('dateInput')?.value || ''
            }
        };
    }

    // --- SAVE TO DATABASE ---
    async function saveResume(silent = false) {
        const payloadData = collectResumeData();
        const saveBtn = document.getElementById('saveResumeBtn');
        if (saveBtn) saveBtn.disabled = true;

        try {
            const res = await fetch('resume_api.php?action=save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : ''
                },
                body: JSON.stringify({
                    id: currentResumeId,
                    csrf_token: typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : '',
                    data: payloadData
                })
            });

            const result = await res.json();
            if (result.success) {
                currentResumeId = result.id;
                if (!silent) showToast(result.message || 'Resume saved successfully', 'success');
                return true;
            } else {
                if (!silent) showToast(result.message || 'Failed to save resume', 'error');
                return false;
            }
        } catch (e) {
            if (!silent) showToast('Network or server error saving resume', 'error');
            return false;
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    // --- POPULATE FORM FROM SAVED JSON DATA ---
    function populateResumeForm(data) {
        if (!data) return;

        ['contactList', 'guardianList', 'idCardsList', 'educationList', 'experienceList', 'projectsList', 'referencesList', 'languagesList'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

        if (data.template) {
            const tSel = document.getElementById('templateSelector');
            if (tSel) {
                tSel.value = data.template;
                tSel.dispatchEvent(new Event('change'));
            }
        }

        const p = data.personal || {};
        const setVal = (sel, val) => {
            const el = document.querySelector(sel);
            if (el) {
                el.value = val || '';
                el.dispatchEvent(new Event('input'));
            }
        };

        setVal('input[data-preview="prev-name"]', p.name);
        setVal('input[data-preview="prev-title"]', p.title);
        setVal('input[data-preview="prev-email"]', p.email);
        setVal('input[data-preview="prev-address"]', p.address);
        setVal('#genderSelect', p.gender);
        setVal('input[data-preview="prev-marital"]', p.marital);
        setVal('input[data-preview="prev-nationality"]', p.nationality);

        const prevPhoto = document.getElementById('prev-photo');
        const wrapPhoto = document.getElementById('wrap-photo');
        if (data.photo && prevPhoto && wrapPhoto) {
            prevPhoto.src = data.photo;
            wrapPhoto.style.display = 'block';
        } else if (prevPhoto && wrapPhoto) {
            prevPhoto.src = '';
            wrapPhoto.style.display = 'none';
        }

        if (Array.isArray(data.contacts) && data.contacts.length > 0) {
            data.contacts.forEach(c => {
                addContact();
                const items = document.querySelectorAll('#contactList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const iconEl = last.querySelector('.contact-type');
                    const numEl = last.querySelector('.contact-num');
                    if (iconEl) iconEl.value = c.icon || 'fas fa-phone';
                    if (numEl) numEl.value = (c.number || '').replace('+91', '').trim();
                }
            });
            updateDynamicPreview('contact');
        } else {
            addContact();
        }

        if (Array.isArray(data.guardians) && data.guardians.length > 0) {
            data.guardians.forEach(g => {
                addGuardian();
                const items = document.querySelectorAll('#guardianList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const relEl = last.querySelector('.g-rel');
                    const nameEl = last.querySelector('.g-name');
                    if (relEl) relEl.value = g.rel || '';
                    if (nameEl) nameEl.value = g.name || '';
                }
            });
            updateDynamicPreview('guardian');
        } else {
            addGuardian();
        }

        if (Array.isArray(data.idCards) && data.idCards.length > 0) {
            data.idCards.forEach(c => {
                addIDCard();
                const items = document.querySelectorAll('#idCardsList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const typeEl = last.querySelector('.id-type');
                    const numEl = last.querySelector('.id-number');
                    const expEl = last.querySelector('.id-expiry');
                    if (typeEl) typeEl.value = c.type || '';
                    if (numEl) numEl.value = c.number || '';
                    if (expEl) expEl.value = c.expiry || '';
                }
            });
            updateDynamicPreview('idcard');
        } else {
            addIDCard();
        }

        const summaryToggle = document.querySelector('input[data-toggle="prev-summary-container"]');
        if (summaryToggle) {
            summaryToggle.checked = !!(data.summary && data.summary.enabled);
            summaryToggle.dispatchEvent(new Event('change'));
        }
        setVal('#summaryInput', data.summary ? data.summary.text : '');

        const skillsToggle = document.querySelector('input[data-toggle="prev-skills-container"]');
        if (skillsToggle) {
            skillsToggle.checked = !!(data.skills && data.skills.enabled);
            skillsToggle.dispatchEvent(new Event('change'));
        }
        setVal('#skills', (data.skills && Array.isArray(data.skills.items)) ? data.skills.items.join(', ') : '');

        const langToggle = document.querySelector('input[data-toggle="prev-languages-container"]');
        if (langToggle) {
            langToggle.checked = !!(data.languages && data.languages.enabled);
            langToggle.dispatchEvent(new Event('change'));
        }
        if (data.languages && Array.isArray(data.languages.items) && data.languages.items.length > 0) {
            data.languages.items.forEach(l => {
                addLanguage();
                const items = document.querySelectorAll('#languagesList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const nameEl = last.querySelector('.lang-name');
                    const profEl = last.querySelector('.lang-prof');
                    if (nameEl) nameEl.value = l.name || '';
                    if (profEl) profEl.value = l.score || 5;
                }
            });
            updateDynamicPreview('lang');
        } else {
            addLanguage();
        }

        const hobbiesToggle = document.querySelector('input[data-toggle="prev-hobbies-container"]');
        if (hobbiesToggle) {
            hobbiesToggle.checked = !!(data.hobbies && data.hobbies.enabled);
            hobbiesToggle.dispatchEvent(new Event('change'));
        }
        setVal('#hobbies', (data.hobbies && Array.isArray(data.hobbies.items)) ? data.hobbies.items.join(', ') : '');

        const eduToggle = document.querySelector('input[data-toggle="prev-education-container"]');
        if (eduToggle) {
            eduToggle.checked = !!(data.education && data.education.enabled);
            eduToggle.dispatchEvent(new Event('change'));
        }
        if (data.education && Array.isArray(data.education.items) && data.education.items.length > 0) {
            data.education.items.forEach(e => {
                addEducation();
                const items = document.querySelectorAll('#educationList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const degEl = last.querySelector('.edu-degree');
                    const schEl = last.querySelector('.edu-school');
                    const dateEl = last.querySelector('.edu-date');
                    if (degEl) degEl.value = e.degree || '';
                    if (schEl) schEl.value = e.school || '';
                    if (dateEl) dateEl.value = e.date || '';
                }
            });
            updateDynamicPreview('edu');
        } else {
            addEducation();
        }

        const expToggle = document.querySelector('input[data-toggle="prev-experience-container"]');
        if (expToggle) {
            expToggle.checked = !!(data.experience && data.experience.enabled);
            expToggle.dispatchEvent(new Event('change'));
        }
        if (data.experience && Array.isArray(data.experience.items) && data.experience.items.length > 0) {
            data.experience.items.forEach(e => {
                addExperience();
                const items = document.querySelectorAll('#experienceList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const titleEl = last.querySelector('.exp-title');
                    const compEl = last.querySelector('.exp-company');
                    const dateEl = last.querySelector('.exp-date');
                    const descEl = last.querySelector('.exp-desc');
                    if (titleEl) titleEl.value = e.title || '';
                    if (compEl) compEl.value = e.company || '';
                    if (dateEl) dateEl.value = e.date || '';
                    if (descEl) descEl.value = e.desc || '';
                }
            });
            updateDynamicPreview('exp');
        } else {
            addExperience();
        }

        const projToggle = document.querySelector('input[data-toggle="prev-projects-container"]');
        if (projToggle) {
            projToggle.checked = !!(data.projects && data.projects.enabled);
            projToggle.dispatchEvent(new Event('change'));
        }
        if (data.projects && Array.isArray(data.projects.items) && data.projects.items.length > 0) {
            data.projects.items.forEach(p => {
                addProject();
                const items = document.querySelectorAll('#projectsList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const nameEl = last.querySelector('.proj-name');
                    const techEl = last.querySelector('.proj-tech');
                    const descEl = last.querySelector('.proj-desc');
                    if (nameEl) nameEl.value = p.name || '';
                    if (techEl) techEl.value = p.tech || '';
                    if (descEl) descEl.value = p.desc || '';
                }
            });
            updateDynamicPreview('proj');
        } else {
            addProject();
        }

        const refToggle = document.querySelector('input[data-toggle="prev-references-container"]');
        if (refToggle) {
            refToggle.checked = !!(data.references && data.references.enabled);
            refToggle.dispatchEvent(new Event('change'));
        }
        if (data.references && Array.isArray(data.references.items) && data.references.items.length > 0) {
            data.references.items.forEach(r => {
                addReference();
                const items = document.querySelectorAll('#referencesList .dynamic-item');
                const last = items[items.length - 1];
                if (last) {
                    const nameEl = last.querySelector('.ref-name');
                    const desigEl = last.querySelector('.ref-desig');
                    const compEl = last.querySelector('.ref-comp');
                    const mobEl = last.querySelector('.ref-mob');
                    const emailEl = last.querySelector('.ref-email');
                    if (nameEl) nameEl.value = r.name || '';
                    if (desigEl) desigEl.value = r.desig || '';
                    if (compEl) compEl.value = r.comp || '';
                    if (mobEl) mobEl.value = r.mob || '';
                    if (emailEl) emailEl.value = r.email || '';
                }
            });
            updateDynamicPreview('ref');
        } else {
            addReference();
        }

        const decToggle = document.querySelector('input[data-toggle="prev-declaration-container"]');
        if (decToggle) {
            decToggle.checked = !!(data.declaration && data.declaration.enabled);
            decToggle.dispatchEvent(new Event('change'));
        }
        if (data.declaration) {
            setVal('#declarationInput', data.declaration.text);
            setVal('input[data-preview="prev-place"]', data.declaration.place);
            const dInput = document.getElementById('dateInput');
            if (dInput) {
                dInput.value = data.declaration.date || '';
                dInput.dispatchEvent(new Event('change'));
            }
        }
    }

    // --- FETCH & RENDER HISTORY LIST ---
    async function fetchResumeHistory(search = '') {
        const listContainer = document.getElementById('historyListContainer');
        if (!listContainer) return;
        listContainer.innerHTML = '<div style="padding: 1.5rem; text-align:center; color:#64748b;">Loading resumes...</div>';

        try {
            const res = await fetch(`resume_api.php?action=list&search=${encodeURIComponent(search)}`);
            const json = await res.json();

            if (!json.success || !json.data || json.data.length === 0) {
                listContainer.innerHTML = '<div style="padding: 1.5rem; text-align:center; color:#64748b;">No saved resumes found.</div>';
                return;
            }

            let html = '<table style="width:100%; border-collapse: collapse; font-size:0.88rem;">';
            html += `
                <thead>
                    <tr style="background: rgba(14,165,233,0.1); text-align: left; border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 10px 14px;">Name</th>
                        <th style="padding: 10px 14px;">Mobile</th>
                        <th style="padding: 10px 14px;">Email</th>
                        <th style="padding: 10px 14px;">Last Updated</th>
                        <th style="padding: 10px 14px; text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>`;

            json.data.forEach(item => {
                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px 14px; font-weight:600;">${item.name || '<i>Untitled</i>'}</td>
                        <td style="padding: 10px 14px;">${item.mobile || '-'}</td>
                        <td style="padding: 10px 14px;">${item.email || '-'}</td>
                        <td style="padding: 10px 14px; font-size:0.8rem; color:#64748b;">${item.formatted_date || ''}</td>
                        <td style="padding: 10px 14px; text-align: right; white-space:nowrap;">
                            <button type="button" class="secondary-btn" style="padding: 4px 10px; font-size:0.78rem; margin-right:4px;" onclick="loadResumeById(${item.id})">
                                <i class="fas fa-edit"></i> Open
                            </button>
                            <button type="button" class="remove-btn" style="position:static; padding: 4px 8px; font-size:0.85rem;" onclick="deleteResumeById(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });

            html += '</tbody></table>';
            listContainer.innerHTML = html;
        } catch (e) {
            listContainer.innerHTML = '<div style="padding: 1.5rem; text-align:center; color:#ef4444;">Error connecting to API. Check console/logs.</div>';
        }
    }

    // --- GLOBAL ACTIONS: LOAD & DELETE ---
    window.loadResumeById = async function(id) {
        try {
            const res = await fetch(`resume_api.php?action=get&id=${id}`);
            const json = await res.json();
            if (json.success && json.data) {
                currentResumeId = json.id;
                populateResumeForm(json.data);
                const historyModal = document.getElementById('historyModal');
                if (historyModal) historyModal.style.display = 'none';
                showToast('Resume loaded for editing', 'success');
            } else {
                showToast(json.message || 'Failed to load resume data', 'error');
            }
        } catch (e) {
            showToast('Error loading resume details', 'error');
        }
    };

    window.deleteResumeById = async function(id) {
        if (!confirm('Are you sure you want to delete this resume?')) return;

        try {
            const res = await fetch('resume_api.php?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : ''
                },
                body: JSON.stringify({ 
                    id,
                    csrf_token: typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : ''
                })
            });
            const json = await res.json();
            if (json.success) {
                showToast('Resume deleted successfully', 'success');
                if (currentResumeId === id) currentResumeId = null;
                const searchVal = document.getElementById('historySearchInput')?.value || '';
                fetchResumeHistory(searchVal);
            } else {
                showToast(json.message || 'Failed to delete resume', 'error');
            }
        } catch (e) {
            showToast('Error deleting resume', 'error');
        }
    };

    // --- BUTTON EVENT BINDINGS ---
    document.getElementById('saveResumeBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        saveResume(false);
    });

    document.getElementById('newResumeBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Start a new resume? Any unsaved edits will be cleared.')) {
            currentResumeId = null;
            document.getElementById('bioDataForm')?.reset();
            window.location.reload();
        }
    });

    const historyBtn = document.getElementById('historyBtn');
    const historyModal = document.getElementById('historyModal');
    if (historyBtn && historyModal) {
        historyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            historyModal.style.display = 'flex';
            const searchInp = document.getElementById('historySearchInput');
            if (searchInp) searchInp.value = '';
            fetchResumeHistory('');
        });
    }

    const closeHistoryBtn = document.getElementById('closeHistoryModal');
    if (closeHistoryBtn && historyModal) {
        closeHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            historyModal.style.display = 'none';
        });
    }

    let searchDebounceTimer;
    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                fetchResumeHistory(e.target.value.trim());
            }, 300);
        });
    }

    // --- DOWNLOAD & AUTO-SAVE ---
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const emailInput = document.querySelector('input[data-preview="prev-email"]');
            let hasError = false;
            if (emailInput && emailInput.value.trim() && !validateEmailField(emailInput)) hasError = true;

            document.querySelectorAll('#contactList .contact-num').forEach(input => {
                if (input.value.trim() && !validateIndianMobile(input)) hasError = true;
            });

            if (hasError) {
                showToast('Please fix the highlighted mobile number / email errors', 'error');
                return;
            }

            downloadBtn.classList.add('loading');
            downloadBtn.disabled = true;

            try {
                // Auto-save before generating PDF
                await saveResume(true);

                const payload = collectResumeData();

                const res = await fetch(PDF_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : ''
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    let message = 'PDF generation failed';
                    try {
                        const errData = await res.json();
                        message = errData.message || message;
                    } catch (e) { }
                    showToast(message, 'error');
                    return;
                }

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Dynamically name the file based on the candidate's name
                let fileName = 'Professional_Resume.pdf';
                if (payload.personal && payload.personal.name) {
                    // Sanitize the name (replace spaces and special chars with underscores)
                    const cleanName = payload.personal.name.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
                    if (cleanName) {
                        fileName = `${cleanName}_Resume.pdf`;
                    }
                }
                
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast('Resume saved and PDF downloaded successfully', 'success');
            } catch (err) {
                showToast('Network error while generating PDF', 'error');
            } finally {
                downloadBtn.classList.remove('loading');
                downloadBtn.disabled = false;
            }
        });
    }
});
