#!/usr/bin/env python3
"""Generate a P0-to-P4 target plan from the repository's current PI seed."""
import collections
import json
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
db = sqlite3.connect(':memory:')
db.executescript((ROOT / 'sql/local-init/01-pi-data.sql').read_text())
names = dict(db.execute('SELECT typeID,typeName FROM invTypes'))
recipes = {}
for schematic, cycle in db.execute('SELECT schematicID,cycleTime FROM planetSchematics'):
    rows = db.execute('SELECT typeID,quantity,isInput FROM planetSchematicsTypeMap WHERE schematicID=?', (schematic,)).fetchall()
    output, quantity, _ = next(row for row in rows if not row[2])
    recipes[output] = {'quantity':quantity,'cycle':cycle,'inputs':[(i,q) for i,q,is_input in rows if is_input]}

def factory(type_id, rate):
    recipe = recipes[type_id]
    count = rate / (recipe['quantity'] * 3600 / recipe['cycle'])
    assert count.is_integer(), 'Template needs fractional-factory scheduling'
    return {'s':type_id,'n':int(count),'a':1}

def demand(outputs):
    required = collections.Counter()
    for type_id, rate in outputs.items():
        recipe = recipes[type_id]
        for ingredient, amount in recipe['inputs']:
            required[ingredient] += rate / recipe['quantity'] * amount
    return required

def planet(name, **facilities):
    return dict(x=name,l=5,p=1,s=0,c=False,r=True,t=6,n=200,v=1,f=False,**facilities)

p4 = {2867:1.0}
p3 = demand(p4)
p2 = demand(p3)
p1 = demand(p2)
planets = [planet('P4 — Broadcast Node',h=[factory(i,q) for i,q in p4.items()]),
           planet('P3 — Neocoms, Data Chips, High-Tech Transmitters',a=[factory(i,q) for i,q in sorted(p3.items())]),
           planet('P2 — Inputs for the P3 planet',a=[factory(i,q) for i,q in sorted(p2.items())])]
for type_id, rate in sorted(p1.items(),key=lambda pair:names[pair[0]]):
    raw = recipes[type_id]['inputs']
    assert len(raw) == 1
    planets.append(planet('P0 → P1 — '+names[type_id],b=[factory(type_id,rate)],
                          e=[{'r':raw[0][0],'h':10,'y':12000}]))
setup = dict(pl=planets,**{'is':10000002,'es':10000002,'io':'buy','eo':'sell',
                         'im':'percentile','em':'percentile','ib':1,'eb':1,'it':1.5,'et':1.5})
target = ROOT / 'webapp/src/main/resources/static/reconstructed/templates/broadcast-node.json'
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(setup,indent=2)+'\n')
print('Generated',target.relative_to(ROOT),f'({len(planets)} planets, target 1 Broadcast Node/hour)')
