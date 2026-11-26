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
  if (params.get("synced") === "1") { params.delete("synced"); history.replaceState(null, "", window.location.pathname + (params.toString() ? "?" + params.toString() : "")); }
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

  // Keep rich text safe before it is stored or inserted into the printable document.
  function sanitizeRichHtml(html) {
    var parsed = new DOMParser().parseFromString("<div>" + String(html || "") + "</div>", "text/html");
    var source = parsed.body.firstElementChild;
    var allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "OL", "UL", "LI", "H1", "H2", "H3", "BLOCKQUOTE", "A", "SPAN"]);
    function clean(node) {
      var out = document.createDocumentFragment();
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) { out.appendChild(document.createTextNode(child.nodeValue || "")); return; }
        if (child.nodeType !== 1) return;
        var tag = child.tagName;
        if (tag === "OL") {
          var currentType = null, currentList = null;
          Array.prototype.forEach.call(child.children, function (item) {
            if (item.tagName !== "LI") return;
            var listType = item.getAttribute("data-list") === "bullet" ? "UL" : "OL";
            if (listType !== currentType) {
              currentType = listType;
              currentList = document.createElement(listType.toLowerCase());
              out.appendChild(currentList);
            }
            currentList.appendChild(clean(item));
          });
          return;
        }
        if (!allowed.has(tag)) { out.appendChild(clean(child)); return; }
        var el = document.createElement(tag.toLowerCase());
        var cls = child.getAttribute("class") || "";
        var safeClasses = cls.split(/\s+/).filter(function (name) {
          return /^ql-align-(center|right|justify)$/.test(name) || /^ql-indent-[1-8]$/.test(name);
        });
        if (safeClasses.length) el.setAttribute("class", safeClasses.join(" "));
        var style = child.getAttribute("style") || "";
        var align = /text-align\s*:\s*(center|right|justify)/i.exec(style);
        var color = /(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8}|rgb\([0-9\s,%.]+\)|[a-z]{3,20})\s*(?:;|$)/i.exec(style);
        var bg = /(?:^|;)\s*background-color\s*:\s*(#[0-9a-f]{3,8}|rgb\([0-9\s,%.]+\)|[a-z]{3,20})\s*(?:;|$)/i.exec(style);
        var safeStyle = [];
        if (align) safeStyle.push("text-align:" + align[1].toLowerCase());
        if (color) safeStyle.push("color:" + color[1]);
        if (bg) safeStyle.push("background-color:" + bg[1]);
        if (safeStyle.length) el.setAttribute("style", safeStyle.join(";"));
        if (tag === "A") {
          var href = child.getAttribute("href") || "";
          try {
            var url = new URL(href, window.location.origin);
            if (["http:", "https:", "mailto:"].indexOf(url.protocol) !== -1) {
              el.setAttribute("href", url.href);
              el.setAttribute("target", "_blank");
              el.setAttribute("rel", "noopener noreferrer");
            }
          } catch (_) {}
        }
        el.appendChild(clean(child));
        out.appendChild(el);
      });
      return out;
    }
    var holder = document.createElement("div");
    holder.appendChild(clean(source));
    return holder.innerHTML;
  }

  function declarationHtml(value) {
    var raw = String(value || "");
    if (!raw) return "";
    // Older templates stored plain text; preserve their original line breaks.
    if (!/<[a-z][\s\S]*>/i.test(raw)) return escapeHtml(raw).replace(/\n/g, "<br>");
    return sanitizeRichHtml(raw);
  }

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
        var declaration = declarationHtml(form.declaration || "");
        return '<div class="custom-aff"><h2>' + escapeHtml(form.title) + '</h2>' +
          (form.sub ? '<p class="sub">' + escapeHtml(form.sub) + '</p>' : "") +
          (declaration ? '<div class="decl">' + declaration + '</div>' : "") +
          rows +
          '<div class="sign"><div>Applicant / Declarant Signature</div><div>Place &amp; Date</div></div>' +
          '<p style="margin-top:18px;text-align:center;font-size:11px">Akshaya Center PKP</p></div>';
      }
    };
  }
  // Keep shared Supabase templates in sync while retaining local fallback if the migration is not yet applied.
  if (window.fetch) {
    fetch("/api/affidavit-form-templates", { cache: "no-store", credentials: "same-origin" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        if (!payload || !Array.isArray(payload.forms)) return;
        var remote = payload.forms;
        var local = readForms();
        if (!remote.length && local.length && isAdmin) {
          return Promise.all(local.map(function (form) {
            return fetch("/api/affidavit-form-templates", {
              method: "POST", credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ form: form })
            }).then(function (response) { return response.ok; }).catch(function () { return false; });
          }));
        }
        var remoteJson = JSON.stringify(remote);
        var localJson = JSON.stringify(local);
        if (remoteJson !== localJson) {
          localStorage.setItem(KEY, remoteJson);
          if (params.get("synced") !== "1") {
            var nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set("synced", "1");
            window.location.replace(nextUrl.toString());
          }
        }
      }).catch(function () {});
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
      '<label style="display:block;font-size:12px;font-weight:700;margin:12px 0 5px">Declaration / instructions (optional)</label><div id="cfDeclarationEditor" class="cf-editor" style="width:100%;border:1px solid #cbd5e1;border-radius:9px;overflow:hidden;background:#fff"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px"><b style="font-size:14px">Form fields</b><button id="cfAddField" type="button" style="border:0;border-radius:9px;padding:8px 12px;background:#eaf2ff;color:#1d4ed8;font-weight:700;cursor:pointer">＋ Add field</button></div>' +
      '<div id="cfFields"></div><div id="cfSaved" style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px"></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:9px;margin-top:18px"><button id="cfCancel" type="button" style="border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:10px 15px;cursor:pointer">Cancel</button><button id="cfSave" type="button" style="border:0;background:#2563eb;color:#fff;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer">Save form</button></div>' +
      '<p style="font-size:11px;color:#64748b;margin:12px 0 0">Note: custom form templates are stored in this browser only in this first version. Do not enter Aadhaar numbers or sensitive customer details into the template builder.</p></div>';
    document.body.appendChild(overlay);
    var declarationEditor = null;
    var declarationFallback = null;
    var editorHost = overlay.querySelector("#cfDeclarationEditor");
    if (window.Quill) {
      declarationEditor = new window.Quill(editorHost, {
        theme: "snow",
        placeholder: "Type the declaration text that should appear on the printed form…",
        modules: { toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link"],
          ["clean"]
        ] }
      });
      declarationEditor.root.setAttribute("aria-label", "Declaration rich text editor");
      declarationEditor.root.setAttribute("lang", "ml");
    } else {
      declarationFallback = document.createElement("textarea");
      declarationFallback.rows = 5;
      declarationFallback.placeholder = "Type the declaration text that should appear on the printed form";
      declarationFallback.style.cssText = "width:100%;padding:11px;border:0;resize:vertical;font:inherit";
      editorHost.appendChild(declarationFallback);
    }
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
          var deleteId = btn.getAttribute("data-remove");
          fetch("/api/affidavit-form-templates?id=" + encodeURIComponent(deleteId), { method: "DELETE", credentials: "same-origin" })
            .then(function (response) {
              if (!response.ok && response.status !== 503) throw new Error("Delete failed");
              localStorage.setItem(KEY, JSON.stringify(readForms().filter(function (f) { return f.id !== deleteId; })));
              window.location.reload();
            }).catch(function () { alert("Could not delete this form from the shared database. Please check the connection."); });
        });
      });
    }
    addField("Applicant name", "text");
    addField("Address", "textarea");
    addField("Place", "text");
    addField("Date", "date");
    refreshSaved();
    overlay.querySelector("#cfAddField").addEventListener("click", function () { addField("", "text"); });
    function close() { if (declarationEditor) declarationEditor = null; overlay.remove(); }
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
      forms.push({ id: id, title: title, sub: overlay.querySelector("#cfSub").value.trim(), declaration: (declarationEditor ? (declarationEditor.getText().trim() ? sanitizeRichHtml(declarationEditor.root.innerHTML) : "") : (declarationFallback ? escapeHtml(declarationFallback.value.trim()).replace(/\n/g, "<br>") : "")), fields: fields });
      var newForm = forms[forms.length - 1];
      overlay.querySelector("#cfSave").disabled = true;
      overlay.querySelector("#cfSave").textContent = "Saving…";
      fetch("/api/affidavit-form-templates", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: newForm })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (payload) {
          if (!response.ok) {
            if (response.status === 503) {
              localStorage.setItem(KEY, JSON.stringify(forms));
              alert("The shared form database is not ready. This form was saved in this browser only. Apply the Supabase migration to share it with staff.");
              window.location.reload();
              return;
            }
            throw new Error(payload.error || "Could not save the form.");
          }
          localStorage.setItem(KEY, JSON.stringify(forms));
          alert("Form saved to the shared form library.");
          window.location.reload();
        });
      }).catch(function (error) {
        overlay.querySelector("#cfSave").disabled = false;
        overlay.querySelector("#cfSave").textContent = "Save form";
        alert(error.message || "Could not save the form.");
      });
    });
  }
})();
