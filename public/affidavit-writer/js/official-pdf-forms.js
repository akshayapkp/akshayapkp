(function(){
"use strict";
var D=window.AFF_DEFS||[],
dot=function(f,p,x0,x1,y,o){return Object.assign({f:f,p:p,x:x0,y:y-0.8,w:x1-x0,h:11.5,size:10},o||{});},
cell=function(f,p,x0,x1,y0,y1,o){return Object.assign({f:f,p:p,x:x0+3,y:y0,w:x1-x0-6,h:y1-y0,size:10,vc:true},o||{});},
cellTop=function(f,p,x0,x1,y0,y1,o){return cell(f,p,x0,x1,y0,y1,Object.assign({vc:false,pad:3},o||{}));},
esc=function(x){return String(x==null?"":x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}, V=function(v,k){return esc(v&&v[k]?String(v[k]).trim():"")}, B=function(v,k,w){return '<span class="ofline" style="min-width:'+(w||90)+'px">'+(V(v,k)||"&#8203;")+'</span>'}, F=function(id,label,type,extra){return Object.assign({id:id,label:label,type:type||"text",ml:true},extra||{})}, A={html:true,w:595.3,h:841.9};
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
F("ncl_place","സ്ഥലം"),F("ncl_declarant","പേര്"),F("ncl_signature","ഒപ്പ്")
];
var ncl={
id:"nc",
title:"Non-Creamy Layer Affidavit (2023)",
sub:"ഒറിജിനൽ 2023 സത്യവാങ്മൂലം · PDF background with editable fields",
pages:[{img:"/affidavit-writer/ncl-affidavit-2023.png",w:595.3,h:841.9}],
sections:[
{title:"അപേക്ഷകന്റെ വിവരങ്ങൾ",fields:nclFields.slice(0,9)},
{title:"പിതാവിന്റെ വിവരങ്ങൾ",fields:nclFields.filter(function(f){return /^ncl_f_/.test(f.id);})},
{title:"മാതാവിന്റെ വിവരങ്ങൾ",fields:nclFields.filter(function(f){return /^ncl_m_/.test(f.id);})},
{title:"സ്ഥലം, പേര്, ഒപ്പ്",fields:nclFields.slice(-3)}
],
place:(function(){
var P=[];
var d=function(f,x0,x1,y,o){P.push(dot(f,0,x0,x1,y,o));};
var c=function(f,x0,x1,y0,y1,o){P.push(cell(f,0,x0,x1,y0,y1,o));};
var ct=function(f,x0,x1,y0,y1,o){P.push(cellTop(f,0,x0,x1,y0,y1,o));};
// Introductory dotted lines on the original scanned PDF.
d("ncl_taluk",90.7,213.2,136.4,{size:9});
d("ncl_village",255.9,378.8,136.4,{size:9});
d("ncl_address",90.7,401.6,149.3,{size:8.5});
// Applicant name and age.
d("ncl_applicant",90.7,312.1,162.3,{size:9});
d("ncl_age",368.7,417.4,162.3,{size:9});
// Applicant table, rows 1–5, original answer column.
[[185.8,203.3],[203.3,220.9],[220.9,255.1],[255.1,272.6],[272.6,290.1]].forEach(function(r,i){
ct(["ncl_purpose","ncl_applicant","ncl_birth","ncl_caste","ncl_occupation"][i],304.8,523.7,r[0],r[1],{size:9,pad:3,multi:i===2});
});
// Parent table, two original columns: Father and Mother.
var rows=[
[303.9,315.6],[315.6,332.9],[332.9,367.5],[367.5,384.8],[384.8,402.5],[402.5,420.0],
[420.0,488.4],[488.4,511.4],[511.4,534.5],[534.5,557.8],[557.8,580.8],[580.8,604.0],[604.0,627.1]
];
var fields=[
["ncl_f_name","ncl_m_name"],["ncl_f_birth","ncl_m_birth"],["ncl_f_caste","ncl_m_caste"],
["ncl_f_deceased","ncl_m_deceased"],["ncl_f_pension","ncl_m_pension"],["ncl_f_job","ncl_m_job"],
["ncl_f_location","ncl_m_location"],["ncl_f_service","ncl_m_service"],["ncl_f_retired","ncl_m_retired"],
["ncl_f_income","ncl_m_income"],["ncl_f_tax","ncl_m_tax"],["ncl_f_land","ncl_m_land"]
];
// Table rows 6–17; the tall occupation row uses top-aligned wrapping.
rows.slice(1).forEach(function(r,i){
var pair=fields[i];
var opts={size:8.6,pad:3,multi:[1,5,6,7,8,10,11].indexOf(i)!==-1};
ct(pair[0],260.7,395.3,r[0],r[1],opts);
ct(pair[1],395.3,523.7,r[0],r[1],opts);
});
// Place, declarant name and signature are typed beside their printed labels.
d("ncl_place",118,225,678.0,{size:9});
d("ncl_declarant",282,420,678.0,{size:9});
d("ncl_signature",444,523,678.0,{size:9});
return P;
})()
};
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