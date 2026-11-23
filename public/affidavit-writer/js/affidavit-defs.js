/* Affidavit definitions.
 *
 * Each affidavit = background page image(s) (the original PDF rendered to PNG)
 * + a list of input fields + a list of "placements" that say where each value is
 * written on the page. All coordinates are PDF points (1/72 in), measured from the
 * top-left corner of the page.
 *
 *   dot(field, page, x0, x1, y)         value written over a dotted line  (x0..x1, line top y)
 *   cell(field, page, x0, x1, y0, y1)   value written inside a table cell (vertically centred)
 *   cellTop(...)                        same but aligned to the top of the cell
 *
 * Strike groups draw a line through the words that were NOT chosen (e.g. the
 * "വിദേശത്ത് / സ്വദേശത്ത്" pair).  rects = [page, x0, x1, y]  (y = top of the text line).
 */
(function() {

	var dot = function(f, p, x0, x1, y, o) {
		return Object.assign({ f: f, p: p, x: x0, y: y - 0.8, w: x1 - x0, h: 11.5, size: 10 }, o || {});
	};
	var cell = function(f, p, x0, x1, y0, y1, o) {
		return Object.assign({ f: f, p: p, x: x0 + 3, y: y0, w: x1 - x0 - 6, h: y1 - y0, size: 10, vc: true }, o || {});
	};
	var cellTop = function(f, p, x0, x1, y0, y1, o) {
		return cell(f, p, x0, x1, y0, y1, Object.assign({ vc: false, pad: 3 }, o || {}));
	};

	var F = function(id, label, o) {
		return Object.assign({ id: id, label: label, type: 'text', ml: true }, o || {});
	};
	var NUM = { ml: false };

	var YESNO = [
		{ v: '', t: '—' },
		{ v: 'ഉണ്ട്', t: 'ഉണ്ട് (Yes)' },
		{ v: 'ഇല്ല', t: 'ഇല്ല (No)' }
	];

	/* ===================================================================
	   1. NON-CREAMY LAYER  –  Village Officer statement + Sathyaprastavana
	   =================================================================== */
	var nc = {
		id: 'non_creamy',
		title: 'Non-Creamy Layer Certificate',
		sub: 'Village Officer statement + Sathyaprastavana (4 pages → 2 sheets)',
		pages: [
			{ img: 'non-creamy-1.png', w: 595, h: 841 },
			{ img: 'non-creamy-2.png', w: 595, h: 841 }
		],
		sections: [{
				title: 'Applicant (statement table)',
				fields: [
					F('nc_name', 'Applicant name (അപേക്ഷകന്റെ പേര്)'),
					F('nc_address', 'Applicant address (വിലാസം)', { type: 'textarea', rows: 3 }),
					F('nc_for', 'Certificate for whom (ആർക്കുവേണ്ടി)'),
					F('nc_purpose', 'Purpose (ആവശ്യത്തിന് വേണ്ടി)')
				]
			},
			{
				title: 'Father',
				fields: [
					F('nc_f_name', "Father's name (പിതാവിന്റെ പേര്)"),
					F('nc_f_village', 'Village where father was born & brought up'),
					F('nc_f_caste', "Father's religion, caste (മതം, ജാതി)"),
					F('nc_f_income', "Father's income (വരുമാനം)", { ml: false }),
					F('nc_f_wt', 'Pays wealth tax? (വെൽത്ത് ടാക്സ്)', { type: 'select', options: YESNO, ml: false }),
					F('nc_f_land', 'Land in father\'s name (ഭൂമി)'),
					F('nc_f_land_income', 'Income from the land', { ml: false })
				]
			},
			{
				title: 'Mother',
				fields: [
					F('nc_m_name', "Mother's name & address (പേര്, വിലാസം)", { type: 'textarea', rows: 2 }),
					F('nc_m_village', 'Village where mother was born'),
					F('nc_m_caste', "Mother's religion, caste (മതം, ജാതി)"),
					F('nc_m_income', "Mother's income (വരുമാനം)", { ml: false }),
					F('nc_m_wt', 'Pays wealth tax? (വെൽത്ത് ടാക്സ്)', { type: 'select', options: YESNO, ml: false }),
					F('nc_m_land', "Land in mother's name (ഭൂമി)"),
					F('nc_m_land_income', 'Income from the land', { ml: false })
				]
			},
			{
				title: 'Family members (കുടുംബാംഗങ്ങളുടെ പേരുവിവരം)',
				fields: [{
					id: 'nc_family',
					type: 'table',
					max: 10,
					rows: 3,
					cols: [
						{ id: 'name', label: 'Name (പേര്)', ml: true, w: 3 },
						{ id: 'age', label: 'Age (വയസ്)', ml: false, w: 1 },
						{ id: 'job', label: 'Job (ജോലി)', ml: true, w: 2 },
						{ id: 'inc', label: 'Income (വരുമാനം)', ml: false, w: 2 }
					]
				}]
			},
			{
				title: 'Place & date (page 1)',
				fields: [
					F('nc_place', 'Place (സ്ഥലം)'),
					F('nc_date', 'Date (തീയതി)', { type: 'date', ml: false, today: true })
				]
			},

			/* ---- page 2 : Sathyaprastavana ---- */
			{
				title: 'Declaration – declarant (satyaprastavana)',
				fields: [
					F('s_taluk', 'Taluk (താലൂക്ക്)'),
					F('s_village', 'Village (വില്ലേജ്)'),
					F('s_amsham', 'Amsham (അംശം)'),
					F('s_desham', 'Desham (ദേശം)'),
					F('s_house', 'House name (വീട്ടുപേര്)'),
					F('s_name', 'Declarant name (പേര്)', { link: 'nc_name' }),
					F('s_father', "Father's name (മകൻ/മകൾ)", { link: 'nc_f_name' }),
					F('s_age', 'Age (വയസ്സ്)', NUM),
					F('s_aadhaar', 'Aadhaar number (ആധാർ)', NUM)
				]
			},
			{
				title: 'Declaration – 1. Birth / residence / education',
				fields: [
					F('s_born', 'Village where born & brought up'),
					F('s_years', 'Years of permanent residence', NUM),
					F('s_resvillage', 'Village of residence'),
					F('s_college', 'College (കോളേജ്)'),
					F('s_course', 'Course name (കോഴ്സ്)')
				]
			},
			{
				title: 'Declaration – 2. Applicant income',
				fields: [
					F('s_self_loc', 'Job abroad / in India', { type: 'radio', options: [{ v: 'abroad', t: 'വിദേശത്ത് (Abroad)' }, { v: 'home', t: 'സ്വദേശത്ത് (India)' }], ml: false }),
					F('s_self_job', 'Job (ജോലി)'),
					F('s_self_income', 'Annual income', NUM)
				]
			},
			{
				title: 'Declaration – 3. Applicant land',
				fields: [
					F('s_land_village', 'Village of the land'),
					F('s_land_extent', 'Extent', NUM),
					F('s_land_unit', 'Unit', { type: 'radio', options: [{ v: 'acre', t: 'ഏക്കർ (Acre)' }, { v: 'cent', t: 'സെന്റ് (Cent)' }], ml: false }),
					F('s_land_income', 'Annual income from the land', NUM)
				]
			},
			{
				title: 'Declaration – 4. Father',
				fields: [
					F('s_f_name', "Father's name (ശ്രീ.)", { link: 'nc_f_name' }),
					F('s_f_loc', 'Job abroad / in India', { type: 'radio', options: [{ v: 'abroad', t: 'വിദേശത്ത് (Abroad)' }, { v: 'home', t: 'സ്വദേശത്ത് (India)' }], ml: false }),
					F('s_f_job', 'Job (ജോലി)'),
					F('s_f_income', 'Annual income', NUM)
				]
			},
			{
				title: 'Declaration – 5. Mother',
				fields: [
					F('s_m_name', "Mother's name (ശ്രീമതി.)"),
					F('s_m_loc', 'Job abroad / in India', { type: 'radio', options: [{ v: 'abroad', t: 'വിദേശത്ത് (Abroad)' }, { v: 'home', t: 'സ്വദേശത്ത് (India)' }], ml: false }),
					F('s_m_job', 'Job (ജോലി)'),
					F('s_m_income', 'Annual income', NUM)
				]
			},
			{
				title: 'Declaration – 6 & 7. Spouse',
				fields: [
					F('s_sp_rel', 'Spouse is', { type: 'radio', options: [{ v: 'wife', t: 'ഭാര്യ (Wife)' }, { v: 'husband', t: 'ഭർത്താവ് (Husband)' }], ml: false }),
					F('s_sp_name', "Spouse's name"),
					F('s_sp_loc', 'Job abroad / in India', { type: 'radio', options: [{ v: 'abroad', t: 'വിദേശത്ത് (Abroad)' }, { v: 'home', t: 'സ്വദേശത്ത് (India)' }], ml: false }),
					F('s_sp_job', 'Job (ജോലി)'),
					F('s_sp_income', 'Annual income', NUM),
					F('s_sp_land_village', 'Spouse land – village'),
					F('s_sp_land_extent', 'Spouse land – extent', NUM),
					F('s_sp_land_unit', 'Spouse land – unit', { type: 'radio', options: [{ v: 'acre', t: 'ഏക്കർ (Acre)' }, { v: 'cent', t: 'സെന്റ് (Cent)' }], ml: false }),
					F('s_sp_land_income', 'Annual income from spouse land', NUM)
				]
			},
			{
				title: 'Declaration – 8. Rented building',
				fields: [
					F('s_rent_owner', 'Building is in the name of', { type: 'checks', ml: false, options: [{ v: 'self', t: 'എന്റെ (Self)' }, { v: 'wife', t: 'ഭാര്യ (Wife)' }, { v: 'husband', t: 'ഭർത്താവ് (Husband)' }, { v: 'father', t: 'പിതാവ് (Father)' }, { v: 'mother', t: 'മാതാവ് (Mother)' }] }),
					F('s_rent_village', 'Village'),
					F('s_rent_income', 'Net annual rent income', NUM)
				]
			},
			{
				title: 'Declaration – 9. Son / daughter',
				fields: [
					F('s_ch_rel', 'Child is', { type: 'radio', options: [{ v: 'daughter', t: 'മകൾ (Daughter)' }, { v: 'son', t: 'മകൻ (Son)' }], ml: false }),
					F('s_ch_name', "Child's name"),
					F('s_ch_loc', 'Job abroad / in India', { type: 'radio', options: [{ v: 'abroad', t: 'വിദേശത്ത് (Abroad)' }, { v: 'home', t: 'സ്വദേശത്ത് (India)' }], ml: false }),
					F('s_ch_job', 'Job (ജോലി)'),
					F('s_ch_income', 'Annual income', NUM)
				]
			},
			{
				title: 'Declaration – 10. House',
				fields: [
					F('s_house_owner', 'House is in the name of', { type: 'checks', ml: false, options: [{ v: 'self', t: 'എന്റെ (Self)' }, { v: 'wife', t: 'ഭാര്യ (Wife)' }, { v: 'husband', t: 'ഭർത്താവ് (Husband)' }, { v: 'father', t: 'പിതാവ് (Father)' }, { v: 'mother', t: 'മാതാവ് (Mother)' }] }),
					F('s_house_area', 'Area (വിസ്തീർണ്ണം)', NUM),
					F('s_house_type', 'House type', { type: 'radio', options: [{ v: 'tile', t: 'ഓടിട്ട (Tiled)' }, { v: 'concrete', t: 'കോൺക്രീറ്റിട്ട (Concrete)' }], ml: false }),
					F('s_house_value', 'Approx. market value', NUM)
				]
			},
			{
				title: 'Declaration – 11. Vehicle',
				fields: [
					F('s_veh_owner', 'Vehicle is in the name of', { type: 'checks', ml: false, options: [{ v: 'self', t: 'എന്റെ (Self)' }, { v: 'wife', t: 'ഭാര്യ (Wife)' }, { v: 'husband', t: 'ഭർത്താവ് (Husband)' }, { v: 'father', t: 'പിതാവ് (Father)' }, { v: 'mother', t: 'മാതാവ് (Mother)' }] }),
					F('s_veh_model', 'Model (മോഡൽ)', { ml: false }),
					F('s_veh_value', 'Approx. market value', NUM)
				]
			},
			{
				title: 'Declaration – 12. Other income',
				fields: [
					F('s_oth_owner', 'Income is in the name of', { type: 'checks', ml: false, options: [{ v: 'self', t: 'എന്റെ (Self)' }, { v: 'wife', t: 'ഭാര്യ (Wife)' }, { v: 'husband', t: 'ഭർത്താവ് (Husband)' }, { v: 'father', t: 'പിതാവ് (Father)' }, { v: 'mother', t: 'മാതാവ് (Mother)' }] }),
					F('s_oth_type', 'Type of income (ഇനം)'),
					F('s_oth_amount', 'Annual income', NUM)
				]
			}
		],

		place: (function() {
			var P = [];
			/* ---- page 1 : table (answer column x 302.5 → 537) ---- */
			var X0 = 302.5,
				X1 = 537;
			P.push(cell('nc_name', 0, X0, X1, 116, 136));
			P.push(cellTop('nc_address', 0, X0, X1, 136, 185.5, { multi: true }));
			P.push(cell('nc_for', 0, X0, X1, 185.5, 203));
			P.push(cell('nc_purpose', 0, X0, X1, 203, 220));
			P.push(cell('nc_f_name', 0, X0, X1, 220, 236));
			P.push(cell('nc_f_village', 0, X0, X1, 236, 253.5));
			P.push(cell('nc_f_caste', 0, X0, X1, 253.5, 270));
			P.push(cell('nc_f_income', 0, X0, X1, 270, 287));
			P.push(cell('nc_f_wt', 0, X0, X1, 287, 304.5));
			P.push(cell('nc_f_land', 0, X0, X1, 304.5, 321.5));
			P.push(cell('nc_f_land_income', 0, X0, X1, 321.5, 337));
			P.push(cellTop('nc_m_name', 0, X0, X1, 337, 387.5, { multi: true }));
			P.push(cell('nc_m_village', 0, X0, X1, 387.5, 404.5));
			P.push(cell('nc_m_caste', 0, X0, X1, 404.5, 421));
			P.push(cell('nc_m_income', 0, X0, X1, 421, 438));
			P.push(cell('nc_m_wt', 0, X0, X1, 438, 455));
			P.push(cell('nc_m_land', 0, X0, X1, 455, 472));
			P.push(cell('nc_m_land_income', 0, X0, X1, 472, 487.5));
			/* family table: rows are added dynamically */
			P.push({
				table: 'nc_family',
				p: 0,
				y0: 522,
				pitch: 13.8,
				size: 10,
				cols: [
					{ c: 'name', x: 67, w: 187 },
					{ c: 'age', x: 259, w: 80 },
					{ c: 'job', x: 344, w: 88 },
					{ c: 'inc', x: 436, w: 99 }
				]
			});
			P.push(dot('nc_place', 0, 116, 300, 759, { size: 11 }));
			P.push(dot('nc_date', 0, 116, 300, 776.5, { size: 11 }));

			/* ---- page 2 : Sathyaprastavana dotted lines ---- */
			var d = function(f, x0, x1, y) { P.push(dot(f, 1, x0, x1, y)); };
			d('s_taluk', 92.5, 211.4, 138);
			d('s_village', 256.7, 384.9, 138);
			d('s_amsham', 438.9, 520.5, 138);
			d('s_desham', 97, 225.9, 152.4);
			d('s_house', 278.5, 456.3, 152.4);
			d('s_name', 56.6, 444.4, 166.7);
			d('s_father', 56.6, 370.8, 181.1);
			d('s_age', 412.7, 445.5, 181.1);
			d('s_aadhaar', 56.6, 198.5, 195.5);

			d('s_born', 132.2, 246.8, 238.7);
			d('s_years', 446.8, 493.6, 238.7);
			d('s_resvillage', 119.3, 235.7, 253);
			d('s_college', 92.5, 225.3, 267.4);
			d('s_course', 285.6, 432, 267.4);

			d('s_self_job', 254.1, 350.4, 296.2);
			d('s_self_income', 92.5, 139.2, 310.6);

			d('s_land_village', 173.1, 245.6, 324.9);
			d('s_land_extent', 300.9, 380.4, 324.9);
			d('s_land_income', 214.6, 256.5, 339.3);

			d('s_f_name', 195.8, 324.3, 353.7);
			d('s_f_job', 92.5, 249, 368.1);
			d('s_f_income', 416.7, 453, 368.1);

			d('s_m_name', 213.7, 342.1, 396.9);
			d('s_m_job', 92.5, 249, 411.2);
			d('s_m_income', 416.7, 453, 411.2);

			d('s_sp_name', 239.8, 368.3, 439.9);
			d('s_sp_job', 121.2, 282.4, 454.3);
			d('s_sp_income', 452.4, 489.7, 454.3);

			d('s_sp_land_village', 272.8, 328.8, 483);
			d('s_sp_land_extent', 383.6, 446.6, 483);
			d('s_sp_land_income', 279.6, 321.5, 497.4);

			d('s_rent_village', 351, 472.5, 511.8);
			d('s_rent_income', 92.5, 189.7, 540.6);

			d('s_ch_name', 201.2, 332, 555);
			d('s_ch_job', 92.5, 192.7, 569.3);
			d('s_ch_income', 362.5, 418.4, 569.3);

			d('s_house_area', 348.4, 398.5, 598.1);
			d('s_house_value', 475.8, 508.3, 612.5);

			d('s_veh_model', 348.7, 406.5, 641.3);
			d('s_veh_value', 192.3, 224.9, 655.6);

			d('s_oth_type', 361.5, 440.8, 670);
			d('s_oth_amount', 167.2, 218.5, 684.4);
			return P;
		})(),

		/* words struck through when not chosen. rects: [page, x0, x1, y-top] */
		strikes: (function() {
			var G = [];
			var loc = function(field, a, b) {
				// a, b = rect lists for "വിദേശത്ത്" and "സ്വദേശത്ത്"
				G.push({ f: field, type: 'radio', opts: { abroad: a, home: b } });
			};
			loc('s_self_loc', [
				[1, 141, 190, 296]
			], [
				[1, 200, 251, 296]
			]);
			loc('s_f_loc', [
				[1, 385, 434, 354]
			], [
				[1, 446, 498, 354]
			]);
			loc('s_m_loc', [
				[1, 403, 452, 397]
			], [
				[1, 464, 516, 397]
			]);
			loc('s_sp_loc', [
				[1, 429, 479, 440]
			], [
				[1, 491, 517, 440],
				[1, 93, 118, 454]
			]);
			loc('s_ch_loc', [
				[1, 392, 440, 555]
			], [
				[1, 450, 502, 555]
			]);

			G.push({ f: 's_land_unit', type: 'radio', opts: { acre: [
					[1, 384, 416, 325]
				], cent: [
					[1, 428, 458, 325]
				] } });
			G.push({ f: 's_sp_land_unit', type: 'radio', opts: { acre: [
					[1, 450, 481, 483]
				], cent: [
					[1, 493, 524, 483]
				] } });

			/* spouse: ഭാര്യ / ഭർത്താവ്  (items 6 and 7) */
			G.push({ f: 's_sp_rel', type: 'radio', opts: {
				wife: [
					[1, 136, 158, 440],
					[1, 135, 157, 483]
				],
				husband: [
					[1, 170, 213, 440],
					[1, 168, 211, 483]
				]
			} });

			G.push({ f: 's_ch_rel', type: 'radio', opts: {
				daughter: [
					[1, 135, 160, 555]
				],
				son: [
					[1, 172, 198, 555]
				]
			} });

			G.push({ f: 's_house_type', type: 'radio', opts: {
				tile: [
					[1, 223, 249, 612]
				],
				concrete: [
					[1, 263, 327, 612]
				]
			} });

			/* "എന്റെ / ഭാര്യ / ഭർത്താവ് / പിതാവ് / മാതാവ്" lists – struck when NOT ticked */
			var rel = function(field, y, xs) {
				var keys = ['self', 'wife', 'husband', 'father', 'mother'];
				var o = {};
				keys.forEach(function(k, i) {
					o[k] = [
						[1, xs[i][0], xs[i][1], y]
					];
				});
				G.push({ f: field, type: 'checks', opts: o });
			};
			rel('s_rent_owner', 512, [
				[103, 131],
				[142, 164],
				[176, 218],
				[230, 264],
				[276, 310]
			]);
			rel('s_house_owner', 598, [
				[106, 134],
				[144, 166],
				[177, 219],
				[230, 264],
				[274, 309]
			]);
			rel('s_veh_owner', 641, [
				[104, 132],
				[143, 165],
				[176, 218],
				[229, 263],
				[274, 309]
			]);
			rel('s_oth_owner', 670, [
				[107, 135],
				[148, 170],
				[182, 225],
				[238, 272],
				[285, 319]
			]);
			return G;
		})()
	};

	/* ===================================================================
	   2. INCOME STATEMENT
	   =================================================================== */
	var inc = {
		id: 'income',
		title: 'Income Certificate Statement',
		sub: 'Statement before the Village Officer (വരുമാന സർട്ടിഫിക്കറ്റ്)',
		pages: [
			{ img: 'income-1.png', w: 595.3, h: 841.9 },
			{ img: 'income-2.png', w: 595.3, h: 841.9 }
		],
		sections: [{
				title: 'Applicant details',
				fields: [
					F('i_village', 'Village (വില്ലേജ്)'),
					F('i_place', 'Place (സ്ഥലം)'),
					F('i_house', 'House name (വീട്)'),
					F('i_father', "Father's name (രക്ഷിതാവ്)"),
					F('i_name', 'Applicant name (മകൻ/മകൾ)'),
					F('i_mobile', 'Mobile number', NUM)
				]
			},
			{
				title: '1. Residence & IDs',
				fields: [
					F('i_years', 'Years of permanent residence', NUM),
					F('i_houseno', 'House number', NUM),
					F('i_ration', 'Ration card number', NUM),
					F('i_aadhaar', 'Aadhaar card number', NUM),
					F('i_voter', 'Voter ID number', NUM)
				]
			},
			{
				title: '2. Purpose',
				fields: [
					F('i_purpose', 'Purpose of the income certificate (ആവശ്യം)'),
					F('i_appno', 'Application number', NUM)
				]
			},
			{
				title: '3. Family members',
				fields: [{
					id: 'i_family',
					type: 'fixedtable',
					cols: [
						{ id: 'name', label: 'Name (പേര്)', ml: true, w: 3 },
						{ id: 'age', label: 'Age', ml: false, w: 1 },
						{ id: 'job', label: 'Job (തൊഴിൽ)', ml: true, w: 3 }
					],
					rows: [
						'അപേക്ഷകന്‍/അപേക്ഷക (Applicant)', 'ഭാര്യ/ഭര്‍ത്താവ് (Spouse)', 'പിതാവ് (Father)', 'മാതാവ് (Mother)',
						'മകന്‍/മകള്‍-1 (Child 1)', 'മകന്‍/മകള്‍-2 (Child 2)', 'സഹോദരന്‍/സഹോദരി-1 (Sibling 1)', 'സഹോദരന്‍/സഹോദരി-2 (Sibling 2)',
						'ആശ്രയിച്ചു കഴിയുന്നവര്‍/മറ്റുള്ളവര്‍ (Dependants)'
					]
				}, F('i_total', 'Total number of members (ആകെ എണ്ണം)', { ml: false, auto: 'family' })]
			},
			{
				title: '4. Residence details',
				fields: [
					F('i_own_house', 'Does the family own a house? (സ്വന്തമായി വീടുണ്ടോ)', { type: 'select', options: YESNO, ml: false }),
					F('i_house_type', 'House type (ഓല, ഓട്, ഷീറ്റ്, ടെറസ്…)'),
					F('i_house_area', 'Floor area (തറ വിസ്തീർണ്ണം)', NUM),
					F('i_rent', 'Rent (if rented)', NUM)
				]
			},
			{
				title: '5. Land held by family',
				fields: [
					F('i_land_total', 'Total land area', NUM),
					F('i_land_split', 'Agricultural land / house land'),
					F('i_crop', 'Type of cultivation')
				]
			},
			{
				title: '6. Vehicles',
				fields: [
					F('i_veh_yes', 'Does the family own vehicles?', { type: 'select', options: YESNO, ml: false }),
					F('i_veh_type', 'Vehicle type (കാര്‍, ബൈക്ക്, ഓട്ടോ…)'),
					F('i_veh_use', 'Private / passenger / goods / carrier')
				]
			},
			{
				title: '7. Income details',
				fields: [
					F('i_adults', 'Adult family members', NUM),
					F('i_earners', 'Number earning an income', NUM),
					F('i_tech', 'Technical / skilled workers', NUM),
					F('i_daily', 'Wage / manual / temporary workers', NUM),
					F('i_unable', 'Unable to work / learning a trade', NUM),
					F('i_fixed', 'Salary / pension (fixed income)', NUM),
					F('i_business', 'Business / profession / foreign income', NUM),
					F('i_annual', 'Total annual family income', NUM),
					F('i_docs', 'Documents submitted as proof', { type: 'textarea', rows: 2 })
				]
			},
			{
				title: 'Place & date (page 2)',
				fields: [
					F('i_sp_place', 'Place (സ്ഥലം)', { link: 'i_place' }),
					F('i_date', 'Date (തീയതി)', { type: 'date', ml: false, today: true })
				]
			}
		],
		place: (function() {
			var P = [];
			var d = function(f, x0, x1, y) { P.push(dot(f, 0, x0, x1, y)); };
			d('i_village', 58.5, 142.3, 132.3);
			d('i_place', 195.5, 510.5, 131.5);
			d('i_house', 106.9, 514.4, 148.5);
			d('i_father', 97.4, 220.9, 168);
			d('i_name', 306.3, 541.3, 167.3);
			d('i_mobile', 133.3, 273.3, 187.8);
			d('i_years', 259.4, 316.9, 218.8);
			d('i_houseno', 112, 210.1, 238.6);
			d('i_ration', 286, 533.3, 239.8);
			d('i_aadhaar', 142, 313.1, 258.6);
			d('i_voter', 398, 532.6, 256.5);
			d('i_purpose', 110.5, 410.5, 287.9);
			d('i_appno', 280.5, 470.5, 306.7);

			/* family table */
			var rows = [
				[362.5, 381.5],
				[381.5, 400],
				[400, 416],
				[416, 432],
				[432, 451],
				[451, 469.5],
				[469.5, 488],
				[488, 506.5],
				[506.5, 525]
			];
			rows.forEach(function(r, i) {
				P.push(cell({ t: 'i_family', r: i, c: 'name' }, 0, 210, 371, r[0], r[1], { size: 9.5 }));
				P.push(cell({ t: 'i_family', r: i, c: 'age' }, 0, 371, 405.5, r[0], r[1], { size: 9.5 }));
				P.push(cell({ t: 'i_family', r: i, c: 'job' }, 0, 405.5, 538.5, r[0], r[1], { size: 9.5 }));
			});
			P.push(cell('i_total', 0, 210, 371, 525, 541, { size: 9.5 }));

			var A0 = 371,
				A1 = 538.5;
			P.push(cell('i_own_house', 0, A0, A1, 560, 576.5, { size: 9.5 }));
			P.push(cell('i_house_type', 0, A0, A1, 576.5, 595, { size: 9.5 }));
			P.push(cell('i_house_area', 0, A0, A1, 595, 611, { size: 9.5 }));
			P.push(cell('i_rent', 0, A0, A1, 611, 627, { size: 9.5 }));

			P.push(cell('i_land_total', 0, A0, A1, 646, 662.5, { size: 9.5 }));
			P.push(cell('i_land_split', 0, A0, A1, 662.5, 681, { size: 9.5 }));
			P.push(cell('i_crop', 0, A0, A1, 681, 697, { size: 9.5 }));

			P.push(cell('i_veh_yes', 0, A0, A1, 716, 732, { size: 9.5 }));
			P.push(cell('i_veh_type', 0, A0, A1, 732, 750.5, { size: 9.5 }));
			P.push(cell('i_veh_use', 0, A0, A1, 750.5, 769.5, { size: 9.5 }));

			/* page 2 – income table (answer column 378 → 538.5) */
			var B0 = 378,
				B1 = 538.5;
			var q = function(f, y0, y1, o) { P.push(cell(f, 1, B0, B1, y0, y1, Object.assign({ size: 10 }, o || {}))); };
			q('i_adults', 75.5, 108.5);
			q('i_earners', 108.5, 130);
			q('i_tech', 130, 149);
			q('i_daily', 149, 186.5);
			q('i_unable', 186.5, 224.5);
			q('i_fixed', 224.5, 246);
			q('i_business', 246, 284);
			P.push(cellTop('i_annual', 1, B0, B1, 284, 432, { size: 10, pad: 4 }));
			P.push(cellTop('i_docs', 1, B0, B1, 432, 483.5, { size: 9.5, multi: true, pad: 4 }));

			P.push(dot('i_sp_place', 1, 100, 330, 688, { size: 10.5 }));
			P.push(dot('i_date', 1, 104, 330, 707, { size: 10.5 }));
			return P;
		})(),
		strikes: []
	};

	window.AFF_DEFS = [nc, inc];
})();