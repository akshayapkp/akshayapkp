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


// Resume Builder profile photo: shared rectangular crop experience.
(() => {
  const input = document.getElementById('photoInput');
  if (!input || input.dataset.rectCropReady) return;
  input.dataset.rectCropReady = 'true';
  let overlay = null, source = null, canvas = null, ctx = null;
  let rect = null, ratio = 1, view = null, drag = null;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const fit = (r = ratio) => {
    if (!source) return;
    let w = source.width * .86, h = w / r;
    if (h > source.height * .86) { h = source.height * .86; w = h * r; }
    rect = { x:(source.width-w)/2, y:(source.height-h)/2, w, h };
    draw();
  };
  function build() {
    overlay = document.createElement('div');
    overlay.id = 'resumeRectCrop';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000000;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:12px;font-family:Arial,sans-serif;';
    overlay.innerHTML = `<div style="width:min(100%,1000px);max-height:96vh;display:flex;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 25px 80px #0006">
      <header style="padding:15px 20px;background:linear-gradient(110deg,#0369a1,#0891b2);color:white;display:flex;justify-content:space-between;align-items:center;gap:12px"><div><strong style="font-size:20px">Crop Photo</strong><div style="font-size:12px;margin-top:5px;opacity:.9">Drag inside the box to move it; drag the corners to resize.</div></div><button type="button" data-cancel style="font-size:24px;color:white;background:transparent;border:0;cursor:pointer">×</button></header>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:12px;padding:14px;overflow:auto;min-height:0"><canvas style="width:100%;height:min(58vh,520px);min-height:280px;display:block;background:#e2e8f0;border-radius:12px;touch-action:none"></canvas>
      <aside style="display:flex;flex-direction:column;gap:9px"><strong style="font-size:14px">Crop Ratio</strong><div style="display:flex;flex-wrap:wrap;gap:6px"><button type="button" data-ratio="1">1:1</button><button type="button" data-ratio=".75">3:4</button><button type="button" data-ratio=".7777778">7:9</button><button type="button" data-ratio="1.3333333">4:3</button><button type="button" data-ratio="0">Free</button></div><button type="button" data-rotate style="padding:10px;border:1px solid #cbd5e1;border-radius:9px;background:white">↻ Rotate 90°</button><button type="button" data-reset style="padding:10px;border:1px solid #cbd5e1;border-radius:9px;background:white">Reset Crop</button><p style="font-size:11px;color:#64748b;line-height:1.5">Choose a ratio, move or resize the crop box, then apply. You can still choose Round or Square in Resume Builder.</p><p data-error style="display:none;color:#b91c1c;font-size:12px"></p></aside></div>
      <footer style="padding:13px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px"><button type="button" data-cancel style="padding:10px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white">Cancel</button><button type="button" data-done style="padding:10px 20px;border:0;border-radius:10px;background:#0e7490;color:white;font-weight:bold">Done — Use Photo</button></footer></div>`;
    document.body.appendChild(overlay);
    canvas=overlay.querySelector('canvas'); ctx=canvas.getContext('2d');
    overlay.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',cancel));
    overlay.querySelector('[data-reset]').addEventListener('click',()=>fit(ratio));
    overlay.querySelector('[data-done]').addEventListener('click',apply);
    overlay.querySelector('[data-rotate]').addEventListener('click',rotate);
    overlay.querySelectorAll('[data-ratio]').forEach(b=>{b.style.cssText='padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-size:12px;cursor:pointer';b.addEventListener('click',()=>{ratio=Number(b.dataset.ratio);fit(ratio||null);});});
    canvas.addEventListener('pointerdown',e=>{
      const p=point(e), reach=24*(window.devicePixelRatio||1)/view.scale;
      const corners=[{x:rect.x,y:rect.y,id:'tl'},{x:rect.x+rect.w,y:rect.y,id:'tr'},{x:rect.x+rect.w,y:rect.y+rect.h,id:'br'},{x:rect.x,y:rect.y+rect.h,id:'bl'}];
      const hit=corners.find(c=>Math.hypot(p.x-c.x,p.y-c.y)<reach);
      if(hit)drag={type:hit.id,start:p,rect:{...rect}};
      else if(p.x>=rect.x&&p.x<=rect.x+rect.w&&p.y>=rect.y&&p.y<=rect.y+rect.h)drag={type:'move',start:p,rect:{...rect}};
      if(drag){canvas.setPointerCapture(e.pointerId);e.preventDefault();}
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag)return;const p=point(e),r=drag.rect;
      if(drag.type==='move'){rect={...r,x:clamp(r.x+p.x-drag.start.x,0,source.width-r.w),y:clamp(r.y+p.y-drag.start.y,0,source.height-r.h)};}
      else {
        const right=drag.type.includes('r'),bottom=drag.type.includes('b');
        const ax=right?r.x:r.x+r.w, ay=bottom?r.y:r.y+r.h;
        const maxW=right?source.width-ax:ax,maxH=bottom?source.height-ay:ay;
        let w=Math.max(24,(right?1:-1)*(p.x-ax)),h=Math.max(24,(bottom?1:-1)*(p.y-ay));
        if(ratio){w=Math.min(Math.max(w,h*ratio),maxW,maxH*ratio);h=w/ratio;}else{w=Math.min(w,maxW);h=Math.min(h,maxH);}
        rect={x:right?ax:ax-w,y:bottom?ay:ay-h,w,h};
      } draw();
    });
    ['pointerup','pointercancel'].forEach(t=>canvas.addEventListener(t,()=>drag=null));
  }
  function point(e){const b=canvas.getBoundingClientRect(),v=view,f=canvas.width/Math.max(1,b.width);return{x:((e.clientX-b.left)*f-v.x)/v.scale,y:((e.clientY-b.top)*f-v.y)/v.scale};}
  function draw(){
    if(!source||!canvas)return;
    const b=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(b.width*dpr)),h=Math.max(1,Math.round(b.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const scale=Math.min(w/source.width,h/source.height),dw=source.width*scale,dh=source.height*scale,x=(w-dw)/2,y=(h-dh)/2;view={x,y,scale};
    ctx.fillStyle='#e2e8f0';ctx.fillRect(0,0,w,h);ctx.drawImage(source,x,y,dw,dh);
    const rx=x+rect.x*scale,ry=y+rect.y*scale,rw=rect.w*scale,rh=rect.h*scale;
    ctx.fillStyle='rgba(15,23,42,.55)';ctx.fillRect(x,y,dw,ry-y);ctx.fillRect(x,ry+rh,dw,y+dh-ry-rh);ctx.fillRect(x,ry,rx-x,rh);ctx.fillRect(rx+rw,ry,x+dw-rx-rw,rh);
    ctx.strokeStyle='white';ctx.lineWidth=2*dpr;ctx.strokeRect(rx,ry,rw,rh);
    [[rx,ry],[rx+rw,ry],[rx+rw,ry+rh],[rx,ry+rh]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],7*dpr,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();ctx.strokeStyle='#0e7490';ctx.lineWidth=2*dpr;ctx.stroke();});
  }
  function rotate(){if(!source)return;const out=document.createElement('canvas');out.width=source.height;out.height=source.width;const c=out.getContext('2d');c.translate(out.width,0);c.rotate(Math.PI/2);c.drawImage(source,0,0);source=out;fit(ratio);}
  function cancel(){overlay?.remove();overlay=null;source=null;input.value='';}
  function apply(){try{const out=document.createElement('canvas');out.width=Math.max(1,Math.round(rect.w));out.height=Math.max(1,Math.round(rect.h));out.getContext('2d').drawImage(source,rect.x,rect.y,rect.w,rect.h,0,0,out.width,out.height);const photo=document.getElementById('prev-photo'),wrap=document.getElementById('wrap-photo');if(photo&&wrap){photo.src=out.toDataURL('image/jpeg',.96);wrap.style.display='block';}overlay?.remove();overlay=null;source=null;}catch(err){const el=overlay?.querySelector('[data-error]');if(el){el.textContent=err.message||'Could not crop this photo.';el.style.display='block';}}}
  input.addEventListener('change',e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;e.stopImmediatePropagation();
    if(!file.type.startsWith('image/')){alert('Please select an image file.');input.value='';return;}
    const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;source.getContext('2d').drawImage(img,0,0);ratio=1;if(!overlay)build();fit(ratio);overlay.style.display='flex';};img.onerror=()=>alert('Could not open this image.');img.src=reader.result;};reader.readAsDataURL(file);
  },true);
  window.addEventListener('resize',()=>{if(overlay&&source)draw();});
})();
 
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
