/* AI Professional Summary UI. API key stays server-side. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const openBtn = $('aiSummaryBtn');
  const modal = $('aiSummaryModal');
  if (!openBtn || !modal) return;

  const closeBtn = $('aiCloseBtn');
  const cancelBtn = $('aiCancelBtn');
  const genBtn = $('aiGenerateBtn');
  const applyBtn = $('aiApplyBtn');
  const out = $('aiOutput');
  const count = $('aiOutCount');
  const status = $('aiStatus');
  const limitEl = $('aiCharLimit');
  const MIN = 400;
  const MAX = 1500;
  let previousFocus = null;

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message || '';
    status.className = 'ai-status' + (kind ? ' is-' + kind : '');
  }
  function openModal() {
    previousFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setStatus('', '');
    setTimeout(() => $('aiJobApplied')?.focus(), 0);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    previousFocus?.focus?.();
  }
  function updateCount() {
    if (count) count.textContent = String(Array.from(out.value).length);
    if (applyBtn) applyBtn.disabled = !out.value.trim();
  }
  function safeLimit() {
    const parsed = Number.parseInt(limitEl?.value || '700', 10);
    return Math.max(MIN, Math.min(MAX, Number.isFinite(parsed) ? parsed : 700));
  }
  function getResumePayload() {
    const title = document.querySelector('input[data-preview="prev-title"]')?.value.trim() || '';
    const summary = $('summaryInput')?.value.trim() || '';
    const skills = ($('skills')?.value || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
    const collectList = (selector, mapper) => Array.from(document.querySelectorAll(selector)).map(mapper).filter(x => Object.values(x).some(v => String(v || '').trim())).slice(0, 20);
    const education = collectList('#educationList .dynamic-item', item => ({
      degree: item.querySelector('.edu-degree')?.value.trim() || '',
      school: item.querySelector('.edu-school')?.value.trim() || '',
      date: item.querySelector('.edu-date')?.value.trim() || ''
    }));
    const experience = collectList('#experienceList .dynamic-item', item => ({
      title: item.querySelector('.exp-title')?.value.trim() || '',
      company: item.querySelector('.exp-company')?.value.trim() || '',
      date: item.querySelector('.exp-date')?.value.trim() || '',
      description: item.querySelector('.exp-desc')?.value.trim() || ''
    }));
    const projects = collectList('#projectsList .dynamic-item', item => ({
      name: item.querySelector('.proj-name')?.value.trim() || '',
      technologies: item.querySelector('.proj-tech')?.value.trim() || '',
      description: item.querySelector('.proj-desc')?.value.trim() || ''
    }));
    return { title, summary, skills, education, experience, projects };
  }
  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
  out?.addEventListener('input', updateCount);
  limitEl?.addEventListener('change', () => { limitEl.value = String(safeLimit()); });
  genBtn?.addEventListener('click', async () => {
    if (genBtn.disabled) return;
    genBtn.disabled = true;
    genBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    setStatus('Creating your summary from the information entered in this resume...', '');
    try {
      const response = await fetch('/api/resume-builder/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          char_limit: safeLimit(),
          ats: !!$('aiAtsToggle')?.checked,
          job_applied: $('aiJobApplied')?.value.trim() || '',
          instructions: $('aiInstructions')?.value.trim() || '',
          resume: getResumePayload()
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || typeof result.summary !== 'string') {
        throw new Error(result.message || 'AI summary could not be generated. Please try again.');
      }
      out.disabled = false;
      out.value = result.summary;
      updateCount();
      setStatus('Summary generated. Review or edit it, then select Apply to Resume.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Could not connect to the AI service. Please try again.', 'error');
    } finally {
      genBtn.disabled = false;
      genBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Summary';
    }
  });
  applyBtn?.addEventListener('click', () => {
    const summaryInput = $('summaryInput');
    if (!summaryInput || !out.value.trim()) return;
    summaryInput.value = out.value.trim();
    summaryInput.dispatchEvent(new Event('input', { bubbles: true }));
    summaryInput.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus('Summary applied to your resume.', 'success');
    closeModal();
  });
})();
