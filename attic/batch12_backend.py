#!/usr/bin/env python3
"""Batch 12 backend: CostCompass - a personal price record with rough USD on everything.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch12_backend.py
"""
import os, sqlite3, subprocess, sys
SRC = 'app.py'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------------------- database ---
db = sqlite3.connect('data/ami_memory.db')
for sql in [
    """CREATE TABLE IF NOT EXISTS price_items (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT,
        standard_unit TEXT, aliases TEXT, mine INTEGER DEFAULT 0)""",
    """CREATE TABLE IF NOT EXISTS price_entries (
        id INTEGER PRIMARY KEY,
        item_id INTEGER, item_name TEXT NOT NULL, category TEXT, spec TEXT,
        quantity REAL DEFAULT 1, unit TEXT, standard_unit TEXT, per_unit_usd REAL,
        local_price REAL NOT NULL, currency TEXT NOT NULL,
        usd_price REAL, fx_rate REAL, fx_source TEXT, fx_date TEXT,
        price_type TEXT DEFAULT 'paid',
        observed_on DATE, country TEXT, city TEXT, place TEXT,
        market_type TEXT, notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""",
    """CREATE TABLE IF NOT EXISTS fx_rates (
        currency TEXT PRIMARY KEY, rate_to_usd REAL, fetched_on TEXT, source TEXT)""",
]:
    try: db.execute(sql)
    except Exception as e: print("db:", str(e)[:70])

SEED = [
 # name, category, standard unit, aliases
 ("Cement", "building", "50kg bag", "bag of cement,cement bag,saruji,ciment"),
 ("Paint", "building", "1 gallon", "emulsion,gloss"),
 ("Floor tiles", "building", "1 sqm", "tiles,ceramic tiles"),
 ("Roofing sheet", "building", "1 sheet", "zinc,iron sheet,mabati"),
 ("Timber", "building", "1 plank", "wood,plank"),
 ("Rebar", "building", "1 rod", "iron rod,steel rod"),
 ("Sand", "building", "1 truckload", "sharp sand"),
 ("Gravel", "building", "1 truckload", "granite,ballast"),
 ("Blocks", "building", "1 block", "cement block,brick"),
 ("Nails", "building", "1 kg", ""),
 ("Electrical wire", "building", "1 roll", "cable,wiring"),
 ("Labour, mason", "labour", "1 day", "mason,bricklayer"),
 ("Labour, carpenter", "labour", "1 day", "carpenter"),
 ("Labour, painter", "labour", "1 day", "painter"),
 ("Labour, electrician", "labour", "1 day", "electrician"),
 ("Labour, plumber", "labour", "1 day", "plumber"),
 ("Television", "electronics", "1 unit", "tv,flat screen"),
 ("Laptop", "electronics", "1 unit", ""),
 ("Phone", "electronics", "1 unit", "mobile,smartphone"),
 ("Generator", "electronics", "1 unit", "gen,genset"),
 ("Solar panel", "electronics", "1 panel", "solar"),
 ("Inverter", "electronics", "1 unit", ""),
 ("Air conditioner", "appliance", "1 unit", "ac,aircon"),
 ("Fridge", "appliance", "1 unit", "refrigerator"),
 ("Washing machine", "appliance", "1 unit", ""),
 ("Mattress", "furniture", "1 unit", ""),
 ("Sofa", "furniture", "1 set", "settee,couch"),
 ("Bed frame", "furniture", "1 unit", "bed"),
 ("Dining table", "furniture", "1 set", ""),
 ("Petrol", "transport", "1 litre", "fuel,gas,gasoline"),
 ("Diesel", "transport", "1 litre", ""),
 ("Taxi ride", "transport", "1 km", "taxi,uber,bolt,cab"),
 ("Keke ride", "transport", "1 ride", "keke,tuk tuk,tricycle"),
 ("Okada ride", "transport", "1 ride", "okada,boda,motorbike"),
 ("Flight", "transport", "1 ticket", ""),
 ("Hotel night", "stay", "1 night", "hotel,guest house"),
 ("Airbnb night", "stay", "1 night", "airbnb"),
 ("Rice", "food", "1 kg", "bag of rice"),
 ("Cooking oil", "food", "1 litre", "oil,palm oil"),
 ("Bread", "food", "1 loaf", ""),
 ("Beef", "food", "1 kg", "meat"),
 ("Eggs", "food", "1 crate", ""),
 ("Water", "food", "1 litre", "bottled water"),
 ("Restaurant meal", "food", "1 meal", "lunch,dinner,meal"),
 ("Haircut", "services", "1 cut", "barber"),
 ("Laundry", "services", "1 load", ""),
 ("Internet, monthly", "services", "1 month", "wifi,data bundle"),
 ("Phone airtime", "services", "1 GB", "airtime,data"),
 ("Electricity", "services", "1 unit", "power,nepa,umeme"),
 ("Cooking gas", "services", "1 refill", "gas cylinder,lpg"),
]
for s in SEED:
    try:
        db.execute("""INSERT OR IGNORE INTO price_items (name, category, standard_unit, aliases)
                      VALUES (?,?,?,?)""", s)
    except Exception:
        pass
# a few sensible starting rates, replaced by the live fetch on first use
for c, r in [("USD", 1.0), ("SLE", 0.0435), ("KES", 0.0077), ("GHS", 0.065),
             ("NGN", 0.00065), ("ZAR", 0.055), ("AED", 0.2723), ("GBP", 1.27),
             ("EUR", 1.08), ("CAD", 0.73), ("MXN", 0.050), ("RWF", 0.00075)]:
    try:
        db.execute("""INSERT OR IGNORE INTO fx_rates (currency, rate_to_usd, fetched_on, source)
                      VALUES (?,?,'seed','seed')""", (c, r))
    except Exception:
        pass
db.commit()
n_items = db.execute("SELECT COUNT(*) FROM price_items").fetchone()[0]
db.close()
note(True, 'tables + ' + str(n_items) + ' items')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

if '/api/prices' not in src:
    EP = '''_CCY_BY_COUNTRY = {
    'sierra leone': 'SLE', 'kenya': 'KES', 'ghana': 'GHS', 'nigeria': 'NGN',
    'south africa': 'ZAR', 'rwanda': 'RWF', 'uae': 'AED', 'dubai': 'AED',
    'united states': 'USD', 'usa': 'USD', 'uk': 'GBP', 'united kingdom': 'GBP',
    'canada': 'CAD', 'mexico': 'MXN', 'cameroon': 'XAF', 'tanzania': 'TZS',
    'uganda': 'UGX', 'ethiopia': 'ETB', 'senegal': 'XOF', 'ivory coast': 'XOF',
}
_CITY_COUNTRY = {
    'freetown': 'Sierra Leone', 'bo': 'Sierra Leone', 'kenema': 'Sierra Leone',
    'lumley': 'Sierra Leone', 'nairobi': 'Kenya', 'mombasa': 'Kenya', 'kisumu': 'Kenya',
    'accra': 'Ghana', 'kumasi': 'Ghana', 'lagos': 'Nigeria', 'abuja': 'Nigeria',
    'johannesburg': 'South Africa', 'cape town': 'South Africa', 'kigali': 'Rwanda',
    'dubai': 'UAE', 'douala': 'Cameroon', 'yaounde': 'Cameroon',
    'san antonio': 'United States', 'seattle': 'United States', 'toronto': 'Canada',
}


def _fx_rate(currency, on_date=None):
    """Roughly what one unit of this currency is worth in USD. Cached for the day."""
    from datetime import datetime as _d
    cur = (currency or 'USD').upper()
    if cur == 'USD':
        return 1.0, 'base', _d.now().strftime('%Y-%m-%d')
    today = _d.now().strftime('%Y-%m-%d')
    row = db.query("SELECT rate_to_usd, fetched_on, source FROM fx_rates WHERE currency = ?", (cur,))
    if row and row[0].get('fetched_on') == today:
        return row[0]['rate_to_usd'], row[0].get('source') or 'cached', today
    try:
        import urllib.request as _u, json as _j
        with _u.urlopen("https://open.er-api.com/v6/latest/USD", timeout=8) as r:
            data = _j.loads(r.read().decode('utf-8'))
        rates = (data or {}).get('rates') or {}
        if rates:
            for c, per_usd in rates.items():
                if per_usd:
                    db.execute("""INSERT INTO fx_rates (currency, rate_to_usd, fetched_on, source)
                                  VALUES (?,?,?,'open.er-api.com')
                                  ON CONFLICT(currency) DO UPDATE SET
                                    rate_to_usd = excluded.rate_to_usd,
                                    fetched_on = excluded.fetched_on,
                                    source = excluded.source""",
                               (c, round(1.0 / float(per_usd), 10), today))
            if cur in rates and rates[cur]:
                return round(1.0 / float(rates[cur]), 10), 'open.er-api.com', today
    except Exception as e:
        print("fx fetch failed: " + str(e)[:80])
    if row:
        return row[0]['rate_to_usd'], (row[0].get('source') or 'last known'), row[0].get('fetched_on')
    return None, None, None


@app.get("/api/prices/fx")
@require_password
def prices_fx():
    try:
        cur = (request.args.get('currency') or 'USD').upper()
        rate, source, when = _fx_rate(cur)
        return {"status": "success", "currency": cur, "rate_to_usd": rate,
                "source": source, "date": when}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/prices/items")
@require_password
def price_items():
    try:
        rows = db.query("SELECT * FROM price_items ORDER BY category, name") or []
        return {"status": "success", "items": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/prices")
@require_password
def list_prices():
    """Everything logged, newest first, with the USD figure worked out."""
    try:
        q = "SELECT * FROM price_entries"
        args, where = [], []
        if request.args.get('item'):
            where.append("LOWER(item_name) = LOWER(?)"); args.append(request.args['item'])
        if request.args.get('country'):
            where.append("LOWER(country) = LOWER(?)"); args.append(request.args['country'])
        if where:
            q += " WHERE " + " AND ".join(where)
        q += " ORDER BY observed_on DESC, id DESC LIMIT 300"
        rows = db.query(q, tuple(args)) or []
        return {"status": "success", "entries": rows}
    except Exception as e:
        return {"error": str(e)}, 400


def _save_price(d):
    """Shared by the form and by chat. Returns the saved row."""
    from datetime import datetime as _d
    name = (d.get('item_name') or '').strip()
    if not name:
        raise ValueError("Which item?")
    local = float(d.get('local_price'))
    country = (d.get('country') or '').strip()
    city = (d.get('city') or '').strip()
    if not country and city.lower() in _CITY_COUNTRY:
        country = _CITY_COUNTRY[city.lower()]
    cur = (d.get('currency') or '').strip().upper()
    if not cur:
        cur = _CCY_BY_COUNTRY.get(country.lower(), 'USD')
    if d.get('fx_rate'):
        rate, fsource = float(d['fx_rate']), 'yours'
        fdate = _d.now().strftime('%Y-%m-%d')
    else:
        rate, fsource, fdate = _fx_rate(cur)
    usd = round(local * rate, 2) if rate else None
    it = db.query("SELECT id, category, standard_unit FROM price_items WHERE LOWER(name) = LOWER(?)", (name,))
    item = it[0] if it else None
    qty = float(d.get('quantity') or 1) or 1
    per_unit = round(usd / qty, 4) if usd else None
    pid = db.execute("""INSERT INTO price_entries
        (item_id, item_name, category, spec, quantity, unit, standard_unit, per_unit_usd,
         local_price, currency, usd_price, fx_rate, fx_source, fx_date, price_type,
         observed_on, country, city, place, market_type, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (item['id'] if item else None, name,
         d.get('category') or (item['category'] if item else None), d.get('spec'),
         qty, d.get('unit') or (item['standard_unit'] if item else None),
         (item['standard_unit'] if item else d.get('unit')), per_unit,
         local, cur, usd, rate, fsource, fdate, d.get('price_type') or 'paid',
         d.get('observed_on') or _d.now().strftime('%Y-%m-%d'),
         country or None, city or None, d.get('place'), d.get('market_type'), d.get('notes')))
    return {"id": pid, "item_name": name, "local_price": local, "currency": cur,
            "usd_price": usd, "fx_rate": rate, "country": country, "city": city}


@app.post("/api/prices")
@require_password
def add_price():
    try:
        return {"status": "success", "entry": _save_price(request.get_json() or {})}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/prices/<int:pid>")
@require_password
def delete_price(pid):
    try:
        db.execute("DELETE FROM price_entries WHERE id = ?", (pid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


def _stats(rows):
    vals = sorted([r['per_unit_usd'] for r in rows if r.get('per_unit_usd') is not None])
    if not vals:
        return None
    def _q(p):
        if len(vals) == 1:
            return vals[0]
        i = (len(vals) - 1) * p
        lo, hi = int(i), min(int(i) + 1, len(vals) - 1)
        return vals[lo] + (vals[hi] - vals[lo]) * (i - lo)
    latest = max(rows, key=lambda r: str(r.get('observed_on') or ''))
    return {"count": len(vals), "median": round(_q(0.5), 2), "min": round(vals[0], 2),
            "max": round(vals[-1], 2), "q1": round(_q(0.25), 2), "q3": round(_q(0.75), 2),
            "latest": latest.get('per_unit_usd'), "latest_on": str(latest.get('observed_on') or '')[:10],
            "latest_local": latest.get('local_price'), "latest_currency": latest.get('currency')}


def _confidence(st):
    if not st:
        return 'none'
    from datetime import datetime as _d
    n = st['count']
    try:
        age = (_d.now().date() - _d.strptime(st['latest_on'], '%Y-%m-%d').date()).days
    except Exception:
        age = 999
    if n >= 5 and age <= 120:
        return 'high'
    if n >= 3 and age <= 365:
        return 'medium'
    return 'low'


@app.get("/api/prices/compare")
@require_password
def compare_prices():
    """The same item across countries or cities, in USD, cheapest first."""
    try:
        item = (request.args.get('item') or '').strip()
        by = 'city' if request.args.get('by') == 'city' else 'country'
        months = int(request.args.get('months') or 24)
        if not item:
            return {"error": "Which item?"}, 400
        rows = db.query("""SELECT * FROM price_entries
                           WHERE LOWER(item_name) = LOWER(?)
                             AND observed_on >= date('now','-' || ? || ' months')""",
                        (item, months)) or []
        groups = {}
        for r in rows:
            k = (r.get(by) or 'unknown')
            groups.setdefault(k, []).append(r)
        out = []
        for k, rs in groups.items():
            st = _stats(rs)
            if not st:
                continue
            st['where'] = k
            st['confidence'] = _confidence(st)
            st['unit'] = rs[0].get('standard_unit') or rs[0].get('unit')
            out.append(st)
        out.sort(key=lambda x: x['median'])
        return {"status": "success", "item": item, "by": by, "rows": out}
    except Exception as e:
        return {"error": str(e)}, 400


def _fair_check(item, local_price, currency, country=None, city=None):
    """Is this price in line with what he has paid before? Returns a plain sentence."""
    rate, _s, _d2 = _fx_rate((currency or 'USD').upper())
    usd = round(float(local_price) * rate, 2) if rate else None
    rows = db.query("""SELECT * FROM price_entries WHERE LOWER(item_name) = LOWER(?)""", (item,)) or []
    here = [r for r in rows if city and (r.get('city') or '').lower() == city.lower()]
    scope = city
    if len(here) < 3:
        here = [r for r in rows if country and (r.get('country') or '').lower() == country.lower()]
        scope = country
    if len(here) < 3:
        here, scope = rows, 'everywhere'
    st = _stats(here)
    if not st or usd is None:
        return {"usd": usd, "verdict": "no history", "stats": None, "scope": scope}
    if st['count'] < 3:
        verdict = "not enough history"
    elif usd < st['q1']:
        verdict = "below your usual"
    elif usd <= st['q3']:
        verdict = "about usual"
    else:
        verdict = "above your usual by " + str(int(round((usd - st['q3']) / st['q3'] * 100))) + "%"
    return {"usd": usd, "verdict": verdict, "stats": st, "scope": scope}


@app.get("/api/prices/fair")
@require_password
def fair_price():
    try:
        return {"status": "success", **_fair_check(
            request.args.get('item') or '', float(request.args.get('price') or 0),
            request.args.get('currency'), request.args.get('country'), request.args.get('city'))}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'price endpoints')

# ------------------------------------------------- logging a price from chat --
o = "    if not said:\n        return None"
n = '''        # a price: "cement is 2000 leones in Freetown", "paid 350 SLE for a bag of cement"
        _CUR_WORDS = {'leone': 'SLE', 'leones': 'SLE', 'sle': 'SLE', 'shilling': 'KES',
                      'shillings': 'KES', 'kes': 'KES', 'bob': 'KES', 'cedi': 'GHS', 'cedis': 'GHS',
                      'ghs': 'GHS', 'naira': 'NGN', 'ngn': 'NGN', 'rand': 'ZAR', 'zar': 'ZAR',
                      'dirham': 'AED', 'dirhams': 'AED', 'aed': 'AED', 'dollar': 'USD',
                      'dollars': 'USD', 'usd': 'USD', 'pound': 'GBP', 'pounds': 'GBP',
                      'euro': 'EUR', 'euros': 'EUR', 'franc': 'RWF', 'francs': 'RWF'}
        if _r.search(r'\\b(paid|pay|cost|costs|bought|buy|price|charging|charged|asking|quoted)\\b', low):
            _mny = _r.search(r'(?:^|[^0-9])(\\d[\\d,]{0,9}(?:\\.\\d{1,2})?)\\s*'
                             r'(leones?|sle|shillings?|kes|bob|cedis?|ghs|naira|ngn|rand|zar|'
                             r'dirhams?|aed|dollars?|usd|pounds?|gbp|euros?|francs?|rwf)\\b', low)
            if not _mny:
                _mny = _r.search(r'[$]\\s*(\\d[\\d,]{0,9}(?:\\.\\d{1,2})?)', low)
                _ccy = 'USD' if _mny else None
            else:
                _ccy = _CUR_WORDS.get(_mny.group(2).rstrip('s'), _CUR_WORDS.get(_mny.group(2)))
            if _mny and _ccy:
                _amt = float(_mny.group(1).replace(',', ''))
                _city = None
                for _cty in _CITY_COUNTRY:
                    if _r.search(r'(?<![a-z])' + _r.escape(_cty) + r'(?![a-z])', low):
                        _city = _cty.title()
                        break
                _pitems = db.query("SELECT name, aliases, standard_unit FROM price_items") or []
                _item = None
                for _pi in _pitems:
                    _terms = [(_pi['name'] or '').lower()] + [
                        a.strip().lower() for a in (_pi.get('aliases') or '').split(',') if a.strip()]
                    if any(_t and _t in low for _t in _terms):
                        _item = _pi
                        break
                if _item:
                    _row = _save_price({
                        'item_name': _item['name'], 'local_price': _amt, 'currency': _ccy,
                        'city': _city, 'unit': _item.get('standard_unit'),
                        'price_type': ('asking' if _r.search(r'\\b(asking|quoted|charging|want)\\b', low)
                                       else 'paid'),
                        'notes': 'from chat'})
                    _fc = _fair_check(_item['name'], _amt, _ccy, _row.get('country'), _city)
                    _bit = (_item['name'] + " at " + _ccy + " " + str(int(_amt) if _amt == int(_amt) else _amt) +
                            (" (about $" + str(_row['usd_price']) + ")" if _row.get('usd_price') else "") +
                            (" in " + _city if _city else "") + " saved")
                    if _fc.get('stats') and _fc['stats']['count'] >= 3:
                        _bit += (" - that is " + _fc['verdict'] + ", your median is $" +
                                 str(_fc['stats']['median']))
                    said.append(_bit)
    except Exception as e:
        print("chat log error: " + str(e))
        return None

    if not said:
        return None'''
o_full = """    except Exception as e:
        print("chat log error: " + str(e))
        return None

    if not said:
        return None"""
note(o_full in src, 'price logging in chat'); src = src.replace(o_full, n, 1)

# ------------------------------------------------- Ami knows the price record -
o = """            _sz = db.query("SELECT region, kind, label, value FROM garment_sizes ORDER BY region") or []"""
n = """            try:
                _pc = db.query(\"\"\"SELECT item_name, country, city, COUNT(*) AS n,
                                         ROUND(AVG(per_unit_usd),2) AS avg_usd,
                                         MAX(observed_on) AS last
                                  FROM price_entries GROUP BY item_name, country
                                  ORDER BY last DESC LIMIT 14\"\"\") or []
                if _pc:
                    context += ("\\n\\nPRICES HE HAS LOGGED (USD per standard unit): " + "; ".join(
                        p['item_name'] + " " + str(p.get('country') or p.get('city') or '?') +
                        " $" + str(p['avg_usd']) + " (" + str(p['n']) + ")" for p in _pc))
                    context += ("\\nWhen he tells you a price, you save it and say the local amount first, "
                                "then roughly what it is in dollars. If he asks whether a price is fair, "
                                "compare it with what he has paid before and say how many entries that rests on. "
                                "Never guess a price for a place he has no entries for - say you have none.")
            except Exception:
                pass

            _sz = db.query("SELECT region, kind, label, value FROM garment_sizes ORDER BY region") or []"""
note(o in src, 'prices in context'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
