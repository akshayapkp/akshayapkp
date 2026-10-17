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


// Resume Builder profile photo: use the same four-corner perspective crop flow as Photo Studio.
(() => {
  const input = document.getElementById('photoInput');
  if (!input || input.dataset.perspectiveCropReady) return;
  input.dataset.perspectiveCropReady = 'true';
  let overlay, image, canvas, ctx, points, source, view, active = -1;
  const labels = ['TL', 'TR', 'BR', 'BL'];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function buildDialog() {
    overlay = document.createElement('div');
    overlay.id = 'resumePerspectiveCrop';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000000;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Arial,sans-serif;';
    overlay.innerHTML = `<div style="width:min(100%,1000px);max-height:95vh;display:flex;flex-direction:column;background:white;border-radius:18px;overflow:hidden;box-shadow:0 25px 80px #0006">
      <header style="padding:16px 20px;background:linear-gradient(110deg,#0369a1,#0891b2);color:white;display:flex;justify-content:space-between;align-items:center;gap:12px"><div><strong style="font-size:20px">Perspective Photo Crop</strong><div style="font-size:12px;margin-top:5px;opacity:.9">Drag all four corners to the edges of your photo.</div></div><button type="button" data-crop-cancel aria-label="Close" style="font-size:24px;color:white;background:transparent;border:0;cursor:pointer">×</button></header>
      <div style="padding:14px;overflow:auto;min-height:0"><canvas style="width:100%;height:min(58vh,520px);display:block;background:#f1f5f9;border-radius:12px;touch-action:none;cursor:crosshair"></canvas><p style="font-size:12px;color:#475569;margin:10px 2px 0">Move TL, TR, BR and BL independently. The selected area will be straightened before adding it to your resume.</p><p data-crop-error style="display:none;color:#b91c1c;font-size:12px"></p></div>
      <footer style="padding:14px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><button type="button" data-crop-cancel style="padding:10px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer">Cancel</button><div style="display:flex;gap:8px"><button type="button" data-crop-reset style="padding:10px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer">Reset corners</button><button type="button" data-crop-done style="padding:10px 18px;border:0;border-radius:10px;background:#0e7490;color:white;font-weight:bold;cursor:pointer">Done — Use photo</button></div></footer></div>`;
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('canvas'); ctx = canvas.getContext('2d');
    overlay.querySelectorAll('[data-crop-cancel]').forEach(b => b.addEventListener('click', cancel));
    overlay.querySelector('[data-crop-reset]').addEventListener('click', reset);
    overlay.querySelector('[data-crop-done]').addEventListener('click', apply);
    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect(), sx = canvas.width/r.width, sy = canvas.height/r.height;
      const p = {x:(e.clientX-r.left)*sx,y:(e.clientY-r.top)*sy};
      let best=Infinity; active=-1;
      points.forEach((q,i)=>{const d=Math.hypot(q.x*view.scale+view.x-p.x,q.y*view.scale+view.y-p.y);if(d<best){best=d;active=i;}});
      if(best<38){canvas.setPointerCapture(e.pointerId);e.preventDefault();}
      else active=-1;
    });
    canvas.addEventListener('pointermove', e => {
      if(active<0)return;
      const r=canvas.getBoundingClientRect(),sx=canvas.width/r.width,sy=canvas.height/r.height;
      const p={x:clamp(((e.clientX-r.left)*sx-view.x)/view.scale,0,source.width),y:clamp(((e.clientY-r.top)*sy-view.y)/view.scale,0,source.height)};
      const next=points.map(q=>({...q}));next[active]=p;
      if(valid(next))points=next;
      draw();
    });
    ['pointerup','pointercancel'].forEach(type=>canvas.addEventListener(type,()=>active=-1));
  }
  function valid(p){let sign=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4],cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(Math.abs(cross)<1)return false;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);}return true;}
  function reset(){if(!source)return;points=[{x:source.width*.08,y:source.height*.08},{x:source.width*.92,y:source.height*.08},{x:source.width*.92,y:source.height*.92},{x:source.width*.08,y:source.height*.92}];draw();}
  function draw(){
    if(!source||!canvas)return;
    const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.fillStyle='#f1f5f9';ctx.fillRect(0,0,w,h);
    const scale=Math.min(w/source.width,h/source.height),dw=source.width*scale,dh=source.height*scale,x=(w-dw)/2,y=(h-dh)/2;view={x,y,scale};
    ctx.drawImage(source,x,y,dw,dh);
    const p=points.map(q=>({x:x+q.x*scale,y:y+q.y*scale}));
    ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.fillStyle='rgba(14,165,233,.24)';ctx.fill();ctx.strokeStyle='#0284c7';ctx.lineWidth=2*dpr;ctx.stroke();
    ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[2].x,p[2].y);ctx.moveTo(p[1].x,p[1].y);ctx.lineTo(p[3].x,p[3].y);ctx.stroke();
    p.forEach((q,i)=>{ctx.beginPath();ctx.arc(q.x,q.y,7*dpr,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();ctx.strokeStyle='#0369a1';ctx.lineWidth=3*dpr;ctx.stroke();ctx.fillStyle='#0f172a';ctx.font='bold '+(11*dpr)+'px Arial';ctx.fillText(labels[i],q.x+9*dpr,q.y-9*dpr);});
  }
  function solve(m,v){const n=v.length,a=m.map((row,i)=>[...row,v[i]]);for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-10)throw Error('Please adjust the crop corners and try again.');[a[c],a[p]]=[a[p],a[c]];const d=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=d;for(let r=0;r<n;r++){if(r===c)continue;const f=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=f*a[c][j];}}return a.map(row=>row[n]);}
  function warp(){
    const width=Math.max(2,Math.min(6000,Math.round(Math.max(Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y),Math.hypot(points[2].x-points[3].x,points[2].y-points[3].y)))));
    const height=Math.max(2,Math.min(6000,Math.round(Math.max(Math.hypot(points[3].x-points[0].x,points[3].y-points[0].y),Math.hypot(points[2].x-points[1].x,points[2].y-points[1].y)))));
    const src=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,source.width,source.height),out=document.createElement('canvas');out.width=width;out.height=height;const oc=out.getContext('2d'),od=oc.createImageData(width,height);
    const dst=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}],m=[],v=[];
    for(let i=0;i<4;i++){const {x,y}=dst[i],{x:u,y:vv}=points[i];m.push([x,y,1,0,0,0,-u*x,-u*y]);v.push(u);m.push([0,0,0,x,y,1,-vv*x,-vv*y]);v.push(vv);}
    const h=[...solve(m,v),1];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const den=h[6]*(x+.5)+h[7]*(y+.5)+1,sx=(h[0]*(x+.5)+h[1]*(y+.5)+h[2])/den-.5,sy=(h[3]*(x+.5)+h[4]*(y+.5)+h[5])/den-.5;if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<0||sy<0||sx>=source.width-1||sy>=source.height-1)continue;const x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0,d=(y*width+x)*4;for(let c=0;c<4;c++){const a=src.data[(y0*source.width+x0)*4+c],b=src.data[(y0*source.width+x0+1)*4+c],cc=src.data[((y0+1)*source.width+x0)*4+c],dd=src.data[((y0+1)*source.width+x0+1)*4+c];od.data[d+c]=a*(1-fx)*(1-fy)+b*fx*(1-fy)+cc*(1-fx)*fy+dd*fx*fy;}}
    oc.putImageData(od,0,0);return out.toDataURL('image/jpeg',.96);
  }
  function cancel(){if(overlay)overlay.remove();overlay=null;input.value='';source=null;}
  function apply(){try{const data=warp(),prev=document.getElementById('prev-photo'),wrap=document.getElementById('wrap-photo');if(prev&&wrap){prev.src=data;wrap.style.display='block';}if(overlay)overlay.remove();overlay=null;source=null;}catch(err){const el=overlay?.querySelector('[data-crop-error]');if(el){el.textContent=err.message||'Could not crop this photo.';el.style.display='block';}}}
  input.addEventListener('change',e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    e.stopImmediatePropagation();
    if(!file.type.startsWith('image/')){alert('Please select an image file.');input.value='';return;}
    const reader=new FileReader();
    reader.onload=()=>{const img=new Image();img.onload=()=>{source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;source.getContext('2d').drawImage(img,0,0);if(!overlay)buildDialog();reset();overlay.style.display='flex';draw();};img.onerror=()=>alert('Could not open this image. Please choose another photo.');img.src=reader.result;};
    reader.readAsDataURL(file);
  },true);
  window.addEventListener('resize',()=>{if(overlay&&source)draw();});
})();
