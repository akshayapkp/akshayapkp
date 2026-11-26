(function(){
"use strict";
var D=window.AFF_DEFS||[], esc=function(x){return String(x==null?"":x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}, V=function(v,k){return esc(v&&v[k]?String(v[k]).trim():"")}, B=function(v,k,w){return '<span class="ofline" style="min-width:'+(w||90)+'px">'+(V(v,k)||"&#8203;")+'</span>'}, F=function(id,label,type,extra){return Object.assign({id:id,label:label,type:type||"text",ml:true},extra||{})}, A={html:true,w:595.3,h:841.9};
window.AFF_HTML_CSS=(window.AFF_HTML_CSS||"")+
'.official{font-family:"Noto Sans Malayalam","Noto Sans",Arial,sans-serif;color:#111;font-size:11px;line-height:1.35;width:100%;height:100%;padding:25px 30px;background:#fff;overflow:hidden}.official *{box-sizing:border-box}.official h1{text-align:center;font-size:16px;line-height:1.4;margin:0;font-weight:800}.official h2{text-align:center;font-size:13px;margin:2px 0 5px}.official .note{text-align:center;font-size:9px;font-style:italic;margin:0 0 10px}.official .line{display:inline-block;border-bottom:1px solid #222;min-width:90px;min-height:17px;padding:0 3px;color:#092b69;font-weight:600;overflow-wrap:anywhere}.official p{margin:7px 0;line-height:1.8;text-align:justify}.official table{width:100%;border-collapse:collapse;table-layout:fixed;margin:5px 0}.official th,.official td{border:1px solid #333;padding:4px 5px;vertical-align:middle}.official th{text-align:center}.official td:first-child{width:5%;text-align:center}.official td:nth-child(2){width:46%}.official td:last-child{color:#092b69;font-weight:600}.official .small{font-size:9px;line-height:1.35}.official .signs{display:flex;justify-content:space-between;gap:15px;margin:14px 0}.official .sign{width:31%;border-top:1px solid #222;text-align:center;padding-top:5px}.official .field{display:flex;gap:7px;margin:5px 0;align-items:flex-end;min-height:21px}.official .field b{min-width:125px}.official .field .line{flex:1;min-width:0}.official .band{background:#eaf3f8;border:1px solid #7899ad;text-align:center;padding:5px;font-weight:800;margin:8px 0}.official .photo{float:right;border:1px solid #333;width:105px;height:130px;text-align:center;padding:25px 5px;margin:0 0 8px 12px;font-size:9px}.official .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.official .check{display:inline-block;width:10px;height:10px;border:1px solid #222;margin:0 4px;vertical-align:middle}.official .checklist{border:1px solid #444;padding:7px;min-height:120px}.official .checklist p{margin:5px 0}.official .aadhaar{font-family:Arial,sans-serif;font-size:9px;line-height:1.25;padding:18px 22px}.official .aadhaar h1{font-family:Arial,sans-serif;font-size:14px}.official .aadhaar h2{font-size:9px}.official .foot{text-align:center;font-size:8px;margin-top:8px}';

var nclFields=[
F("ncl_taluk","താലൂക്ക്"),F("ncl_village","വില്ലേജ്"),F("ncl_address","മേൽവിലാസം","textarea",{rows:2}),
F("ncl_applicant","സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ പേര്"),F("ncl_age","വയസ്സ്","text",{ml:false}),
F("ncl_purpose","സർട്ടിഫിക്കറ്റിന് എന്ത് ആവശ്യത്തിന്"),F("ncl_birth","സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാൾ ജനിച്ചു വളർന്ന താലൂക്ക്, വില്ലേജ്"),
F("ncl_caste","സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ മതം, ജാതി"),F("ncl_occupation","സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ തൊഴിൽ"),
F("ncl_f_name","പിതാവിന്റെ പേര്"),F("ncl_m_name","മാതാവിന്റെ പേര്"),
F("ncl_f_birth","പിതാവ് ജനിച്ചു വളർന്ന താലൂക്ക്, വില്ലേജ്"),F("ncl_m_birth","മാതാവ് ജനിച്ചു വളർന്ന താലൂക്ക്, വില്ലേജ്"),
F("ncl_f_caste","പിതാവിന്റെ മതം, ജാതി"),F("ncl_m_caste","മാതാവിന്റെ മതം, ജാതി"),
F("ncl_f_deceased","മരണപ്പെട്ടയാളാണോ (അച്ഛൻ)"),F("ncl_m_deceased","മരണപ്പെട്ടയാളാണോ (അമ്മ)"),
F("ncl_f_pension","പെൻഷണറാണോ (അച്ഛൻ)"),F("ncl_m_pension","പെൻഷണറാണോ (അമ്മ)"),
F("ncl_f_job","തൊഴിൽ (പിതാവ്)"),F("ncl_m_job","തൊഴിൽ (മാതാവ്)"),
F("ncl_f_location","തൊഴിൽ ചെയ്യുന്നത് സ്വദേശത്തോ വിദേശത്തോ (പിതാവ്)"),F("ncl_m_location","തൊഴിൽ ചെയ്യുന്നത് സ്വദേശത്തോ വിദേശത്തോ (മാതാവ്)"),
F("ncl_f_service","സർവീസിൽ പ്രവേശിച്ച തസ്തിക, വകുപ്പ് (പിതാവ്)"),F("ncl_m_service","സർവീസിൽ പ്രവേശിച്ച തസ്തിക, വകുപ്പ് (മാതാവ്)"),
F("ncl_f_retired","റിട്ടയർ ചെയ്യുമ്പോൾ വഹിച്ച തസ്തിക, വകുപ്പ് (പിതാവ്)"),F("ncl_m_retired","റിട്ടയർ ചെയ്യുമ്പോൾ വഹിച്ച തസ്തിക, വകുപ്പ് (മാതാവ്)"),
F("ncl_f_income","തൊഴിലിൽ നിന്ന് ലഭിക്കുന്ന മാസവരുമാനം (പിതാവ്)","text",{ml:false}),F("ncl_m_income","തൊഴിലിൽ നിന്ന് ലഭിക്കുന്ന മാസവരുമാനം (മാതാവ്)","text",{ml:false}),
F("ncl_f_tax","ഇൻകം ടാക്സ് റിട്ടേൺ ഫയൽ ചെയ്യുന്നയാളാണോ (അച്ഛൻ)"),F("ncl_m_tax","ഇൻകം ടാക്സ് റിട്ടേൺ ഫയൽ ചെയ്യുന്നയാളാണോ (അമ്മ)"),
F("ncl_f_land","എല്ലാ വില്ലേജുകളിലുമുള്ള ആകെ കൈവശമുള്ള ഭൂമിയുടെ വിസ്തീർണ്ണം (പിതാവ്)"),F("ncl_m_land","എല്ലാ വില്ലേജുകളിലുമുള്ള ആകെ കൈവശമുള്ള ഭൂമിയുടെ വിസ്തീർണ്ണം (മാതാവ്)"),
F("ncl_place","സ്ഥലം"),F("ncl_date","തീയതി","date",{ml:false}),F("ncl_declarant","പേര്"),F("ncl_signature","ഒപ്പ്")
];
var ncl={
id:"nc",
title:"Non-Creamy Layer Affidavit (2023)",
sub:"നോൺ ക്രീമിലെയർ സർട്ടിഫിക്കറ്റിനായി സമർപ്പിക്കുന്ന സത്യവാങ്മൂലം",
pages:[A],
sections:[
{title:"അപേക്ഷകന്റെ വിവരങ്ങൾ",fields:nclFields.slice(0,9)},
{title:"പിതാവിന്റെ വിവരങ്ങൾ",fields:nclFields.filter(function(f){return /^ncl_f_/.test(f.id);})},
{title:"മാതാവിന്റെ വിവരങ്ങൾ",fields:nclFields.filter(function(f){return /^ncl_m_/.test(f.id);})},
{title:"സ്ഥലം, തീയതി, ഒപ്പ്",fields:nclFields.slice(-4)}
],
render:function(_,v){
var topRows=[
[1,"സർട്ടിഫിക്കറ്റിന് എന്ത് ആവശ്യത്തിന്","ncl_purpose"],
[2,"സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ പേര്","ncl_applicant"],
[3,"സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാൾ ജനിച്ചു വളർന്ന താലൂക്ക്, വില്ലേജ്","ncl_birth"],
[4,"സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ മതം, ജാതി","ncl_caste"],
[5,"സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ തൊഴിൽ","ncl_occupation"]
].map(function(r){return '<tr><td class="nnum">'+r[0]+'</td><td>'+r[1]+'</td><td class="nanswer">'+V(v,r[2])+'</td></tr>';}).join("");
var parentRows=[
[6,"പേര്","ncl_f_name","ncl_m_name"],
[7,"ജനിച്ചു വളർന്ന താലൂക്ക്, വില്ലേജ്","ncl_f_birth","ncl_m_birth"],
[8,"മതം, ജാതി","ncl_f_caste","ncl_m_caste"],
[9,"മരണപ്പെട്ടയാളാണോ (അച്ഛൻ / അമ്മ)","ncl_f_deceased","ncl_m_deceased"],
[10,"പെൻഷണറാണോ (അച്ഛൻ / അമ്മ)","ncl_f_pension","ncl_m_pension"],
[11,"തൊഴിൽ (സർക്കാർ - പൊതുമേഖല - ഡിഫൻസ് ജീവനക്കാരാണെങ്കിൽ വകുപ്പും തസ്തികയും രേഖപ്പെടുത്തുക. മരണപ്പെട്ടയാളാണെങ്കിൽ അവസാനമായി വഹിച്ച തസ്തിക, വകുപ്പ് രേഖപ്പെടുത്തുക.)","ncl_f_job","ncl_m_job"],
[12,"തൊഴിൽ ചെയ്യുന്നത് സ്വദേശത്തോ വിദേശത്തോ","ncl_f_location","ncl_m_location"],
[13,"ജീവനക്കാരൻ / പെൻഷണറാണെങ്കിൽ സർവീസിൽ പ്രവേശിച്ച തസ്തിക, വകുപ്പ്","ncl_f_service","ncl_m_service"],
[14,"പെൻഷണറാണെങ്കിൽ റിട്ടയർ ചെയ്യുമ്പോൾ വഹിച്ച തസ്തിക, വകുപ്പ്","ncl_f_retired","ncl_m_retired"],
[15,"തൊഴിലിൽ നിന്ന് ലഭിക്കുന്ന മാസവരുമാനം (രൂപ)","ncl_f_income","ncl_m_income"],
[16,"ഇൻകം ടാക്സ് റിട്ടേൺ ഫയൽ ചെയ്യുന്നയാളാണോ (അച്ഛൻ / അമ്മ)","ncl_f_tax","ncl_m_tax"],
[17,"എല്ലാ വില്ലേജുകളിലുമുള്ള ആകെ കൈവശമുള്ള ഭൂമിയുടെ വിസ്തീർണ്ണം","ncl_f_land","ncl_m_land"]
].map(function(r){return '<tr class="nr'+r[0]+'"><td class="nnum">'+r[0]+'</td><td>'+r[1]+'</td><td class="nanswer">'+V(v,r[2])+'</td><td class="nanswer">'+V(v,r[3])+'</td></tr>';}).join("");
return '<div class="official ncl2023">'+
'<h1>നോൺ ക്രീമിലെയർ സർട്ടിഫിക്കറ്റിനായി സമർപ്പിക്കുന്ന അപേക്ഷയിൽ</h1>'+
'<h2>വില്ലേജ് ഓഫീസർ മുമ്പാകെ സമർപ്പിക്കുന്ന സത്യവാങ്മൂലം</h2>'+
'<p class="note">(എല്ലാ കോളങ്ങളും പൂരിപ്പിക്കുക. വിവരങ്ങൾ ഇല്ലാത്ത കോളങ്ങളിൽ ഇല്ല എന്ന് രേഖപ്പെടുത്തുക. 18 വയസ്സ് പൂർത്തിയാകാത്ത അപേക്ഷകരാണെങ്കിൽ രക്ഷാകർത്താവ് സത്യവാങ്മൂലം സമർപ്പിക്കുക)</p>'+
'<div class="nintro">'+B(v,"ncl_taluk",75)+' താലൂക്കിൽ '+B(v,"ncl_village",75)+' വില്ലേജിൽ '+B(v,"ncl_address",125)+' എന്ന മേൽവിലാസത്തിൽ താമസിക്കുന്ന '+B(v,"ncl_applicant",105)+' എന്ന ഞാൻ ('+B(v,"ncl_age",32)+' വയസ്സ്) വില്ലേജ് ഓഫീസർ മുമ്പാകെ സമർപ്പിക്കുന്ന സത്യവാങ്മൂലം.</div>'+
'<table class="ntop"><tbody>'+topRows+'</tbody></table>'+
'<div class="nheading">സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ മാതാപിതാക്കളുടെ വിവരങ്ങൾ</div>'+
'<table class="nparents"><thead><tr><th class="nnum"></th><th></th><th>പിതാവ്</th><th>മാതാവ്</th></tr></thead><tbody>'+parentRows+'</tbody></table>'+
'<p class="ndecl">മേൽ പ്രസ്താവിച്ച വിവരങ്ങൾ എന്റെ അറിവിലും ഉത്തമവിശ്വാസത്തിലും ശരിയാണെന്ന് സത്യവാങ്മൂലം ചെയ്യുന്നു. വസ്തുതാവിരുദ്ധമായ വിവരങ്ങൾ കണ്ടെത്തിയാൽ നിയമാനുസൃതമായ നടപടി സ്വീകരിക്കുന്നതിന് ഞാൻ വിധേയനാണെന്ന് ഇതിനാൽ ബോധ്യപ്പെടുത്തുന്നു.</p>'+
'<div class="nsign"><span>സ്ഥലം: '+V(v,"ncl_place")+'</span><span>തീയതി: '+V(v,"ncl_date")+'</span><span>പേര്: '+V(v,"ncl_declarant")+'</span><span>ഒപ്പ്: '+V(v,"ncl_signature")+'</span></div>'+
'<b class="ndocs-title">ആവശ്യമായ രേഖകൾ</b>'+
'<div class="ndocs">1. സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെ ആധാർ കാർഡ്. 2. സർട്ടിഫിക്കറ്റ് ആവശ്യമുള്ളയാളുടെയും മാതാപിതാക്കളുടെയും സ്കൂൾ സർട്ടിഫിക്കറ്റുകൾ. 3. റേഷൻ കാർഡ്. 4. മാതാപിതാക്കളുടെ എല്ലാ വില്ലേജിലെയും ഭൂനികുതി രസീതികൾ. 5. മാതാപിതാക്കൾ ബിസിനസ്സ് / പ്രൊഫഷണൽ വരുമാനക്കാരാണെങ്കിൽ കഴിഞ്ഞ മൂന്ന് വർഷത്തെ ഇൻകം ടാക്സ് റിട്ടേൺ. 6. മാതാപിതാക്കൾ സർക്കാർ / പൊതുമേഖല / ഡിഫൻസ് ജീവനക്കാരാണെങ്കിൽ ശമ്പള സർട്ടിഫിക്കറ്റ്. 7. മാതാപിതാക്കൾ പെൻഷണറാണെങ്കിൽ അവസാനമായി വഹിച്ച തസ്തിക തെളിയിക്കുന്ന രേഖ. 8. മാതാപിതാക്കൾ എ, ബി ക്ലാസ്സിൽപ്പെട്ട ജീവനക്കാരാണെങ്കിൽ ഓഫീസ് മേധാവിയിൽ നിന്ന് ലഭ്യമായ സർവീസ് സർട്ടിഫിക്കറ്റ്.</div>'+
'<div class="nfoot">VOMPM OCT 2022</div></div>';
}
};
window.AFF_HTML_CSS=(window.AFF_HTML_CSS||"")+
'.ncl2023{font-family:"Noto Sans Malayalam","Noto Sans",Arial,sans-serif;font-size:9px;line-height:1.25;padding:22px 24px!important;color:#111}.ncl2023 h1{font-size:14px!important;line-height:1.35;margin:0 0 2px!important}.ncl2023 h2{font-size:11px!important;margin:0 0 4px!important}.ncl2023 .note{font-size:7.2px;line-height:1.25;margin:0 0 7px!important}.ncl2023 .ofline{display:inline-block;border-bottom:1px solid #222;min-width:35px;min-height:13px;padding:0 2px;color:#092b69;font-weight:600;vertical-align:baseline;overflow-wrap:anywhere}.ncl2023 .nintro{font-size:8.2px;line-height:1.65;text-align:justify;margin:3px 0 7px}.ncl2023 table{width:100%;border-collapse:collapse;table-layout:fixed;margin:3px 0}.ncl2023 td,.ncl2023 th{border:1px solid #333;padding:2px 3px;vertical-align:middle;font-size:7.2px;line-height:1.2}.ncl2023 th{text-align:center;font-weight:700}.ncl2023 .nnum{width:4%;text-align:center}.ncl2023 .ntop td:nth-child(2){width:49%}.ncl2023 .ntop td:nth-child(3){width:47%}.ncl2023 .nparents td:nth-child(2){width:42%}.ncl2023 .nparents td:nth-child(3),.ncl2023 .nparents td:nth-child(4){width:27%}.ncl2023 .nanswer{color:#092b69;font-weight:600;overflow-wrap:anywhere}.ncl2023 .nr11 td{height:47px}.ncl2023 .nheading{font-weight:800;font-size:8.3px;margin:4px 0 2px}.ncl2023 .ndecl{font-size:7.3px;line-height:1.25;text-align:justify;margin:4px 0!important}.ncl2023 .nsign{display:flex;justify-content:space-between;gap:5px;border-bottom:1px solid #222;padding:3px 0 5px;font-size:7.3px;min-height:20px}.ncl2023 .ndocs-title{display:block;font-size:8px;margin:4px 0 2px}.ncl2023 .ndocs{font-size:7px;line-height:1.25;text-align:justify}.ncl2023 .nfoot{text-align:right;font-size:6.5px;margin-top:3px}';

var osFields=[
F("os_applicant","സത്യപ്രസ്താവന സമർപ്പിക്കുന്ന വ്യക്തിയുടെ പേര്"),F("os_district","ജില്ല"),F("os_taluk","താലൂക്ക്"),F("os_village","വില്ലേജ്"),F("os_panchayat","പഞ്ചായത്ത്"),
F("os_doc1_no","ആദ്യ രേഖയുടെ നമ്പർ"),F("os_doc1_type","ആദ്യ രേഖയുടെ പേര് / തരം"),F("os_doc1_name","ആദ്യ രേഖയിലെ പേര്"),F("os_doc1_address","ആദ്യ രേഖയിലെ അഡ്രസ്","textarea",{rows:2}),
F("os_doc2_no","രണ്ടാമത്തെ രേഖയുടെ നമ്പർ"),F("os_doc2_type","രണ്ടാമത്തെ രേഖയുടെ പേര് / തരം"),F("os_doc2_name","രണ്ടാമത്തെ രേഖയിലെ പേര്"),F("os_doc2_address","രണ്ടാമത്തെ രേഖയിലെ അഡ്രസ്","textarea",{rows:2}),
F("os_place","സ്ഥലം"),F("os_date","തീയതി","date",{ml:false}),F("os_sign","പേര്"),F("os_witness","സാക്ഷ്യപ്പെടുത്തിയ തീയതി","date",{ml:false}),F("os_officer_place","ഗസറ്റഡ് ഓഫീസർ സ്ഥലം"),F("os_officer_date","ഗസറ്റഡ് ഓഫീസർ തീയതി","date",{ml:false}),F("os_officer_name","ഗസറ്റഡ് ഉദ്യോഗസ്ഥന്റെ പേര്")
];
var os={id:"one_same",title:"One and Same Certificate",sub:"G.O.(P) No.1/2021/PIE&MD · 07/10/2021",pages:[A],
sections:[{title:"Applicant details",fields:osFields.slice(0,5)},{title:"First document",fields:osFields.slice(5,9)},{title:"Second document",fields:osFields.slice(9,13)},{title:"Attestation",fields:osFields.slice(13)}],
render:function(_,v){return '<div class="official"><p style="text-align:center;font-weight:700">G.O.(P) No.1/2021/PIE&amp;MD തീയതി 07/10/2021 പ്രകാരം</p><p style="text-align:center">'+B(v,"os_applicant",220)+' എന്ന ഞാൻ സമർപ്പിക്കുന്ന സത്യപ്രസ്താവന</p><p>'+B(v,"os_district",70)+' ജില്ലയിൽ '+B(v,"os_taluk",70)+' താലൂക്കിൽ '+B(v,"os_village",70)+' വില്ലേജിൽ '+B(v,"os_panchayat",90)+' പഞ്ചായത്ത് താമസിക്കുന്ന എന്റെ</p><p>'+B(v,"os_doc1_no",85)+' നമ്പർ '+B(v,"os_doc1_type",110)+' രേഖയിൽ<br>പേര് / അഡ്രസ്<br>'+B(v,"os_doc1_name",430)+'<br>'+B(v,"os_doc1_address",430)+'</p><p>എന്നും എന്റെ</p><p>'+B(v,"os_doc2_no",85)+' നമ്പർ '+B(v,"os_doc2_type",110)+' രേഖയിൽ<br>പേര് / അഡ്രസ്<br>'+B(v,"os_doc2_name",430)+'<br>'+B(v,"os_doc2_address",430)+'</p><p>എന്നുമാണ് രേഖപ്പെടുത്തിയിട്ടുള്ളത്. ഈ രണ്ടു പേരിൽ / അഡ്രസ്സിൽ അറിയപ്പെടുന്ന ആളും ഞാൻ തന്നെ ആണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു.</p><div class="two"><div><p>സ്ഥലം : '+V(v,"os_place")+'</p><p>തീയതി : '+V(v,"os_date")+'</p></div><div><p>ഒപ്പ് :</p><p>പേര് : '+V(v,"os_sign")+'</p></div></div><p style="margin-top:32px">'+B(v,"os_sign",230)+' എന്ന വ്യക്തി '+B(v,"os_witness",90)+' തീയതിയിൽ എന്റെ മുൻപിൽ വെച്ച് ഒപ്പ് വെച്ചിരിക്കുന്നു.</p><div class="two" style="margin-top:25px"><div><p>സ്ഥലം : '+V(v,"os_officer_place")+'</p><p>തീയതി : '+V(v,"os_officer_date")+'</p></div><div><p>ഗസറ്റഡ് ഉദ്യോഗസ്ഥന്റെ ഒപ്പ് : '+V(v,"os_officer_name")+'</p><p>പേര് : '+V(v,"os_officer_name")+'</p></div></div></div>';}
};

window.AFF_DEFS=D.filter(function(x){return x.id!=="nc"&&x.id!=="one_same"&&x.id!=="aadhaar_address_certificate";});
window.AFF_DEFS.unshift(ncl);window.AFF_DEFS.push(os);
})();