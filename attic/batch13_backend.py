#!/usr/bin/env python3
"""Batch 13 backend: every currency searchable, price projects, notes, instant conversions,
and a view of everything comparable across places.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch13_backend.py
"""
import os, sqlite3, subprocess, sys
SRC = 'app.py'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

db = sqlite3.connect('data/ami_memory.db')
for sql in [
    """CREATE TABLE IF NOT EXISTS price_projects (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, about TEXT,
        venture_id INTEGER, started_on DATE, ended_on DATE, status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""",
    "ALTER TABLE price_entries ADD COLUMN project_id INTEGER",
]:
    try: db.execute(sql)
    except Exception: pass
db.commit(); db.close()
note(True, 'projects table')

src = open(SRC).read()
anchor = '@app.get("/api/report")'

# ---- every country and its currency, plus the cities worth knowing ----------
o = """_CCY_BY_COUNTRY = {
    'sierra leone': 'SLE', 'kenya': 'KES', 'ghana': 'GHS', 'nigeria': 'NGN',
    'south africa': 'ZAR', 'rwanda': 'RWF', 'uae': 'AED', 'dubai': 'AED',
    'united states': 'USD', 'usa': 'USD', 'uk': 'GBP', 'united kingdom': 'GBP',
    'canada': 'CAD', 'mexico': 'MXN', 'cameroon': 'XAF', 'tanzania': 'TZS',
    'uganda': 'UGX', 'ethiopia': 'ETB', 'senegal': 'XOF', 'ivory coast': 'XOF',
}"""
n = """_CCY_BY_COUNTRY = {
    # Africa
    'sierra leone': 'SLE', 'kenya': 'KES', 'ghana': 'GHS', 'nigeria': 'NGN',
    'south africa': 'ZAR', 'rwanda': 'RWF', 'tanzania': 'TZS', 'uganda': 'UGX',
    'ethiopia': 'ETB', 'cameroon': 'XAF', 'senegal': 'XOF', 'ivory coast': 'XOF',
    "cote d'ivoire": 'XOF', 'benin': 'XOF', 'togo': 'XOF', 'burkina faso': 'XOF',
    'mali': 'XOF', 'niger': 'XOF', 'guinea bissau': 'XOF', 'chad': 'XAF',
    'gabon': 'XAF', 'congo': 'XAF', 'central african republic': 'XAF',
    'equatorial guinea': 'XAF', 'liberia': 'LRD', 'guinea': 'GNF', 'gambia': 'GMD',
    'morocco': 'MAD', 'egypt': 'EGP', 'tunisia': 'TND', 'algeria': 'DZD',
    'libya': 'LYD', 'sudan': 'SDG', 'south sudan': 'SSP', 'somalia': 'SOS',
    'djibouti': 'DJF', 'eritrea': 'ERN', 'burundi': 'BIF', 'malawi': 'MWK',
    'zambia': 'ZMW', 'zimbabwe': 'ZWL', 'mozambique': 'MZN', 'angola': 'AOA',
    'namibia': 'NAD', 'botswana': 'BWP', 'lesotho': 'LSL', 'eswatini': 'SZL',
    'madagascar': 'MGA', 'mauritius': 'MUR', 'seychelles': 'SCR',
    'cape verde': 'CVE', 'sao tome': 'STN', 'comoros': 'KMF', 'drc': 'CDF',
    'democratic republic of congo': 'CDF',
    # Americas
    'united states': 'USD', 'usa': 'USD', 'us': 'USD', 'canada': 'CAD',
    'mexico': 'MXN', 'brazil': 'BRL', 'argentina': 'ARS', 'chile': 'CLP',
    'colombia': 'COP', 'peru': 'PEN', 'panama': 'PAB', 'costa rica': 'CRC',
    'jamaica': 'JMD', 'trinidad': 'TTD', 'trinidad and tobago': 'TTD',
    'dominican republic': 'DOP', 'guatemala': 'GTQ', 'uruguay': 'UYU',
    # Europe
    'uk': 'GBP', 'united kingdom': 'GBP', 'england': 'GBP', 'ireland': 'EUR',
    'france': 'EUR', 'germany': 'EUR', 'spain': 'EUR', 'italy': 'EUR',
    'portugal': 'EUR', 'netherlands': 'EUR', 'belgium': 'EUR', 'greece': 'EUR',
    'austria': 'EUR', 'finland': 'EUR', 'switzerland': 'CHF', 'norway': 'NOK',
    'sweden': 'SEK', 'denmark': 'DKK', 'poland': 'PLN', 'czech republic': 'CZK',
    'hungary': 'HUF', 'romania': 'RON', 'turkey': 'TRY', 'russia': 'RUB',
    'ukraine': 'UAH',
    # Middle East and Asia
    'uae': 'AED', 'united arab emirates': 'AED', 'dubai': 'AED', 'qatar': 'QAR',
    'saudi arabia': 'SAR', 'kuwait': 'KWD', 'bahrain': 'BHD', 'oman': 'OMR',
    'jordan': 'JOD', 'lebanon': 'LBP', 'israel': 'ILS', 'india': 'INR',
    'pakistan': 'PKR', 'bangladesh': 'BDT', 'sri lanka': 'LKR', 'nepal': 'NPR',
    'china': 'CNY', 'japan': 'JPY', 'south korea': 'KRW', 'korea': 'KRW',
    'thailand': 'THB', 'vietnam': 'VND', 'indonesia': 'IDR', 'malaysia': 'MYR',
    'singapore': 'SGD', 'philippines': 'PHP', 'hong kong': 'HKD', 'taiwan': 'TWD',
    # Oceania
    'australia': 'AUD', 'new zealand': 'NZD', 'fiji': 'FJD',
}

_CCY_NAMES = {
    'SLE': 'Sierra Leonean leone', 'KES': 'Kenyan shilling', 'GHS': 'Ghanaian cedi',
    'NGN': 'Nigerian naira', 'ZAR': 'South African rand', 'RWF': 'Rwandan franc',
    'TZS': 'Tanzanian shilling', 'UGX': 'Ugandan shilling', 'ETB': 'Ethiopian birr',
    'XAF': 'Central African franc', 'XOF': 'West African franc', 'LRD': 'Liberian dollar',
    'GNF': 'Guinean franc', 'GMD': 'Gambian dalasi', 'MAD': 'Moroccan dirham',
    'EGP': 'Egyptian pound', 'ZMW': 'Zambian kwacha', 'MZN': 'Mozambican metical',
    'AOA': 'Angolan kwanza', 'NAD': 'Namibian dollar', 'BWP': 'Botswana pula',
    'MUR': 'Mauritian rupee', 'CDF': 'Congolese franc', 'MWK': 'Malawian kwacha',
    'USD': 'US dollar', 'CAD': 'Canadian dollar', 'MXN': 'Mexican peso',
    'BRL': 'Brazilian real', 'GBP': 'British pound', 'EUR': 'Euro',
    'CHF': 'Swiss franc', 'NOK': 'Norwegian krone', 'SEK': 'Swedish krona',
    'TRY': 'Turkish lira', 'AED': 'UAE dirham', 'QAR': 'Qatari riyal',
    'SAR': 'Saudi riyal', 'KWD': 'Kuwaiti dinar', 'OMR': 'Omani rial',
    'INR': 'Indian rupee', 'PKR': 'Pakistani rupee', 'CNY': 'Chinese yuan',
    'JPY': 'Japanese yen', 'KRW': 'Korean won', 'THB': 'Thai baht',
    'VND': 'Vietnamese dong', 'IDR': 'Indonesian rupiah', 'MYR': 'Malaysian ringgit',
    'SGD': 'Singapore dollar', 'PHP': 'Philippine peso', 'HKD': 'Hong Kong dollar',
    'AUD': 'Australian dollar', 'NZD': 'New Zealand dollar', 'JMD': 'Jamaican dollar',
    'TTD': 'Trinidad dollar', 'ILS': 'Israeli shekel', 'LKR': 'Sri Lankan rupee',
}"""
note(o in src, 'full country map'); src = src.replace(o, n, 1)

o = """_CITY_COUNTRY = {
    'freetown': 'Sierra Leone', 'bo': 'Sierra Leone', 'kenema': 'Sierra Leone',
    'lumley': 'Sierra Leone', 'nairobi': 'Kenya', 'mombasa': 'Kenya', 'kisumu': 'Kenya',
    'accra': 'Ghana', 'kumasi': 'Ghana', 'lagos': 'Nigeria', 'abuja': 'Nigeria',
    'johannesburg': 'South Africa', 'cape town': 'South Africa', 'kigali': 'Rwanda',
    'dubai': 'UAE', 'douala': 'Cameroon', 'yaounde': 'Cameroon',
    'san antonio': 'United States', 'seattle': 'United States', 'toronto': 'Canada',
}"""
n = """_CITY_COUNTRY = {
    'freetown': 'Sierra Leone', 'bo': 'Sierra Leone', 'kenema': 'Sierra Leone',
    'lumley': 'Sierra Leone', 'makeni': 'Sierra Leone', 'waterloo': 'Sierra Leone',
    'nairobi': 'Kenya', 'mombasa': 'Kenya', 'kisumu': 'Kenya', 'kendu bay': 'Kenya',
    'kisii': 'Kenya', 'eldoret': 'Kenya', 'nakuru': 'Kenya',
    'accra': 'Ghana', 'kumasi': 'Ghana', 'tema': 'Ghana', 'takoradi': 'Ghana',
    'lagos': 'Nigeria', 'abuja': 'Nigeria', 'ibadan': 'Nigeria', 'kano': 'Nigeria',
    'port harcourt': 'Nigeria', 'benin city': 'Nigeria',
    'johannesburg': 'South Africa', 'cape town': 'South Africa',
    'durban': 'South Africa', 'pretoria': 'South Africa', 'joburg': 'South Africa',
    'kigali': 'Rwanda', 'dar es salaam': 'Tanzania', 'arusha': 'Tanzania',
    'kampala': 'Uganda', 'addis ababa': 'Ethiopia', 'lusaka': 'Zambia',
    'harare': 'Zimbabwe', 'maputo': 'Mozambique', 'luanda': 'Angola',
    'gaborone': 'Botswana', 'windhoek': 'Namibia', 'dakar': 'Senegal',
    'abidjan': 'Ivory Coast', 'bamako': 'Mali', 'conakry': 'Guinea',
    'monrovia': 'Liberia', 'banjul': 'Gambia', 'cairo': 'Egypt',
    'casablanca': 'Morocco', 'marrakech': 'Morocco', 'tunis': 'Tunisia',
    'douala': 'Cameroon', 'yaounde': 'Cameroon', 'bamenda': 'Cameroon',
    'dubai': 'UAE', 'abu dhabi': 'UAE', 'doha': 'Qatar', 'riyadh': 'Saudi Arabia',
    'san antonio': 'United States', 'seattle': 'United States',
    'new york': 'United States', 'austin': 'United States', 'houston': 'United States',
    'dallas': 'United States', 'atlanta': 'United States', 'chicago': 'United States',
    'toronto': 'Canada', 'vancouver': 'Canada', 'montreal': 'Canada',
    'london': 'UK', 'manchester': 'UK', 'birmingham': 'UK',
    'paris': 'France', 'lisbon': 'Portugal', 'madrid': 'Spain', 'berlin': 'Germany',
    'mexico city': 'Mexico', 'cancun': 'Mexico', 'guadalajara': 'Mexico',
    'bangkok': 'Thailand', 'mumbai': 'India', 'delhi': 'India', 'dubai marina': 'UAE',
    'istanbul': 'Turkey', 'singapore': 'Singapore', 'hong kong': 'Hong Kong',
    'sydney': 'Australia', 'seoul': 'South Korea', 'tokyo': 'Japan',
}"""
note(o in src, 'more cities'); src = src.replace(o, n, 1)

# ---- currencies he has used first, then everything the rate table knows -----
if '/api/prices/currencies' not in src:
    EP = '''@app.get("/api/prices/currencies")
@require_password
def price_currencies():
    """Every currency we have a rate for - the ones he actually uses come first."""
    try:
        _fx_rate('USD')  # warms the table on first use
        mine = [r['currency'] for r in (db.query(
            """SELECT currency, COUNT(*) AS n FROM price_entries
               GROUP BY currency ORDER BY n DESC""") or [])]
        rows = db.query("SELECT currency, rate_to_usd FROM fx_rates ORDER BY currency") or []
        out, seen = [], set()
        for c in mine + ['SLE', 'KES', 'GHS', 'NGN', 'ZAR', 'USD']:
            if c and c not in seen:
                seen.add(c)
                r = next((x['rate_to_usd'] for x in rows if x['currency'] == c), None)
                out.append({"code": c, "name": _CCY_NAMES.get(c, c), "rate": r, "mine": True})
        for x in rows:
            if x['currency'] not in seen:
                out.append({"code": x['currency'], "name": _CCY_NAMES.get(x['currency'], x['currency']),
                            "rate": x['rate_to_usd'], "mine": False})
        return {"status": "success", "currencies": out,
                "countries": sorted({c.title() for c in _CCY_BY_COUNTRY}),
                "cities": sorted({c.title() for c in _CITY_COUNTRY})}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/prices/projects")
@require_password
def list_price_projects():
    try:
        rows = db.query("""SELECT p.*,
                             (SELECT COUNT(*) FROM price_entries e WHERE e.project_id = p.id) AS entries,
                             (SELECT ROUND(SUM(e.usd_price),2) FROM price_entries e WHERE e.project_id = p.id) AS spent_usd
                           FROM price_projects p ORDER BY
                             CASE status WHEN 'active' THEN 0 ELSE 1 END, p.id DESC""") or []
        return {"status": "success", "projects": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/prices/projects")
@require_password
def save_price_project():
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        if d.get('id'):
            db.execute("""UPDATE price_projects SET name=?, about=?, status=?, ended_on=? WHERE id=?""",
                       (d.get('name'), d.get('about'), d.get('status') or 'active',
                        d.get('ended_on'), d['id']))
            return {"status": "success", "id": d['id']}
        if not (d.get('name') or '').strip():
            return {"error": "Give it a name"}, 400
        pid = db.execute("""INSERT INTO price_projects (name, about, started_on, status)
                            VALUES (?,?,?,'active')""",
                         (d['name'].strip(), d.get('about'),
                          d.get('started_on') or _d.now().strftime('%Y-%m-%d')))
        return {"status": "success", "id": pid}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/prices/overview")
@require_password
def prices_overview():
    """Everything he has in more than one place, so he can see where life is dearer."""
    try:
        rows = db.query("""SELECT item_name, country, city, per_unit_usd, observed_on,
                                  standard_unit, local_price, currency
                           FROM price_entries WHERE per_unit_usd IS NOT NULL""") or []
        byitem = {}
        for r in rows:
            byitem.setdefault(r['item_name'], {}).setdefault(r.get('country') or r.get('city') or '?', []).append(r)
        out = []
        for item, places in byitem.items():
            if len(places) < 2:
                continue
            cells = []
            for place, rs in places.items():
                st = _stats(rs)
                if st:
                    st['where'] = place
                    st['confidence'] = _confidence(st)
                    cells.append(st)
            if len(cells) < 2:
                continue
            cells.sort(key=lambda c: c['median'])
            spread = (round((cells[-1]['median'] - cells[0]['median']) / cells[0]['median'] * 100)
                      if cells[0]['median'] else 0)
            out.append({"item": item, "unit": rows[0].get('standard_unit'),
                        "cheapest": cells[0]['where'], "dearest": cells[-1]['where'],
                        "spread_pct": spread, "places": cells})
        out.sort(key=lambda x: -x['spread_pct'])
        return {"status": "success", "items": out}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'currencies, projects, overview')

# entries join their project
o = """    pid = db.execute(\"\"\"INSERT INTO price_entries
        (item_id, item_name, category, spec, quantity, unit, standard_unit, per_unit_usd,
         local_price, currency, usd_price, fx_rate, fx_source, fx_date, price_type,
         observed_on, country, city, place, market_type, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\"\"\","""
n = """    _proj = d.get('project_id')
    if _proj in (None, '', 'auto'):
        _ap = db.query("SELECT id FROM price_projects WHERE status='active' ORDER BY id DESC LIMIT 1")
        _proj = _ap[0]['id'] if _ap else None
    pid = db.execute(\"\"\"INSERT INTO price_entries
        (item_id, item_name, category, spec, quantity, unit, standard_unit, per_unit_usd,
         local_price, currency, usd_price, fx_rate, fx_source, fx_date, price_type,
         observed_on, country, city, place, market_type, notes, project_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)\"\"\","""
note(o in src, 'entry joins project'); src = src.replace(o, n, 1)

o = """         country or None, city or None, d.get('place'), d.get('market_type'), d.get('notes')))"""
n = """         country or None, city or None, d.get('place'), d.get('market_type'), d.get('notes'), _proj))"""
note(o in src, 'project value'); src = src.replace(o, n, 1)

# ---- a bare conversion needs no model at all --------------------------------
if 'def _instant_conversion' not in src:
    FN = '''def _instant_conversion(text):
    """"what is 2000 leones in dollars" - answered from the rate table, no model call."""
    import re as _r
    t = (text or '').lower().strip()
    if not _r.search(r'\\b(in|to|worth|equal|convert)\\b', t) or len(t) > 90:
        return None
    if _r.search(r'\\b(paid|bought|cost|buy|log|save)\\b', t):
        return None
    words = {'leones?': 'SLE', 'sle': 'SLE', 'shillings?': 'KES', 'kes': 'KES', 'bob': 'KES',
             'cedis?': 'GHS', 'ghs': 'GHS', 'naira': 'NGN', 'ngn': 'NGN', 'rands?': 'ZAR',
             'zar': 'ZAR', 'dirhams?': 'AED', 'aed': 'AED', 'dollars?': 'USD', 'usd': 'USD',
             'bucks': 'USD', 'pounds?': 'GBP', 'gbp': 'GBP', 'euros?': 'EUR', 'eur': 'EUR',
             'francs?': 'RWF', 'rwf': 'RWF', 'rupees?': 'INR', 'yen': 'JPY', 'yuan': 'CNY'}
    m = _r.search(r'(?:^|[^0-9.])(\\d[\\d,]{0,12}(?:\\.\\d{1,2})?)\\s*([a-z]{2,12})', t)
    if not m:
        return None
    amt = float(m.group(1).replace(',', ''))
    frm = None
    for pat, code in words.items():
        if _r.fullmatch(pat, m.group(2)):
            frm = code
            break
    if not frm and len(m.group(2)) == 3:
        frm = m.group(2).upper()
    if not frm:
        return None
    to = 'USD'
    rest = t[m.end():]
    for pat, code in words.items():
        if _r.search(r'\\b(?:in|to)\\b[^a-z]{0,6}' + pat + r'\\b', rest):
            to = code
            break
    r1, s1, d1 = _fx_rate(frm)
    r2, _s2, _d2 = _fx_rate(to)
    if not r1 or not r2:
        return None
    val = amt * r1 / r2
    pretty = ("{:,.2f}".format(val) if val < 1000 else "{:,.0f}".format(val))
    return ("CONVERSION (already worked out, just say it): " +
            "{:,.0f}".format(amt) + " " + frm + " is about " + pretty + " " + to +
            " at 1 " + frm + " = $" + ("%.5f" % r1) + ", " + str(d1) + ".")


'''
    src = src.replace(anchor, FN + anchor, 1); note(True, 'instant conversion')

o = "    _log_note = None if _is_question else _log_from_chat(query)"
n = o + "\n    _conv_note = _instant_conversion(query)"
note(o in src, 'conversion hook'); src = src.replace(o, n, 1)

o = """    if _log_note:
        context += "\\n\\n" + _log_note"""
n = o + """
    if _conv_note:
        context += "\\n\\n" + _conv_note"""
note(o in src, 'conversion in context'); src = src.replace(o, n, 1)

# ---- Ami sees the projects too ----------------------------------------------
o = """                    context += ("\\nWhen he tells you a price, you save it"""
n = """                    _prj = db.query(\"\"\"SELECT p.name, p.about, COUNT(e.id) AS n,
                                              ROUND(SUM(e.usd_price),2) AS spent
                                       FROM price_projects p
                                       LEFT JOIN price_entries e ON e.project_id = p.id
                                       GROUP BY p.id ORDER BY p.id DESC LIMIT 4\"\"\") or []
                    if _prj:
                        context += ("\\nWhat he was buying for: " + "; ".join(
                            p['name'] + (" - " + p['about'] if p.get('about') else "") +
                            " (" + str(p['n']) + " things" +
                            (", about $" + str(p['spent']) if p.get('spent') else "") + ")"
                            for p in _prj))
                    context += ("\\nWhen he tells you a price, you save it"""
note(o in src, 'projects in context'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
