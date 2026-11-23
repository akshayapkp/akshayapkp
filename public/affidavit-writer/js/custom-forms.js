(function () {
  "use strict";
  var KEY = "akshaya_affidavit_custom_forms_v1";
  var params = new URLSearchParams(window.location.search);
  var isAdmin = (params.get("role") || "").toLowerCase() === "admin";
  var escapeHtml = function (value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var readForms = function () {
    try {
      var value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  };
  var customForms = readForms();
  window.AFF_DEFS = window.AFF_DEFS || [];
  window.AFF_HTML_CSS = (window.AFF_HTML_CSS || "") +
    ".custom-aff{font-family:'Noto Sans Malayalam','Noto Sans',Arial,sans-serif;font-size:14px;line-height:1.65;color:#111;text-align:left}" +
    ".custom-aff h2{text-align:center;font-size:17px;margin:0 0 8px;text-transform:uppercase}" +
    ".custom-aff .sub{text-align:center;font-size:12px;margin:0 0 18px}" +
    ".custom-aff .decl{white-space:pre-wrap;margin:12px 0 18px;text-align:justify}" +
    ".custom-aff .field{display:flex;gap:8px;align-items:baseline;margin:0 0 12px;min-height:25px}" +
    ".custom-aff .field .label{font-weight:600;flex:0 0 auto;max-width:45%}" +
    ".custom-aff .field .value{border-bottom:1px dotted #111;flex:1;min-height:22px;color:#0a1d52;font-weight:600;overflow-wrap:anywhere}" +
    ".custom-aff .field.block{display:block}.custom-aff .field.block .value{display:block;min-height:42px;margin-top:4px}" +
    ".custom-aff .section{font-weight:700;border-bottom:1px solid #777;margin:15px 0 8px;padding-bottom:3px}" +
    ".custom-aff .sign{display:flex;justify-content:space-between;gap:30px;margin-top:48px}.custom-aff .sign div{width:46%;border-top:1px solid #222;padding-top:6px;text-align:center;font-size:12px}";
  function makeDefinition(form) {
    var fields = (form.fields || []).map(function (field, index) {
      return {
        id: field.id || ("custom_field_" + index),
        label: field.label || ("Field " + (index + 1)),
        type: field.type || "text",
        ml: false,
        rows: field.type === "textarea" ? 2 : undefined,
        today: field.type === "date" && field.today === true
      };
    });
    return {
      id: form.id,
      title: form.title,
      sub: form.sub || "Custom form created by Akshaya PKP administrator",
      en: true,
      pages: [{ html: true, w: 595.3, h: 841.9 }],
      sections: [{ title: "Enter details", fields: fields }],
      render: function (_page, values) {
        var rows = fields.map(function (field) {
          var value = values[field.id] || "";
          if (field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            var parts = value.split("-");
            value = parts[2] + "-" + parts[1] + "-" + parts[0];
          }
          var block = field.type === "textarea" ? " block" : "";
          return '<div class="field' + block + '"><span class="label">' +
            escapeHtml(field.label) + ':</span><span class="value">' +
            (value ? escapeHtml(value).replace(/\n/g, "<br>") : "&#8203;") +
            '</span></div>';
        }).join("");
        var declaration = escapeHtml(form.declaration || "").replace(/\n/g, "<br>");
        return '<div class="custom-aff"><h2>' + escapeHtml(form.title) + '</h2>' +
          (form.sub ? '<p class="sub">' + escapeHtml(form.sub) + '</p>' : "") +
          (declaration ? '<div class="decl">' + declaration + '</div>' : "") +
          rows +
          '<div class="sign"><div>Applicant / Declarant Signature</div><div>Place &amp; Date</div></div>' +
          '<p style="margin-top:18px;text-align:center;font-size:11px">Akshaya Center PKP</p></div>';
      }
    };
  }
  customForms.forEach(function (form) {
    if (form && form.id && form.title && Array.isArray(form.fields)) {
      window.AFF_DEFS.push(makeDefinition(form));
    }
  });
  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("customFormBtn");
    if (!button || !isAdmin) return;
    button.style.display = "inline-flex";
    button.addEventListener("click", openBuilder);
  });
  function openBuilder() {
    if (!isAdmin || document.getElementById("customFormBuilder")) return;
    var overlay = document.createElement("div");
    overlay.id = "customFormBuilder";
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Inter,Arial,sans-serif";
    overlay.innerHTML =
      '<div style="width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.25);color:#172033">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><h2 style="margin:0;font-size:20px">Admin · Form Builder</h2><p style="margin:5px 0 16px;color:#64748b;font-size:13px">Create a reusable form template for this browser.</p></div><button id="cfClose" type="button" style="border:0;background:#eef2f7;border-radius:10px;padding:9px 12px;cursor:pointer">✕</button></div>' +
      '<label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">Form title</label><input id="cfTitle" placeholder="e.g. Residence Certificate Affidavit" style="width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px">' +
      '<label style="display:block;font-size:12px;font-weight:700;margin:12px 0 5px">Subtitle / description</label><input id="cfSub" placeholder="Optional short description" style="width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px">' +
      '<label style="display:block;font-size:12px;font-weight:700;margin:12px 0 5px">Declaration / instructions (optional)</label><textarea id="cfDeclaration" rows="3" placeholder="Type the declaration text that should appear on the printed form" style="width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px;resize:vertical"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px"><b style="font-size:14px">Form fields</b><button id="cfAddField" type="button" style="border:0;border-radius:9px;padding:8px 12px;background:#eaf2ff;color:#1d4ed8;font-weight:700;cursor:pointer">＋ Add field</button></div>' +
      '<div id="cfFields"></div><div id="cfSaved" style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px"></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:9px;margin-top:18px"><button id="cfCancel" type="button" style="border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:10px 15px;cursor:pointer">Cancel</button><button id="cfSave" type="button" style="border:0;background:#2563eb;color:#fff;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer">Save form</button></div>' +
      '<p style="font-size:11px;color:#64748b;margin:12px 0 0">Note: custom form templates are stored in this browser only in this first version. Do not enter Aadhaar numbers or sensitive customer details into the template builder.</p></div>';
    document.body.appendChild(overlay);
    var fieldRoot = overlay.querySelector("#cfFields");
    var savedRoot = overlay.querySelector("#cfSaved");
    function addField(label, type) {
      var row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:minmax(0,1fr) 150px 38px;gap:8px;margin:8px 0";
      row.innerHTML = '<input class="cf-label" placeholder="Field label" value="' + escapeHtml(label || "") + '" style="min-width:0;padding:10px;border:1px solid #cbd5e1;border-radius:8px">' +
        '<select class="cf-type" style="padding:9px;border:1px solid #cbd5e1;border-radius:8px"><option value="text">Text</option><option value="textarea">Long text</option><option value="date">Date</option></select>' +
        '<button type="button" title="Remove field" style="border:0;background:#fee2e2;color:#b91c1c;border-radius:8px;cursor:pointer">✕</button>';
      row.querySelector(".cf-type").value = type || "text";
      row.querySelector("button").addEventListener("click", function () { row.remove(); });
      fieldRoot.appendChild(row);
    }
    function refreshSaved() {
      var list = readForms();
      if (!list.length) { savedRoot.innerHTML = '<p style="font-size:12px;color:#64748b">No admin-added forms yet.</p>'; return; }
      savedRoot.innerHTML = '<b style="font-size:13px">Saved custom forms</b>' + list.map(function (f) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #edf2f7"><span style="font-size:13px">' + escapeHtml(f.title) + '</span><button type="button" data-remove="' + escapeHtml(f.id) + '" style="border:0;background:#fff1f2;color:#be123c;border-radius:7px;padding:6px 9px;cursor:pointer">Delete</button></div>';
      }).join("");
      savedRoot.querySelectorAll("[data-remove]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!window.confirm("Delete this custom form?")) return;
          localStorage.setItem(KEY, JSON.stringify(readForms().filter(function (f) { return f.id !== btn.getAttribute("data-remove"); })));
          window.location.reload();
        });
      });
    }
    addField("Applicant name", "text");
    addField("Address", "textarea");
    addField("Place", "text");
    addField("Date", "date");
    refreshSaved();
    overlay.querySelector("#cfAddField").addEventListener("click", function () { addField("", "text"); });
    function close() { overlay.remove(); }
    overlay.querySelector("#cfClose").addEventListener("click", close);
    overlay.querySelector("#cfCancel").addEventListener("click", close);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    overlay.querySelector("#cfSave").addEventListener("click", function () {
      var title = overlay.querySelector("#cfTitle").value.trim();
      if (!title) { alert("Please enter a form title."); return; }
      var fields = Array.prototype.slice.call(fieldRoot.querySelectorAll(".cf-label")).map(function (input, index) {
        return { id: "f_" + index, label: input.value.trim(), type: input.parentElement.querySelector(".cf-type").value };
      }).filter(function (field) { return field.label; });
      if (!fields.length) { alert("Add at least one field."); return; }
      var id = "custom_" + Date.now();
      var forms = readForms();
      forms.push({ id: id, title: title, sub: overlay.querySelector("#cfSub").value.trim(), declaration: overlay.querySelector("#cfDeclaration").value.trim(), fields: fields });
      try {
        localStorage.setItem(KEY, JSON.stringify(forms));
        alert("Form saved. The form list will refresh now.");
        window.location.reload();
      } catch (_) { alert("Could not save the form. Browser storage may be full."); }
    });
  }
})();
