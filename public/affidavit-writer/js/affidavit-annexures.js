/* Passport annexures (English, typed – no Malayalam conversion).
 *
 * Unlike the Malayalam affidavits (page image + text placed on top), these three forms are rebuilt as real HTML pages
 * that carry the full text of the original PDF. Each blank (dotted line) is a "slot" that fills in while typing; when a
 * choice is made (father / mother, he / she, I / We, reason (a)–(i) ...) the words that do NOT apply are struck through
 * or crossed, exactly as people do on the printed form.
 *
 * A def with `render(pageIndex, vals)` is drawn by affidavit-generator.js through the same preview / print / PDF code.
 * Loaded after affidavit-defs.js and before affidavit-generator.js.
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

	/* ---------------------------------------------------------------- page CSS */
	var CSS =
		'.hpg{position:relative;overflow:hidden;box-sizing:border-box;background:#fff;color:#000;text-align:justify;' +
		'font-family:Tinos,"Times New Roman","Liberation Serif",Times,serif;font-size:15.3px;line-height:1.3;padding:50px 68px 36px}' +
		'.hpg *{box-sizing:border-box}' +
		'.hpg p{margin:0 0 9px}' +
		'.hpg .c{text-align:center}.hpg .r{text-align:right}' +
		'.hpg .ttl{font-weight:700;text-align:center;margin:0 0 4px;text-transform:uppercase}' +
		'.hpg .ind{margin-left:22px}' +
		'.hpg .num{display:flex;gap:10px;margin:0 0 9px}.hpg .num>.n{flex:none;width:20px}.hpg .num>.t{flex:1;min-width:0}' +
		'.hpg .num .sub{display:flex;gap:8px;margin-top:3px;margin-left:12px}.hpg .num .sub>span:first-child{flex:none}' +
		'.hf{display:inline-block;vertical-align:baseline;border-bottom:1.5px dotted #222;color:#0a1d52;font-weight:600;padding:0 4px;' +
		'line-height:1.15;text-align:left;max-width:100%;overflow-wrap:anywhere;font-style:normal}' +
		'.hf.f{display:block;flex:1;min-width:0}' +
		'.hpg .ln{display:flex;align-items:baseline;gap:5px;margin:0 0 3px;text-align:left}' +
		'.hpg .ln .lb{flex:none;white-space:nowrap}.hpg .ln .tl{flex:none;white-space:nowrap}' +
		'.hpg .dg{display:grid;grid-template-columns:1fr 1fr;column-gap:34px;margin:12px 0 12px 20px;text-align:left}' +
		'.hpg .dg .ln .lb{width:98px}' +
		'.hf-ml{display:block;min-height:3.9em;line-height:1.3em;color:#0a1d52;font-weight:600;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;' +
		'background:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'20\'><line x1=\'0\' y1=\'19\' x2=\'8\' y2=\'19\' stroke=\'%23222\' stroke-width=\'1.5\' stroke-dasharray=\'1.5 2.5\'/></svg>") repeat 0 0/8px 1.3em;padding:0 4px}' +
		'.hpg .hv{color:#0a1d52;font-weight:600}' +
		'.hpg .st{text-decoration:line-through;text-decoration-thickness:1.3px}' +
		'.hpg .rs{position:relative;margin:0 0 9px;padding:2px 3px;text-align:justify}' +
		'.hpg .rs .xx{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}' +
		'.hpg .rs i{display:block;margin-top:1px}' +
		'.hpg .note{margin-top:8px;font-size:14.4px}' +
		'.hpg .sg{display:grid;grid-template-columns:1fr 1fr;column-gap:26px;text-align:left;margin-top:14px}' +
		'.hpg .photo{border:1.5px solid #222;width:250px;height:166px;padding:8px 6px;font-size:13.3px;line-height:1.25;text-align:justify;margin:6px 0 34px}';

	/* ---------------------------------------------------------------- helpers */
	function field(id, label, o) { return Object.assign({ id: id, label: label, type: 'text', ml: false }, o || {}); }
	function radio(id, label, options, value) { return { id: id, label: label, type: 'radio', ml: false, options: options, value: value || '' }; }

	/* "father/mother" with the words that were NOT chosen struck through (nothing chosen -> plain) */
	function alt(words, chosen) {
		if (chosen == null || chosen === '' || words.indexOf(chosen) === -1) return words.join('/');
		return words.map(function(w) { return w === chosen ? w : '<span class="st">' + w + '</span>'; }).join('/');
	}

	function H(vals) {
		var v = function(id) { var x = vals[id]; return typeof x === 'string' ? x.trim() : ''; };
		var o = {
			v: v,
			/* a dotted blank filled with the typed value */
			slot: function(id, w, fallback) {
				var t = v(id) || fallback || '';
				return '<span class="hf" style="min-width:' + (w || 120) + 'px">' + (t ? esc(t) : '&#8203;') + '</span>';
			},
			/* a dotted blank that stretches to the end of the line */
			line: function(label, id, tail, fallback) {
				var t = v(id) || fallback || '';
				return '<div class="ln"><span class="lb">' + label + '</span><span class="hf f">' + (t ? esc(t) : '&#8203;') + '</span>' + (tail ? '<span class="tl">' + tail + '</span>' : '') + '</div>';
			},
			/* three dotted lines (address) */
			addr: function(id) {
				return '<div class="hf-ml">' + esc(v(id)) + '</div>';
			},
			date: function(id) { return esc(fmtDate(vals[id])); },
			cross: function() {
				return '<svg class="xx" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L100 100M100 0L0 100" stroke="#111" stroke-width="1.3" fill="none" vector-effect="non-scaling-stroke"/></svg>';
			}
		};
		return o;
	}

	/* parent details block (minor + father | mother) shared by C and D */
	function detailsBlock(h) {
		var head = function(p, lbl) { return h.line(lbl, p + '_name'); };
		var addr = function(p) { return '<div class="ln"><span class="lb">Address</span><div style="flex:1;min-width:0">' + h.addr(p + '_addr') + '</div></div>'; };
		var colHtml = function(p, lbl) {
			return '<div>' + head(p, lbl) + h.line('Citizenship', p + '_cit') + h.line('Passport No', p + '_pp') + h.line('Contact No', p + '_tel') +
				h.line('Email ID', p + '_mail') + addr(p) + '</div>';
		};
		return '<div class="dg">' + colHtml('f', 'Name of father') + colHtml('m', 'Name of Mother') + '</div>';
	}

	function parentFields() {
		var out = [];
		[['f', 'Father'], ['m', 'Mother']].forEach(function(p) {
			out.push(field(p[0] + '_name', 'Name of ' + p[1].toLowerCase()));
			out.push(field(p[0] + '_cit', 'Citizenship', { value: 'Indian' }));
			out.push(field(p[0] + '_pp', 'Passport No'));
			out.push(field(p[0] + '_tel', 'Contact No', { inputmode: 'tel' }));
			out.push(field(p[0] + '_mail', 'Email ID'));
			out.push(field(p[0] + '_addr', 'Address', { type: 'textarea', rows: 3 }));
		});
		return out;
	}

	/* "Passport no / Aadhaar / Voter / PAN / DL" rows of a signature block */
	function idRows(h, p) {
		return h.line('Passport no: (preferably)', p + '_id_pp', '; or') +
			h.line('Aadhaar Card No', p + '_id_aad', '; or') +
			h.line('Voter ID Card No', p + '_id_voter', '; or') +
			h.line('PAN Card No.', p + '_id_pan', '; or') +
			h.line('Driving License No.', p + '_id_dl', '');
	}
	function idFields(p, who) {
		return [
			field(p + '_id_pp', who + ' – Passport No (preferably)'),
			field(p + '_id_aad', who + ' – Aadhaar Card No'),
			field(p + '_id_voter', who + ' – Voter ID Card No'),
			field(p + '_id_pan', who + ' – PAN Card No'),
			field(p + '_id_dl', who + ' – Driving License No')
		];
	}

	var MALE_FEMALE = [{ v: 'he', t: 'Male (he / his / him)' }, { v: 'she', t: 'Female (she / her)' }];
	function pron(h, kind, g) {
		var map = { he: ['he', 'she'], his: ['his', 'her'], him: ['him', 'her'] }[kind];
		return alt(map, g ? (g === 'he' ? map[0] : map[1]) : '');
	}

	var PLACEDATE = [
		field('place', 'Place'),
		field('date', 'Date', { type: 'date', today: true })
	];
	var placeDate = function(h) { return '<p style="margin:12px 0 0">Date: <span class="hv">' + h.date('date') + '</span></p><p>Place: <span class="hv">' + esc(h.v('place')) + '</span></p>'; };

	var PAGE = { html: true, w: 595.3, h: 841.9 };

	/* ===================================================================
	   ANNEXURE C – one parent has not given consent
	   =================================================================== */
	var REASONS = [
		['a', 'The father/mother of the minor applicant ‘Residing abroad’ and unable to provide consent.', 'Supporting documents of such parent (resident abroad) to be enclosed: Copy of Passport; Proof of residence abroad (Long term/Resident Visa, departure/immigration stamp)', 1],
		['b', 'The father/mother of the minor applicant is ‘Travelling abroad’ and unable to provide consent.', 'Supporting documents of such parent (travelling abroad) to be enclosed: Copy of Passport; Proof of travel abroad (Visa, departure/immigration stamp, ticket/boarding pass)', 1],
		['c', 'The parents are divorced/judicially separated and custody of minor has been assigned to one parent (parent who is applying for the passport), without visitation rights to the other parent.', 'Supporting Documents to be enclosed: Copy of court order/ decree regarding divorce/judicial separation', 0],
		['d', 'The parents are divorced/judicially separated and custody of minor has been assigned to one parent (parent who is applying for the passport ), with visitation rights to the other parent.', 'Supporting documents to be enclosed: Copy of court order/ decree regarding divorce/judicial separation, consent of other parent(having visitation rights) is also required', 0],
		['e', 'There is an ongoing court case for divorce/judicial separation (including on the issue of custody of minor child) and court has not given any order prohibiting the issue of passport, without the consent of the father/mother.', 'Supporting documents to be enclosed: Copy of divorce petition/application', 1],
		['f', 'There is an ongoing court case for divorce/judicial separation (including on the issue of custody of minor child) and there is prohibitory order for prohibiting the issue of passport, without the consent of the father/mother.', 'Supporting documents to be enclosed: The consent of both the parents or permission from the court', 1],
		['g', 'The parents are divorced/ judicially separated or there is ongoing court case for divorce/judicial separation however the custody of minor child has not been invoked/ prayed in the divorce petition or the custody of the minor is not disputed.', 'Supporting documents to be enclosed: Copy of divorce decree/court order or Divorce petition/application as the case may be.', 0],
		['h', 'One of the parents is willfully denying to give his/her consent.', 'Supporting documents to be enclosed: Copy of communication/documents from other parent denying consent. PIA to decide if the documents submitted are sufficient to establish this.', 0],
		['i', 'One of the parents has deserted/ abandoned child/parent after conception/birth of child and whereabouts of such parent are not known.', 'Appropriate Supporting documents to be enclosed. PIA to decide if the documents submitted are sufficient to establish this.', 0]
	];

	var annC = {
		id: 'annexure_c',
		en: true,
		title: 'Passport Annexure C',
		sub: 'Declaration by one parent / guardian – the other parent has not given consent (2 pages)',
		pages: [PAGE, PAGE],
		sections: [{
				title: 'Minor child',
				fields: [
					field('child', 'Name of the minor child'),
					field('dob', 'Date of birth', { type: 'date' }),
					radio('gender', 'Child is', MALE_FEMALE),
					field('arn', 'Passport application ARN no')
				]
			},
			{
				title: 'Father & mother details',
				fields: parentFields()
			},
			{
				title: 'Who is declaring',
				fields: [
					radio('rel', 'The person signing this declaration (applying parent) is', [{ v: 'father', t: 'Father' }, { v: 'mother', t: 'Mother' }], 'mother'),
					field('decl_name', 'Name of the signing parent (blank = taken from the details above)'),
					field('other_name', 'Name of the parent whose consent is NOT obtained (blank = taken from the details above)')
				]
			},
			{
				title: 'Reason(s) consent was not obtained',
				fields: [{
					id: 'reasons',
					label: 'Tick the reason(s) that apply',
					type: 'checks',
					ml: false,
					init: [],
					hint: 'the reasons that are not ticked get a cross mark',
					options: REASONS.map(function(r) { return { v: r[0], t: '(' + r[0] + ') ' + r[1].replace(/\s+/g, ' ').slice(0, 62) + '…' }; })
				}]
			},
			{
				title: 'Signing parent – ID number (any one is enough)',
				fields: idFields('d', 'Signing parent')
			},
			{
				title: 'Place & date',
				fields: PLACEDATE
			}
		],
		render: function(pi, vals) {
			var h = H(vals),
				rel = h.v('rel'),
				other = rel === 'father' ? 'mother' : (rel === 'mother' ? 'father' : ''),
				g = h.v('gender'),
				sel = vals.reasons || [];
			var declName = h.v('decl_name') || (rel === 'mother' ? h.v('m_name') : (rel === 'father' ? h.v('f_name') : ''));
			var otherName = h.v('other_name') || (other === 'mother' ? h.v('m_name') : (other === 'father' ? h.v('f_name') : ''));
			var fm = function(who) { return alt(['father', 'mother'], who); };
			var oth = function(t) { return t.replace(/father\/mother/g, fm(other)); };

			var reason = function(r) {
				var na = sel.length && sel.indexOf(r[0]) === -1;
				return '<div class="rs' + (na ? ' na' : '') + '"><b>(' + r[0] + ') ' + (r[3] ? oth(esc(r[1])) : esc(r[1])) + '</b><i>[' + esc(r[2]) + ']</i>' + (na ? h.cross() : '') + '</div>';
			};

			if (pi === 0) {
				return '<div class="c"><b>ANNEXURE ‘C’</b></div>' +
					'<p class="ttl" style="margin-top:12px">SPECIMEN DECLARATION BY APPLICANT’S PARENT OR GUARDIAN FOR ISSUE OF PASSPORT TO MINOR WHEN ONE PARENT HAS NOT GIVEN CONSENT</p>' +
					'<p class="c" style="margin-bottom:14px">(On plain paper)</p>' +
					'<p>I, ' + fm(rel) + ' of minor child whose details are mentioned below solemnly declare and affirm as under:-</p>' +
					'<div class="ind">' + h.line('Name of the minor child:', 'child') + h.line('Date of Birth:', 'dob_t', '', fmtDate(vals.dob)) + '</div>' +
					detailsBlock(h) +
					'<div class="num"><span class="n">1.</span><span class="t">That I am the ' + alt(['mother', 'father'], rel) + ' of the above minor child on whose behalf I am submitting passport application vide ARN no ' + h.slot('arn', 150) + '</span></div>' +
					'<div class="num"><span class="n">2.</span><span class="t">Signature/consent of ' + alt(['Shri', 'Smt'], other === 'father' ? 'Shri' : (other === 'mother' ? 'Smt' : '')) + ' ' + h.slot('other_name', 210, otherName) + ' (name of the ' + fm(other) + ') who is the ' + fm(other) + ' of the child has not been obtained by me for the following one or more reasons:-</span></div>' +
					REASONS.slice(0, 6).map(reason).join('');
			}
			return REASONS.slice(6).map(reason).join('') +
				'<p><i>* Please put a cross mark on all other options above which are not applicable.</i></p>' +
				'<div class="num"><span class="n">3.</span><span class="t">The minor child mentioned above is a citizen of India. I solemnly declare that ' + pron(h, 'he', g) + ' has not lost, surrendered or been deprived of ' + pron(h, 'his', g) + ' citizenship of India and that the information given in respect of ' + pron(h, 'him', g) + ' in this application is true. That I only am taking care of ' + h.slot('child', 190) + ' (name of the minor child) and ' + pron(h, 'he', g) + ' is exclusively in my physical custody.</span></div>' +
				'<div class="num"><span class="n">4.</span><span class="t">I also affirm that in the case of a court case arising due to issue of a passport to the minor child ' + h.slot('child', 150) + ' (name of the minor child) in the above scenario(s), I would be solely responsible for defending the case and not the Passport Issuing Authority.</span></div>' +
				'<div class="num"><span class="n">5.</span><span class="t">I hereby certify and undertake that if any information provided in the above declaration is found incorrect or misleading, following action may be taken by the Passport Authority for:' +
				'<div class="sub"><span>a)</span><span>Cancellation (impounding/ revocation) of the passport issued on the basis of this declaration;</span></div>' +
				'<div class="sub"><span>b)</span><span>Initiating criminal proceedings under relevant provisions of Bharatiya Nyaya Sanhita, 2023 and the Passports Act, 1967</span></div></span></div>' +
				'<div style="margin-top:22px;text-align:left">' +
				'<div class="ln"><span class="lb">Signature of ' + fm(rel) + '/legal guardian:</span><span class="hf f">&#8203;</span></div>' +
				h.line('Name of ' + fm(rel) + '/legal guardian:', 'decl_name', '', declName) +
				idRows(h, 'd') + '</div>' +
				placeDate(h) +
				'<p class="note" style="margin-top:14px"><b>Note:</b></p>' +
				'<div class="num note"><span class="n">1.</span><span class="t">Non submission of consent of other parent is only for issuance of passport and will not have any bearing on mentioning names of both the parent in the passport.</span></div>' +
				'<div class="num note"><span class="n">2.</span><span class="t">Section 5 of the Passports Act 1967 read with Rule 5 of the Passports Rules, 1980 stipulates that Passport Authority may make all such enquiry and may require an applicant to furnish such additional information, documents or certificates, as may be considered necessary by the Passport Authority for the proper disposal of the application required.</span></div>' +
				'<p class="c" style="margin-top:10px"><b>*****</b></p>';
		}
	};

	/* ===================================================================
	   ANNEXURE D – both parents / guardian
	   =================================================================== */
	var annD = {
		id: 'annexure_d',
		en: true,
		title: 'Passport Annexure D',
		sub: 'Declaration by parent(s) / legal guardian for a minor’s passport (1 page)',
		pages: [PAGE],
		sections: [{
				title: 'Who is declaring',
				fields: [
					radio('by', 'Declaration is made by', [
						{ v: 'both', t: 'Both parents (We)' },
						{ v: 'father', t: 'Father (I)' },
						{ v: 'mother', t: 'Mother (I)' },
						{ v: 'guardian', t: 'Legal guardian (I)' }
					], 'both'),
					field('arn', 'Passport application ARN no')
				]
			},
			{
				title: 'Minor child',
				fields: [
					field('child', 'Name of the minor child'),
					field('dob', 'Date of birth', { type: 'date' }),
					radio('gender', 'Child is', MALE_FEMALE)
				]
			},
			{
				title: 'Father & mother details',
				fields: parentFields()
			},
			{
				title: 'Father / legal guardian – signature block',
				fields: [field('sf_name', 'Name (blank = father’s name above)')].concat(idFields('sf', 'Father / guardian'))
			},
			{
				title: 'Mother / legal guardian – signature block',
				fields: [field('sm_name', 'Name (blank = mother’s name above)')].concat(idFields('sm', 'Mother / guardian'))
			},
			{
				title: 'Place & date',
				fields: PLACEDATE
			}
		],
		render: function(pi, vals) {
			var h = H(vals),
				by = h.v('by'),
				g = h.v('gender');
			var iw = alt(['I', 'We'], by ? (by === 'both' ? 'We' : 'I') : '');
			var amare = alt(['am', 'are'], by ? (by === 'both' ? 'are' : 'am') : '');
			var role = alt(['mother', 'father', 'parent(s)', 'legal guardian(s)'], { father: 'father', mother: 'mother', both: 'parent(s)', guardian: 'legal guardian(s)' }[by] || '');
			var head = alt(['parent(s)', 'legal guardian'], by ? (by === 'guardian' ? 'legal guardian' : 'parent(s)') : '');
			var sfName = h.v('sf_name') || h.v('f_name'),
				smName = h.v('sm_name') || h.v('m_name');
			var sign = function(p, lbl, nm) {
				return '<div><div class="ln"><span class="lb">' + lbl + '</span><span class="hf f">&#8203;</span></div>' +
					h.line('Name of ' + (p === 'sf' ? 'father' : 'Mother'), p + '_name', '', nm) + idRows(h, p) + '</div>';
			};
			return '<div class="c"><b>ANNEXURE ‘D’</b></div>' +
				'<p class="ttl" style="margin-top:12px">SPECIMEN DECLARATION BY APPLICANT’S PARENT(S) OR GUARDIAN FOR ISSUE OF PASSPORT TO MINOR</p>' +
				'<p class="c" style="margin-bottom:14px">(On plain paper)</p>' +
				'<p>' + iw + ', ' + head + ' of minor child whose details are mentioned below solemnly declare and affirm as under:-</p>' +
				'<div class="ind">' + h.line('Name of the minor child:', 'child') + h.line('Date of Birth:', 'dob_t', '', fmtDate(vals.dob)) + '</div>' +
				detailsBlock(h) +
				'<div class="num"><span class="n">1.</span><span class="t">That ' + iw + ' ' + amare + ' the ' + role + ' of the above minor child on whose behalf ' + iw + ' ' + amare + ' submitting passport application vide ARN no ' + h.slot('arn', 150) + '</span></div>' +
				'<div class="num"><span class="n">2.</span><span class="t">The minor child mentioned above is a citizen of India. ' + iw + ' solemnly declare that ' + pron(h, 'he', g) + ' has not lost, surrendered or has been deprived of ' + pron(h, 'his', g) + ' citizenship of India.</span></div>' +
				'<div class="num"><span class="n">3.</span><span class="t">' + iw + ' undertake the entire responsibility for ' + pron(h, 'his', g) + ' expenses.</span></div>' +
				'<div class="num"><span class="n">4.</span><span class="t">' + iw + ' hereby certify and undertake that if any information provided in the above declaration is found incorrect or misleading, following action may be taken by the Passport Authority for:' +
				'<div class="sub"><span>a)</span><span>Cancellation (impounding/ revocation) of the passport issued on the basis of this declaration;</span></div>' +
				'<div class="sub"><span>b)</span><span>Initiating criminal proceedings under relevant provisions of Bharatiya Nyaya Sanhita, 2023 and the Passports Act, 1967</span></div></span></div>' +
				'<div class="sg" style="margin-top:20px">' + sign('sf', 'Signature of father/legal guardian', sfName) + sign('sm', 'Signature of Mother/Legal Guardian', smName) + '</div>' +
				placeDate(h) +
				'<p class="note" style="margin-top:12px"><b>Note:</b></p>' +
				'<div class="num note"><span class="n">1.</span><span class="t">In case of ‘Legal guardian’, copy of court order appointing ‘Legal guardian’ of minor to be attached.</span></div>' +
				'<div class="num note"><span class="n">2.</span><span class="t">Section 5 of the Passports Act 1967 read with Rule 5 of the Passports Rules, 1980 stipulates that Passport Authority may make all such enquiry and may require an applicant to furnish such additional information, documents or certificates, as may be considered necessary by the Passport Authority for the proper disposal of the application required.</span></div>' +
				'<p class="c" style="margin-top:6px"><b>*****</b></p>';
		}
	};

	/* ===================================================================
	   ANNEXURE J – joint declaration in lieu of marriage certificate
	   =================================================================== */
	var annJ = {
		id: 'annexure_j',
		en: true,
		title: 'Passport Annexure J',
		sub: 'Joint declaration in lieu of marriage certificate (1 page)',
		pages: [PAGE],
		sections: [{
				title: 'Applicant',
				fields: [
					radio('who', 'The passport applicant is the', [{ v: 'husband', t: 'Husband' }, { v: 'wife', t: 'Wife' }], 'husband'),
					field('address', 'Resident of (address of the applicant)', { type: 'textarea', rows: 2 })
				]
			},
			{
				title: 'Husband',
				fields: [field('h_name', 'Husband’s name'), field('h_aad', 'Aadhaar Card No'), field('h_voter', 'Voter ID Card no'), field('h_pp', 'Passport No')]
			},
			{
				title: 'Wife',
				fields: [field('w_name', 'Wife’s name'), field('w_aad', 'Aadhaar Card No'), field('w_voter', 'Voter ID Card no'), field('w_pp', 'Passport No')]
			},
			{
				title: 'Place & date',
				fields: PLACEDATE
			}
		],
		render: function(pi, vals) {
			var h = H(vals),
				who = h.v('who') || 'husband';
			var me = who === 'wife' ? h.v('w_name') : h.v('h_name');
			var sp = who === 'wife' ? h.v('h_name') : h.v('w_name');
			var addr = h.v('address');
			var block = function(p, lbl) {
				return '<div><div style="margin-bottom:26px">(' + lbl + ')</div>' +
					h.line('Name', p + '_name', 'or') +
					h.line('Aadhaar Card No', p + '_aad', 'or') +
					h.line('Voter ID Card no', p + '_voter', 'or') +
					h.line('Passport No', p + '_pp', '') + '</div>';
			};
			return '<p class="r" style="margin:0 0 30px"><b>Annexure ‘J’</b></p>' +
				'<p class="c" style="margin-bottom:34px"><b>JOINT DECLARATION IN LIEU OF MARRIAGE CERTIFICATE</b></p>' +
				'<p style="line-height:1.75;text-align:left">I ' + h.slot('app_name', 230, me) + ' (Name of the passport applicant) resident of <span class="hf" style="min-width:300px">' + (addr ? esc(addr) : '&#8203;') + '</span> declare and affirm as under:</p>' +
				'<p style="line-height:1.75">1.&nbsp; That I am married with ' + h.slot('sp1', 250, sp) + ' (Name of spouse) and has been living together as married couple.</p>' +
				'<p style="line-height:1.75">2.&nbsp;&nbsp; That my passport be issued / reissued with my spouse name as ' + h.slot('sp2', 240, sp) + ' (Name of the spouse).</p>' +
				'<p style="line-height:1.6">3.&nbsp; That I solemnly affirm that the information given above is correct to the best of my knowledge and in case of litigation arising due to issue/reissue of my passport, I would be solely responsible for defending the case and not the passport issuing authority.</p>' +
				'<div class="photo">Latest joint photographs of husband and wife (to be self attested on the photo)</div>' +
				'<div style="display:flex;justify-content:space-between;text-align:left"><span>Place: <span class="hv">' + esc(h.v('place')) + '</span></span><span style="margin-right:60px">Date: <span class="hv">' + h.date('date') + '</span></span></div>' +
				'<div class="sg" style="margin-top:34px;line-height:1.5">' + block('h', 'Signature of Applicant/husband') + block('w', 'Signature of Applicant/wife') + '</div>';
		}
	};
	window.AFF_HTML_CSS = CSS;
	window.AFF_DEFS = window.AFF_DEFS || [];
	window.AFF_DEFS.push(annC, annD, annJ);

	/* page CSS for the on-screen preview (print / PDF get it from affidavit-generator.js) */
	var st = document.createElement('style');
	st.id = 'affHtmlCss';
	st.textContent = CSS;
	document.head.appendChild(st);
})();