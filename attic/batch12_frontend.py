#!/usr/bin/env python3
"""Batch 12 frontend: wire the Prices tab in.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch12_frontend.py
(PricesTab.jsx must already be in frontend/src/components/)
"""
import os
FE = 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

p = os.path.join(FE, 'pages/Dashboard.jsx')
s = open(p).read()

if "import PricesTab" not in s:
    parts = s.split('\n')
    last = max(i for i, l in enumerate(parts[:45]) if l.startswith('import '))
    parts.insert(last + 1, "import PricesTab from '../components/PricesTab';")
    s = '\n'.join(parts); note(True, 'import')

o = """            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('fitness')}>"""
n = """            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('prices')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>\U0001F4B0</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Prices</div>
              <div style={{fontSize: '12px', color: '#666'}}>What things cost, where</div>
            </div>

""" + o
if o in s and "setActiveTab('prices')" not in s:
    s = s.replace(o, n, 1); note(True, 'tile')

o2 = "      {activeTab === 'fitness' && <FitnessTab />}"
if o2 in s and "activeTab === 'prices'" not in s:
    s = s.replace(o2, "      {activeTab === 'prices' && <PricesTab />}\n" + o2, 1); note(True, 'route')

open(p, 'w').write(s)
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED: " + ", ".join(skipped))
