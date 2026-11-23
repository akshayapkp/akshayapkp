/* Affidavit writer – form, English→Malayalam typing, live preview, print and PDF download.
 * Needs: assets/js/affidavit-defs.js (window.AFF_DEFS) and window.AFF_CFG = {base, translitUrl}. */
(function() {
	'use strict';

	var CFG = window.AFF_CFG || {};
	var DEFS = window.AFF_DEFS || [];
	var A4W = 793.7; // A4 width in CSS px
	var A4H = 1122.5;

	var $ = function(id) { return document.getElementById(id); };
	var esc = function(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
			return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
		});
	};

	var state = {
		def: null,
		vals: {},
		touched: {},
		ml: true
	};

	/* ================================================================
	   English → Malayalam transliteration
	   ================================================================ */
	var tCache = {};

	function tlFallback(word) {
		var IND = { a: 'അ', aa: 'ആ', i: 'ഇ', ee: 'ഈ', u: 'ഉ', oo: 'ഊ', e: 'എ', ae: 'ഏ', ai: 'ഐ', o: 'ഒ', oa: 'ഓ', au: 'ഔ' };
		var MAT = { a: '', aa: 'ാ', i: 'ി', ee: 'ീ', u: 'ു', oo: 'ൂ', e: 'െ', ae: 'േ', ai: 'ൈ', o: 'ൊ', oa: 'ോ', au: 'ൗ' };
		var VOW = ['aa', 'ee', 'oo', 'ae', 'ai', 'oa', 'au', 'a', 'i', 'u', 'e', 'o'];
		var CON = {
			'chh': 'ഛ', 'ksh': 'ക്ഷ', 'nj': 'ഞ', 'ng': 'ങ', 'ch': 'ച', 'kh': 'ഖ', 'gh': 'ഘ', 'jh': 'ഝ', 'th': 'ത', 'dh': 'ധ', 'bh': 'ഭ', 'ph': 'ഫ', 'zh': 'ഴ', 'sh': 'ശ',
			'k': 'ക', 'g': 'ഗ', 'c': 'ക', 'j': 'ജ', 'T': 'ട', 't': 'ത', 'D': 'ഡ', 'd': 'ദ', 'N': 'ണ', 'n': 'ന', 'p': 'പ', 'f': 'ഫ', 'b': 'ബ', 'm': 'മ', 'y': 'യ',
			'r': 'ര', 'R': 'റ', 'l': 'ല', 'L': 'ള', 'v': 'വ', 'w': 'വ', 'S': 'ഷ', 's': 'സ', 'h': 'ഹ', 'q': 'ക', 'x': 'ക്സ', 'z': 'സ'
		};
		var CONK = Object.keys(CON).sort(function(a, b) { return b.length - a.length; });
		var CHILLU = { 'ന': 'ൻ', 'ല': 'ൽ', 'ര': 'ർ', 'ണ': 'ൺ', 'ള': 'ൾ' };
		var out = '',
			i = 0,
			lastCon = false;
		var w = word;

		function vowelAt(pos) {
			var low = w.substr(pos).toLowerCase();
			for (var j = 0; j < VOW.length; j++)
				if (low.indexOf(VOW[j]) === 0) return VOW[j];
			return null;
		}
		while (i < w.length) {
			var v = vowelAt(i);
			if (v) {
				out += lastCon ? MAT[v] : IND[v];
				lastCon = false;
				i += v.length;
				continue;
			}
			var c = null;
			for (var k = 0; k < CONK.length; k++) {
				var seg = w.substr(i, CONK[k].length);
				if (seg === CONK[k] || seg.toLowerCase() === CONK[k]) {
					c = CONK[k];
					break;
				}
			}
			if (!c) {
				out += w[i];
				i++;
				lastCon = false;
				continue;
			}
			if (lastCon) out += '്';
			var ch = CON[c];
			i += c.length;
			var nv = vowelAt(i);
			if (!nv && i >= w.length) { // word-final consonant
				if (CHILLU[ch]) out += CHILLU[ch];
				else if (ch === 'മ') out += 'ം';
				else out += ch + '്';
				lastCon = false;
			} else {
				out += ch;
				lastCon = true;
			}
		}
		return out;
	}

	function fetchJson(url, ms) {
		var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
		var t = setTimeout(function() { if (ctl) ctl.abort(); }, ms || 3500);
		return fetch(url, { signal: ctl ? ctl.signal : undefined, credentials: url.indexOf(location.origin) === 0 ? 'same-origin' : 'omit' })
			.then(function(r) { if (!r.ok) throw new Error('http'); return r.json(); })
			.finally(function() { clearTimeout(t); });
	}

	function parseGoogle(j) {
		if (j && j[0] === 'SUCCESS' && j[1] && j[1][0] && j[1][0][1]) return j[1][0][1].slice(0, 4);
		throw new Error('bad');
	}

	function suggest(word) {
		if (tCache[word]) return Promise.resolve(tCache[word]);
		var q = encodeURIComponent(word);
		var direct = 'https://inputtools.google.com/request?text=' + q + '&itc=ml-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=jsapi';
		return fetchJson(direct, 3000).then(parseGoogle)
			.catch(function() {
				if (!CFG.translitUrl) throw new Error('no proxy');
				return fetchJson(CFG.translitUrl + '?q=' + q, 4000).then(parseGoogle);
			})
			.catch(function() { return [tlFallback(word)]; })
			.then(function(list) {
				list = list.filter(function(x, i) { return x && list.indexOf(x) === i; });
				tCache[word] = list;
				return list;
			});
	}

	/* ---- suggestion popup bound to one input at a time ---- */
	var pop = null,
		popState = { el: null, list: [], sel: 0, start: 0, end: 0, word: '', req: 0 };

	function ensurePop() {
		if (pop) return;
		pop = document.createElement('div');
		pop.className = 'ml-pop';
		pop.addEventListener('mousedown', function(e) { e.preventDefault(); });
		pop.addEventListener('click', function(e) {
			var it = e.target.closest('[data-i]');
			if (it) commit(+it.getAttribute('data-i'));
		});
		document.body.appendChild(pop);
	}

	function hidePop() {
		if (pop) pop.style.display = 'none';
		popState.list = [];
		popState.word = '';
	}

	function tokenAt(el) {
		var pos = el.selectionStart,
			v = el.value;
		var s = pos;
		while (s > 0 && /[A-Za-z]/.test(v[s - 1])) s--;
		return { start: s, end: pos, word: v.slice(s, pos) };
	}

	function showPop(el) {
		ensurePop();
		var r = el.getBoundingClientRect();
		var html = popState.list.map(function(t, i) {
			return '<div class="mp-it' + (i === popState.sel ? ' on' : '') + '" data-i="' + i + '"><b>' + (i + 1) + '</b>' + esc(t) + '</div>';
		}).join('');
		html += '<div class="mp-it keep' + (popState.sel === popState.list.length ? ' on' : '') + '" data-i="' + popState.list.length + '"><b>↵</b>' + esc(popState.word) + ' <small>(keep English)</small></div>';
		pop.innerHTML = html;
		pop.style.display = 'block';
		pop.style.minWidth = Math.min(260, r.width) + 'px';
		var top = r.bottom + 4,
			left = r.left;
		var ph = pop.offsetHeight;
		if (top + ph > window.innerHeight - 6 && r.top - ph - 4 > 0) top = r.top - ph - 4;
		pop.style.top = top + 'px';
		pop.style.left = Math.max(6, Math.min(left, window.innerWidth - pop.offsetWidth - 6)) + 'px';
	}

	function commit(idx, addSpace) {
		var el = popState.el;
		if (!el || !popState.word) return;
		var txt = idx < popState.list.length ? popState.list[idx] : popState.word;
		var v = el.value;
		el.value = v.slice(0, popState.start) + txt + v.slice(popState.end);
		var caret = popState.start + txt.length;
		el.setSelectionRange(caret, caret);
		hidePop();
		el.dispatchEvent(new Event('input', { bubbles: true }));
	}

	function bindTranslit(el) {
		el.addEventListener('input', function() {
			if (!state.ml || (state.def && state.def.en) || el.dataset.ml !== '1') { hidePop(); return; }
			var t = tokenAt(el);
			if (!t.word) { hidePop(); return; }
			popState.el = el;
			popState.start = t.start;
			popState.end = t.end;
			popState.word = t.word;
			var rid = ++popState.req;
			suggest(t.word).then(function(list) {
				if (rid !== popState.req || popState.el !== el) return;
				popState.list = list;
				popState.sel = 0;
				showPop(el);
			});
		});
		el.addEventListener('keydown', function(e) {
			if (!pop || pop.style.display !== 'block' || popState.el !== el || !popState.list.length) return;
			var n = popState.list.length;
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				popState.sel = (popState.sel + 1) % (n + 1);
				showPop(el);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				popState.sel = (popState.sel + n) % (n + 1);
				showPop(el);
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				commit(popState.sel);
			} else if (e.key === ' ') {
				e.preventDefault();
				commit(popState.sel);
				var p = el.selectionStart;
				el.value = el.value.slice(0, p) + ' ' + el.value.slice(p);
				el.setSelectionRange(p + 1, p + 1);
				el.dispatchEvent(new Event('input', { bubbles: true }));
			} else if (e.key === 'Escape') {
				hidePop();
			} else if (/^[1-4]$/.test(e.key) && +e.key <= n) {
				e.preventDefault();
				commit(+e.key - 1);
			}
		});
		el.addEventListener('blur', function() {
			if (popState.el === el && popState.word && popState.list.length) commit(0);
			else hidePop();
		});
	}

	/* ================================================================
	   Values
	   ================================================================ */
	function tableRows(id) {
		return state.vals[id] || (state.vals[id] = []);
	}

	function getVal(f) {
		if (f && typeof f === 'object') {
			var rows = state.vals[f.t] || [];
			var r = rows[f.r];
			return r ? (r[f.c] || '') : '';
		}
		var v = state.vals[f];
		return (typeof v === 'string') ? v : '';
	}

	function fmtDate(iso) {
		var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
		return m ? (m[3] + '-' + m[2] + '-' + m[1]) : (iso || '');
	}

	function fieldById(def, id) {
		for (var s = 0; s < def.sections.length; s++)
			for (var i = 0; i < def.sections[s].fields.length; i++)
				if (def.sections[s].fields[i].id === id) return def.sections[s].fields[i];
		return null;
	}

	function allFields(def) {
		var out = [];
		def.sections.forEach(function(s) { s.fields.forEach(function(f) { out.push(f); }); });
		return out;
	}

	function initVals(def) {
		state.vals = {};
		state.touched = {};
		var today = new Date();
		var iso = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
		allFields(def).forEach(function(f) {
			if (f.type === 'table') state.vals[f.id] = Array.apply(null, Array(f.rows || 1)).map(function() { return {}; });
			else if (f.type === 'fixedtable') state.vals[f.id] = f.rows.map(function() { return {}; });
			else if (f.type === 'checks') state.vals[f.id] = f.init ? f.init.slice() : ['self'];
			else if (f.type === 'date' && f.today) state.vals[f.id] = iso;
			else state.vals[f.id] = f.value || '';
		});
	}

	function propagate(srcId) {
		// copy a value into fields that "link" to it, unless the user edited them
		var def = state.def;
		allFields(def).forEach(function(f) {
			if (f.link === srcId && !state.touched[f.id]) {
				state.vals[f.id] = state.vals[srcId];
				var inp = document.querySelector('[data-f="' + f.id + '"]');
				if (inp) inp.value = state.vals[f.id];
			}
		});
		// applicant row of the income family table follows the applicant name
		if (def.id === 'income' && srcId === 'i_name') {
			var rows = state.vals.i_family;
			if (rows && !state.touched['i_family_0_name']) {
				rows[0].name = state.vals.i_name;
				var inp2 = document.querySelector('[data-t="i_family"][data-r="0"][data-c="name"]');
				if (inp2) inp2.value = rows[0].name;
			}
		}
		autoTotal();
	}

	function autoTotal() {
		var def = state.def;
		allFields(def).forEach(function(f) {
			if (f.auto === 'family' && !state.touched[f.id]) {
				var rows = state.vals.i_family || [];
				var n = rows.filter(function(r) { return (r.name || '').trim(); }).length;
				state.vals[f.id] = n ? String(n) : '';
				var inp = document.querySelector('[data-f="' + f.id + '"]');
				if (inp) inp.value = state.vals[f.id];
			}
		});
	}

	/* ================================================================
	   Form
	   ================================================================ */
	function mlAttr(f) { return f.ml ? ' data-ml="1"' : ''; }

	function buildForm() {
		var def = state.def,
			html = '';
		def.sections.forEach(function(s, si) {
			html += '<details class="fs" open><summary><span class="fs-n">' + (si + 1) + '</span>' + esc(s.title) + '<i class="fa-solid fa-chevron-down"></i></summary><div class="fs-b">';
			s.fields.forEach(function(f) { html += fieldHtml(f); });
			html += '</div></details>';
		});
		$('formBody').innerHTML = html;

		var root = $('formBody');
		root.querySelectorAll('input[type=text],textarea').forEach(bindTranslit);
		root.querySelectorAll('[data-add-row]').forEach(function(b) {
			b.addEventListener('click', function() {
				var id = b.getAttribute('data-add-row'),
					f = fieldById(def, id),
					rows = tableRows(id);
				if (rows.length >= f.max) return;
				rows.push({});
				buildForm();
				scheduleRender();
			});
		});
	}

	function fieldHtml(f) {
		var v = state.vals[f.id];
		if (f.type === 'textarea') {
			return '<label class="ff full"><span>' + esc(f.label) + '</span><textarea class="af-in" rows="' + (f.rows || 2) + '" data-f="' + f.id + '"' + mlAttr(f) + ' autocomplete="off">' + esc(v) + '</textarea></label>';
		}
		if (f.type === 'date') {
			return '<label class="ff"><span>' + esc(f.label) + '</span><input class="af-in" type="date" data-f="' + f.id + '" value="' + esc(v) + '"></label>';
		}
		if (f.type === 'select') {
			return '<label class="ff"><span>' + esc(f.label) + '</span><select class="af-in" data-f="' + f.id + '">' + f.options.map(function(o) {
				return '<option value="' + esc(o.v) + '"' + (o.v === v ? ' selected' : '') + '>' + esc(o.t) + '</option>';
			}).join('') + '</select></label>';
		}
		if (f.type === 'radio') {
			return '<div class="ff full"><span>' + esc(f.label) + '</span><div class="pills" data-radio="' + f.id + '">' + f.options.map(function(o) {
				return '<button type="button" class="pill' + (o.v === v ? ' on' : '') + '" data-v="' + esc(o.v) + '">' + esc(o.t) + '</button>';
			}).join('') + '</div></div>';
		}
		if (f.type === 'checks') {
			return '<div class="ff full"><span>' + esc(f.label) + ' <em>(' + esc(f.hint || 'un-ticked names are struck through') + ')</em></span><div class="pills" data-checks="' + f.id + '">' + f.options.map(function(o) {
				var on = (v || []).indexOf(o.v) !== -1;
				return '<button type="button" class="pill chk' + (on ? ' on' : '') + '" data-v="' + esc(o.v) + '">' + esc(o.t) + '</button>';
			}).join('') + '</div></div>';
		}
		if (f.type === 'table') return tableHtml(f);
		if (f.type === 'fixedtable') return fixedTableHtml(f);
		return '<label class="ff"><span>' + esc(f.label) + '</span><input class="af-in" type="text" data-f="' + f.id + '"' + mlAttr(f) + ' value="' + esc(v) + '" autocomplete="off"' + (f.ml ? '' : ' inputmode="' + (f.inputmode || 'text') + '"') + '></label>';
	}

	function colGrid(f) {
		return f.cols.map(function(c) { return (c.w || 1) + 'fr'; }).join(' ');
	}

	function tableHtml(f) {
		var rows = tableRows(f.id);
		var h = '<div class="tbl"><div class="tr th" style="grid-template-columns:' + colGrid(f) + ' 34px">' + f.cols.map(function(c) { return '<span>' + esc(c.label) + '</span>'; }).join('') + '<span></span></div>';
		rows.forEach(function(r, ri) {
			h += '<div class="tr" style="grid-template-columns:' + colGrid(f) + ' 34px">' + f.cols.map(function(c) {
				return '<input class="af-in" type="text" data-t="' + f.id + '" data-r="' + ri + '" data-c="' + c.id + '"' + (c.ml ? ' data-ml="1"' : '') + ' value="' + esc(r[c.id] || '') + '" autocomplete="off">';
			}).join('') + '<button type="button" class="rm" data-rm="' + f.id + '" data-r="' + ri + '" title="Remove row">&times;</button></div>';
		});
		h += '</div><button type="button" class="addrow" data-add-row="' + f.id + '"' + (rows.length >= f.max ? ' disabled' : '') + '><i class="fa-solid fa-plus"></i> Add row <small>(max ' + f.max + ')</small></button>';
		return h;
	}

	function fixedTableHtml(f) {
		var rows = state.vals[f.id];
		var h = '<div class="tbl"><div class="tr th fx" style="grid-template-columns:150px ' + colGrid(f) + '"><span>Member</span>' + f.cols.map(function(c) { return '<span>' + esc(c.label) + '</span>'; }).join('') + '</div>';
		f.rows.forEach(function(label, ri) {
			h += '<div class="tr fx" style="grid-template-columns:150px ' + colGrid(f) + '"><span class="rl">' + esc(label) + '</span>' + f.cols.map(function(c) {
				return '<input class="af-in" type="text" data-t="' + f.id + '" data-r="' + ri + '" data-c="' + c.id + '"' + (c.ml ? ' data-ml="1"' : '') + ' value="' + esc((rows[ri] || {})[c.id] || '') + '" autocomplete="off">';
			}).join('') + '</div>';
		});
		return h + '</div>';
	}

	/* delegated input handling */
	function wireForm() {
		var root = $('formBody');
		root.addEventListener('input', function(e) {
			var el = e.target;
			if (el.dataset.f) {
				var f = fieldById(state.def, el.dataset.f);
				state.vals[el.dataset.f] = el.value;
				state.touched[el.dataset.f] = true;
				propagate(el.dataset.f);
			} else if (el.dataset.t) {
				var rows = state.vals[el.dataset.t];
				rows[+el.dataset.r][el.dataset.c] = el.value;
				state.touched[el.dataset.t + '_' + el.dataset.r + '_' + el.dataset.c] = true;
				autoTotal();
			}
			scheduleRender();
		});
		root.addEventListener('change', function(e) {
			var el = e.target;
			if (el.dataset.f && (el.tagName === 'SELECT' || el.type === 'date')) {
				state.vals[el.dataset.f] = el.value;
				scheduleRender();
			}
		});
		root.addEventListener('click', function(e) {
			var pill = e.target.closest('.pill');
			if (pill) {
				var wrap = pill.parentElement;
				if (wrap.dataset.radio) {
					var id = wrap.dataset.radio,
						v = pill.dataset.v;
					state.vals[id] = (state.vals[id] === v) ? '' : v;
					wrap.querySelectorAll('.pill').forEach(function(p) { p.classList.toggle('on', p.dataset.v === state.vals[id]); });
				} else if (wrap.dataset.checks) {
					var cid = wrap.dataset.checks,
						arr = state.vals[cid];
					var ix = arr.indexOf(pill.dataset.v);
					if (ix === -1) arr.push(pill.dataset.v);
					else arr.splice(ix, 1);
					pill.classList.toggle('on', ix === -1);
				}
				scheduleRender();
				return;
			}
			var rm = e.target.closest('[data-rm]');
			if (rm) {
				var rows = tableRows(rm.dataset.rm);
				if (rows.length > 1) rows.splice(+rm.dataset.r, 1);
				else rows[0] = {};
				buildForm();
				scheduleRender();
			}
		});
	}

	/* ================================================================
	   Page rendering (same markup for preview, print and PDF)
	   ================================================================ */
	function strikeRects(def, pi, k) {
		var out = '';
		(def.strikes || []).forEach(function(g) {
			var v = state.vals[g.f];
			var struck = [];
			if (g.type === 'radio') {
				if (!v) return;
				Object.keys(g.opts).forEach(function(key) { if (key !== v) struck = struck.concat(g.opts[key]); });
			} else {
				var sel = v || [];
				if (!sel.length) return;
				Object.keys(g.opts).forEach(function(key) { if (sel.indexOf(key) === -1) struck = struck.concat(g.opts[key]); });
			}
			struck.forEach(function(r) {
				if (r[0] !== pi) return;
				out += '<div class="afs" style="left:' + (r[1] * k).toFixed(2) + 'px;top:' + ((r[3] + 6.4) * k).toFixed(2) + 'px;width:' + ((r[2] - r[1]) * k).toFixed(2) + 'px;height:' + Math.max(1, 0.85 * k).toFixed(2) + 'px"></div>';
			});
		});
		return out;
	}

	function valBox(text, x, y, w, h, size, o, k) {
		var st = 'left:' + (x * k).toFixed(2) + 'px;top:' + (y * k).toFixed(2) + 'px;width:' + (w * k).toFixed(2) + 'px;height:' + (h * k).toFixed(2) + 'px;font-size:' + (size * k).toFixed(2) + 'px;';
		if (o.pad) st += 'padding-top:' + (o.pad * k).toFixed(2) + 'px;';
		if (!o.multi) st += 'line-height:' + (h * k).toFixed(2) + 'px;';
		var cls = 'afv' + (o.multi ? ' multi' : '');
		return '<div class="' + cls + '" data-size="' + (size * k).toFixed(3) + '" style="' + st + '"><span>' + esc(text) + '</span></div>';
	}

	/* HTML-built pages (passport annexures): the form text is real HTML, scaled to the requested size */
	function htmlPage(def, pi, k) {
		var pg = def.pages[pi];
		var wpx = pg.w * 96 / 72,
			hpx = pg.h * 96 / 72;
		var sc = k * 72 / 96;
		var inner = '<div class="hpg" style="width:' + wpx.toFixed(2) + 'px;height:' + hpx.toFixed(2) + 'px;' +
			(Math.abs(sc - 1) > 0.002 ? 'transform:scale(' + sc.toFixed(5) + ');transform-origin:0 0;' : '') + '">' + def.render(pi, state.vals) + '</div>';
		return '<div class="afp" style="width:' + (pg.w * k).toFixed(2) + 'px;height:' + (pg.h * k).toFixed(2) + 'px">' + inner + '</div>';
	}

	function pageHtml(def, pi, k) {
		if (def.render) return htmlPage(def, pi, k);
		var pg = def.pages[pi];
		var h = '<div class="afp" style="width:' + (pg.w * k).toFixed(2) + 'px;height:' + (pg.h * k).toFixed(2) + 'px">' +
			'<img class="afbg" src="' + esc(CFG.base + pg.img) + '" alt="" draggable="false">';
		def.place.forEach(function(p) {
			if (p.p !== pi) return;
			if (p.table) {
				var rows = state.vals[p.table] || [];
				rows.forEach(function(r, ri) {
					p.cols.forEach(function(c) {
						var t = (r[c.c] || '').trim();
						if (t) h += valBox(t, c.x, p.y0 + ri * p.pitch, c.w, p.pitch, p.size, { vc: true }, k);
					});
				});
				return;
			}
			var t = getVal(p.f);
			if (p.f && typeof p.f === 'string') {
				var fd = fieldById(def, p.f);
				if (fd && fd.type === 'date') t = fmtDate(t);
			}
			t = (t || '').trim();
			if (!t) return;
			h += valBox(t, p.x, p.y, p.w, p.h, p.size, p, k);
		});
		h += strikeRects(def, pi, k);
		return h + '</div>';
	}

	/* shrink text that does not fit its box */
	function fitAll(root) {
		root.querySelectorAll('.afv').forEach(function(box) {
			var span = box.firstElementChild,
				base = parseFloat(box.dataset.size) || 12,
				size = base,
				multi = box.classList.contains('multi');
			box.style.fontSize = size + 'px';
			var guard = 0;
			if (multi) {
				while (box.scrollHeight > box.clientHeight + 1 && size > base * 0.55 && guard++ < 30) {
					size *= 0.95;
					box.style.fontSize = size + 'px';
				}
			} else {
				while (span.offsetWidth > box.clientWidth - 1 && size > base * 0.5 && guard++ < 40) {
					size *= 0.96;
					box.style.fontSize = size + 'px';
				}
			}
		});
	}

	var raf = 0;

	function scheduleRender() {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(renderPreview);
	}

	function renderPreview() {
		var def = state.def;
		if (!def) return;
		var box = $('pvPages');
		var width = Math.max(260, box.clientWidth);
		var h = '';
		def.pages.forEach(function(pg, i) {
			var k = width / pg.w;
			h += '<div class="pv-sheet">' + pageHtml(def, i, k) + '<div class="pv-no">Page ' + (i + 1) + ' of ' + def.pages.length + '</div></div>';
		});
		box.innerHTML = h;
		fitAll(box);
	}

	/* ================================================================
	   Output: full preview, print, PDF
	   ================================================================ */
	function waitAssets(root) {
		var imgs = Array.prototype.slice.call(root.querySelectorAll('img')).map(function(im) {
			return im.complete ? 1 : new Promise(function(r) { im.onload = im.onerror = r; });
		});
		var fonts = (root.ownerDocument.fonts && root.ownerDocument.fonts.ready) ? root.ownerDocument.fonts.ready : 1;
		return Promise.all(imgs.concat([fonts]));
	}

	function sheetsHtml() {
		var def = state.def;
		return def.pages.map(function(pg, i) { return pageHtml(def, i, A4W / pg.w); }).join('');
	}

	var FONT_LINK = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;600&family=Noto+Sans:wght@400;500;600&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap';

	function loadFonts() {
		if (document.fonts && document.fonts.load) {
			return Promise.all([
				document.fonts.load('500 12px "Noto Sans Malayalam"', 'അആഇ'),
				document.fonts.load('500 12px "Noto Sans"', 'Ab1'),
				document.fonts.load('400 12px Tinos', 'Ab1'),
				document.fonts.load('700 12px Tinos', 'Ab1'),
				document.fonts.load('italic 400 12px Tinos', 'Ab1')
			]).catch(function() {});
		}
		return Promise.resolve();
	}

	function printCss() {
		return '@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}' +
			'.afp{position:relative;width:' + A4W + 'px;height:' + A4H + 'px;overflow:hidden;page-break-after:always;break-after:page;background:#fff}' +
			'.afp:last-child{page-break-after:auto;break-after:auto}' + stageCss();
	}

	function stageCss() {
		return '.afbg{position:absolute;left:0;top:0;width:100%;height:100%;display:block;user-select:none}' +
			'.afv{position:absolute;display:block;overflow:hidden;font-family:"Noto Sans Malayalam","Noto Sans",Arial,sans-serif;font-weight:500;color:#0a1d52}' +
			'.afv.multi{line-height:1.3}' +
			'.afv.multi span{white-space:pre-wrap;display:block;width:100%}' +
			'.afv span{white-space:nowrap}' +
			'.afs{position:absolute;background:#1a1a1a}' + (window.AFF_HTML_CSS || '');
	}

	function doPrint() {
		if (!anyData()) { toast('Fill in some details first'); return; }
		var old = document.getElementById('affPrintFrame');
		if (old) old.remove();
		var fr = document.createElement('iframe');
		fr.id = 'affPrintFrame';
		fr.setAttribute('aria-hidden', 'true');
		fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
		document.body.appendChild(fr);
		var d = fr.contentWindow.document;
		d.open();
		d.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(state.def.title) + '</title><link href="' + FONT_LINK + '" rel="stylesheet"><style>' + printCss() + '</style></head><body>' + sheetsHtml() + '</body></html>');
		d.close();
		var go = function() {
			fitAll(d.body);
			fr.contentWindow.focus();
			fr.contentWindow.print();
			setTimeout(function() { fr.remove(); }, 60000);
		};
		fr.contentWindow.onafterprint = function() { setTimeout(function() { fr.remove(); }, 500); };
		setTimeout(function() {
			Promise.race([waitAssets(d.body), new Promise(function(r) { setTimeout(r, 4000); })]).then(function() {
				return Promise.race([d.fonts.load('500 12px "Noto Sans Malayalam"', 'അ'), new Promise(function(r) { setTimeout(r, 2500); })]).catch(function() {});
			}).then(go);
		}, 250);
	}

	function doDownload() {
		if (!anyData()) { toast('Fill in some details first'); return; }
		if (typeof html2canvas === 'undefined' || !(window.jspdf && window.jspdf.jsPDF)) { toast('PDF libraries failed to load'); return; }
		var btn = $('btnPdf'),
			label = btn.innerHTML;
		btn.disabled = true;
		btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating PDF…';

		var stage = $('pdfStage');
		stage.innerHTML = sheetsHtml();
		var pages = Array.prototype.slice.call(stage.querySelectorAll('.afp'));
		loadFonts().then(function() { return waitAssets(stage); }).then(function() {
			fitAll(stage);
			var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
			var chain = Promise.resolve();
			pages.forEach(function(pg, i) {
				chain = chain.then(function() {
					return html2canvas(pg, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false }).then(function(cv) {
						if (i > 0) doc.addPage();
						doc.addImage(cv.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
					});
				});
			});
			return chain.then(function() { doc.save(state.def.id + '-affidavit.pdf'); });
		}).catch(function() { toast('Could not create the PDF'); }).finally(function() {
			stage.innerHTML = '';
			btn.disabled = false;
			btn.innerHTML = label;
		});
	}

	function openPreview() {
		var def = state.def;
		var m = $('pvModal'),
			body = $('pvModalBody');
		m.classList.add('open');
		document.body.classList.add('noscroll');
		var width = Math.min(900, Math.max(280, body.clientWidth - 24));
		body.innerHTML = def.pages.map(function(pg, i) {
			return '<div class="pv-sheet big">' + pageHtml(def, i, width / pg.w) + '</div>';
		}).join('');
		fitAll(body);
	}

	function closePreview() {
		$('pvModal').classList.remove('open');
		document.body.classList.remove('noscroll');
		$('pvModalBody').innerHTML = '';
	}

	function anyData() {
		var found = false;
		JSON.stringify(state.vals, function(k, v) {
			if (typeof v === 'string' && v.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(v)) found = true;
			return v;
		});
		return found;
	}

	/* ================================================================
	   UI wiring
	   ================================================================ */
	var toastT = 0;

	function toast(msg) {
		var t = $('toast');
		t.textContent = msg;
		t.classList.add('show');
		clearTimeout(toastT);
		toastT = setTimeout(function() { t.classList.remove('show'); }, 2600);
	}

	function choose(id) {
		var def = DEFS.filter(function(d) { return d.id === id; })[0] || DEFS[0];
		state.def = def;
		initVals(def);
		$('affSelect').value = def.id;
		$('affSub').textContent = def.sub || '';
		$('formTitle').textContent = def.title;
		hidePop();
		$('mlHint').style.display = (state.ml && !def.en) ? '' : 'none';
		$('mlWrap').style.display = def.en ? 'none' : '';
		$('enHint').style.display = def.en ? '' : 'none';
		buildForm();
		renderPreview();
		try { localStorage.setItem('affChoice', def.id); } catch (e) {}
	}

	function init() {
		var sel = $('affSelect');
		sel.innerHTML = DEFS.map(function(d) { return '<option value="' + d.id + '">' + esc(d.title) + '</option>'; }).join('');
		sel.addEventListener('change', function() {
			if (state.def && sel.value === state.def.id) return;
			if (anyData() && !window.confirm('Switch affidavit? The details you entered will be cleared.')) {
				sel.value = state.def.id;
				return;
			}
			choose(sel.value);
		});

		try { state.ml = localStorage.getItem('affMl') !== '0'; } catch (e) {}
		var sw = $('mlSwitch');
		sw.checked = state.ml;
		sw.addEventListener('change', function() {
			state.ml = sw.checked;
			hidePop();
			$('mlHint').style.display = (state.ml && !(state.def && state.def.en)) ? '' : 'none';
			try { localStorage.setItem('affMl', state.ml ? '1' : '0'); } catch (e) {}
		});
		wireForm();
		$('btnPreview').addEventListener('click', openPreview);
		$('btnPrint').addEventListener('click', doPrint);
		$('btnPdf').addEventListener('click', doDownload);
		$('btnReset').addEventListener('click', function() {
			if (!window.confirm('Clear all entered details?')) return;
			choose(state.def.id);
		});
		$('pvClose').addEventListener('click', closePreview);
		$('pvModal').addEventListener('click', function(e) { if (e.target === this) closePreview(); });
		$('pvPrint').addEventListener('click', doPrint);
		$('pvPdf').addEventListener('click', doDownload);
		document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePreview(); });
		window.addEventListener('resize', function() { scheduleRender(); });

		var first = DEFS[0].id;
		try { first = localStorage.getItem('affChoice') || first; } catch (e) {}
		loadFonts().then(scheduleRender);
		choose(first);
		loadFonts().then(function() { renderPreview(); });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();