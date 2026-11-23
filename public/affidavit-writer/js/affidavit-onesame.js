/* One and Same declaration (വൺ ആന്റ് സെയിം സംബന്ധിച്ച സത്യപ്രസ്താവന).
 *
 * Built as a real HTML page (the full text of the form), not a scanned page image with text laid over it.
 * Every blank is a slot that fills in while typing; the words that do not apply (മകൻ/മകൾ/ഭാര്യ, എന്റെ/എന്റെ മകന്റെ/...) are struck through.
 * The table of names / documents can take as many rows as needed ("Add row"); when the rows no longer fit on the page the
 * table carries on over the next page and the closing part (place, date, signature, gazetted officer box) follows it.
 *
 * A def with `render(pageIndex, vals)` and `pageCount(vals)` is drawn by affidavit-generator.js through the same
 * preview / print / PDF code as the passport annexures. Loaded after affidavit-annexures.js, before affidavit-generator.js.
 */
(function() {
	'use strict';

	var esc = function(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
			return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
		});
	};
	var fmtDate = function(iso) {
		var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
		return m ? (m[3] + '-' + m[2] + '-' + m[1]) : (iso || '');
	};
	var txt = function(vals, id) { var x = vals[id]; return typeof x === 'string' ? x.trim() : ''; };

	/* ---------------------------------------------------------------- page CSS */
	var CSS =
		'.os{font-family:"Noto Sans Malayalam","Noto Sans",Arial,sans-serif;font-weight:600;font-size:15px;line-height:1.5;text-align:left;color:#000}' +
		'.os p{margin:0 0 14px}' +
		'.os .t{text-align:center;font-size:17.5px;font-weight:700;text-decoration:underline;text-underline-offset:6px;margin:6px 0 24px}' +
		'.os .pa{line-height:2.3;margin-bottom:10px}' +
		'.os .ind{text-indent:46px}' +
		'.os .ms{border-bottom:1.4px solid #111;color:#0a1d52;font-weight:600;padding:0 6px}' +
		'.os .ms.e{display:inline-block;vertical-align:bottom;height:1.2em}' +
		'.os .st{text-decoration:line-through;text-decoration-thickness:1.4px}' +
		'.os table{width:100%;border-collapse:collapse;table-layout:fixed;margin:4px 0 18px}' +
		'.os th,.os td{border:1.4px solid #111;padding:7px 10px;vertical-align:top}' +
		'.os th{text-align:center;font-weight:700;height:38px;vertical-align:middle}' +
		'.os td{height:46px}' +
		'.os td.n{text-align:center;font-weight:700}' +
		'.os td.v{color:#0a1d52;font-weight:600;overflow-wrap:anywhere}' +
		'.os .cn{font-size:12.5px;font-weight:500;text-align:right;margin:0 0 6px;color:#444}' +
		'.os .pd{margin:0 0 6px;line-height:1.9}' +
		'.os .sg{text-align:right;margin:26px 0 12px;padding-right:6px}' +
		'.os .gz{border:1.4px solid #111;height:172px;text-align:center;padding:3px 8px;font-weight:700;margin-top:6px}';

	/* ---------------------------------------------------------------- helpers */
	function F(id, label, o) { return Object.assign({ id: id, label: label, type: 'text', ml: true }, o || {}); }

	/* "മകൻ/മകൾ/ഭാര്യ" with the words that were NOT chosen struck through (nothing chosen -> plain) */
	function alt(words, chosen) {
		if (chosen == null || chosen === '' || words.indexOf(chosen) === -1) return words.join('/');
		return words.map(function(w) { return w === chosen ? w : '<span class="st">' + w + '</span>'; }).join('/');
	}

	/* a blank with the typed value on it; an empty one keeps a width so the line still looks like a form */
	function slot(v, minw) {
		return v ? '<span class="ms">' + esc(v) + '</span>' : '<span class="ms e" style="min-width:' + (minw || 120) + 'px">&#8203;</span>';
	}

	var REL = [
		{ v: 'മകൻ', t: 'മകൻ (Son of)' },
		{ v: 'മകൾ', t: 'മകൾ (Daughter of)' },
		{ v: 'ഭാര്യ', t: 'ഭാര്യ (Wife of)' }
	];
	var SUBJ = [
		{ v: 'എന്റെ', t: 'എന്റെ (my own name)' },
		{ v: 'എന്റെ മകന്റെ', t: 'എന്റെ മകന്റെ (my son’s name)' },
		{ v: 'എന്റെ മകളുടെ', t: 'എന്റെ മകളുടെ (my daughter’s name)' }
	];

	/* ---------------------------------------------------------------- layout (px at 96 dpi; the usable page height is ~1036) */
	/* The estimates were calibrated against a real render (Malayalam 15px bold): ~9.6px per character, 34.5px per ruled line,
	   a two-line table row is ~54px. They err on the safe side, so a form whose closing part does not fit moves it to the next page. */
	var CAP = 1010; // usable page height is ~1036px
	var TITLE_H = 56; // title
	var SECOND_H = 79; // the "…രേഖകളിൽ രേഖപ്പെടുത്തപ്പെട്ടിട്ടുണ്ട്." sentence
	var THEAD_H = 72; // table header row (can wrap to two lines)
	var CONT_H = 98; // table header + the "(തുടർച്ച)" note on a continuation page
	var FOOT_H = 425; // closing sentence + place / date + signature line + gazetted officer box

	function lines(s, cpl) {
		s = (s || '').trim();
		if (!s) return 1;
		var n = 0;
		s.split(/\n/).forEach(function(p) { n += Math.max(1, Math.ceil(p.length / cpl)); });
		return n;
	}

	function rowH(r) {
		return Math.max(46, 12 + 21 * Math.max(lines(r.name, 24), lines(r.doc, 27)));
	}

	function headH(vals) {
		var w = 113 * 9.6; // the printed words of the first paragraph
		[['taluk', 150], ['village', 150], ['address', 330], ['guardian', 190], ['name', 230], ['age', 70]].forEach(function(k) {
			var t = txt(vals, k[0]);
			w += t ? t.length * 9.6 + 14 : k[1];
		});
		return TITLE_H + Math.ceil(w / 610) * 34.5 + 10 + SECOND_H + THEAD_H;
	}

	/* which rows go on which page: [{head, rows:[i..], foot}] */
	function plan(vals) {
		var rows = vals.docs || [];
		var pages = [];
		var cur = { head: true, rows: [], foot: false };
		var used = headH(vals);
		rows.forEach(function(r, i) {
			var h = rowH(r || {});
			if (used + h > CAP && cur.rows.length) {
				pages.push(cur);
				cur = { head: false, rows: [], foot: false };
				used = CONT_H;
			}
			cur.rows.push(i);
			used += h;
		});
		if (used + FOOT_H > CAP) {
			// the closing part does not fit under the table: take the last two rows with it, so the signature page is never empty of content
			var carry = cur.rows.length > 2 ? cur.rows.splice(-2) : [];
			pages.push(cur);
			cur = { head: false, rows: carry, foot: false };
		}
		cur.foot = true;
		pages.push(cur);
		return pages;
	}

	/* ---------------------------------------------------------------- the form */
	function headHtml(vals) {
		var v = function(id) { return txt(vals, id); };
		return '<p class="t">വൺ ആന്റ് സെയിം സംബന്ധിച്ച സത്യപ്രസ്താവന</p>' +
			'<p class="pa">' + slot(v('taluk'), 150) + ' താലൂക്ക് ' + slot(v('village'), 150) + ' വില്ലേജിൽ ' +
			slot(v('address'), 330) + ' മേൽവിലാസത്തിൽ താമസിക്കുന്ന ' + slot(v('guardian'), 190) + ' ' +
			alt(['മകൻ', 'മകൾ', 'ഭാര്യ'], v('rel')) + ' യായ ' + slot(v('name'), 230) + ' എന്ന ഞാൻ (വയസ്സ് ' + slot(v('age'), 70) + ') സമർപ്പിക്കുന്ന സത്യപ്രസ്താവന.</p>' +
			'<p class="pa ind">' + alt(['എന്റെ', 'എന്റെ മകന്റെ', 'എന്റെ മകളുടെ'], v('subject')) + ' പേര് താഴെ കാണിച്ച പ്രകാരം വിവിധ രേഖകളിൽ രേഖപ്പെടുത്തപ്പെട്ടിട്ടുണ്ട്.</p>';
	}

	function tableHtml(vals, idx, cont) {
		var rows = vals.docs || [];
		var h = (cont ? '<p class="cn">(തുടർച്ച)</p>' : '') +
			'<table><colgroup><col style="width:9%"><col style="width:42%"><col style="width:49%"></colgroup>' +
			'<thead><tr><th></th><th>പേര്</th><th>ഏത് രേഖ പ്രകാരം (നമ്പർ സഹിതം)</th></tr></thead><tbody>';
		idx.forEach(function(i) {
			var r = rows[i] || {};
			h += '<tr><td class="n">' + (i + 1) + '</td><td class="v">' + esc((r.name || '').trim()) + '</td><td class="v">' + esc((r.doc || '').trim()) + '</td></tr>';
		});
		return h + '</tbody></table>';
	}

	function footHtml(vals) {
		return '<p class="pa ind">മേൽ പ്രസ്താവിച്ച വ്യക്തികൾ ഒരാൾ തന്നെയാണെന്ന് ഇതിനാൽ സത്യപ്രസ്താവന ചെയ്യുന്നു.</p>' +
			'<p class="pd" style="margin-top:22px">സ്ഥലം– <span class="hv" style="color:#0a1d52">' + esc(txt(vals, 'place')) + '</span></p>' +
			'<p class="pd">തീയതി– <span class="hv" style="color:#0a1d52">' + esc(fmtDate(vals.date)) + '</span></p>' +
			'<p class="sg">സത്യപ്രസ്താവകന്റെ പേരും ഒപ്പും</p>' +
			'<div class="gz">ഗസറ്റഡ് ഓഫീസറുടെ സാക്ഷ്യപ്പെടുത്തൽ</div>';
	}

	var def = {
		id: 'one_same',
		title: 'One and Same Declaration (വൺ ആന്റ് സെയിം)',
		sub: 'Declaration that the names in different documents are one person – table grows with extra rows (1 page, more if needed)',
		pages: [{ html: true, w: 595.3, h: 841.9 }],
		sections: [{
				title: 'Declarant (സത്യപ്രസ്താവകൻ)',
				fields: [
					F('taluk', 'Taluk (താലൂക്ക്)'),
					F('village', 'Village (വില്ലേജ്)'),
					F('address', 'Address – residing at (മേൽവിലാസം)', { type: 'textarea', rows: 3 }),
					F('guardian', 'Father’s / husband’s name (പിതാവ് / ഭർത്താവിന്റെ പേര്)'),
					{ id: 'rel', label: 'Declarant is the', type: 'radio', ml: false, options: REL, value: '' },
					F('name', 'Declarant name (പേര്)'),
					F('age', 'Age (വയസ്സ്)', { ml: false, inputmode: 'numeric' })
				]
			},
			{
				title: 'Whose name is written in the documents',
				fields: [
					{ id: 'subject', label: 'The names below are of', type: 'radio', ml: false, options: SUBJ, value: '' }
				]
			},
			{
				title: 'Names & documents (പേര് / രേഖ, നമ്പർ സഹിതം)',
				fields: [{
					id: 'docs',
					type: 'table',
					max: 30,
					rows: 4,
					cols: [
						{ id: 'name', label: 'Name (പേര്)', ml: true, w: 1 },
						{ id: 'doc', label: 'As per document, with number (രേഖ, നമ്പർ)', ml: true, w: 1 }
					]
				}]
			},
			{
				title: 'Place & date',
				fields: [
					F('place', 'Place (സ്ഥലം)'),
					F('date', 'Date (തീയതി)', { type: 'date', ml: false, today: true })
				]
			}
		],
		pageCount: function(vals) { return plan(vals).length; },
		render: function(pi, vals) {
			var p = plan(vals)[pi];
			if (!p) return '';
			return '<div class="os">' + (p.head ? headHtml(vals) : '') +
				((p.head || p.rows.length) ? tableHtml(vals, p.rows, !p.head) : '') +
				(p.foot ? footHtml(vals) : '') + '</div>';
		}
	};

	window.AFF_HTML_CSS = (window.AFF_HTML_CSS || '') + CSS;
	window.AFF_DEFS = window.AFF_DEFS || [];
	window.AFF_DEFS.push(def);

	/* page CSS for the on-screen preview (print / PDF get it from affidavit-generator.js) */
	var st = document.createElement('style');
	st.id = 'affOneSameCss';
	st.textContent = CSS;
	document.head.appendChild(st);
})();