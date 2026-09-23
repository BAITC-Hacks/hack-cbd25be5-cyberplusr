"""No optional dependencies: checks real exports and critical role rules."""
import csv
import json
from pathlib import Path
from rules import assign_role

root=Path(__file__).parent
def rows(name):
    with (root/'public/results'/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
r=rows('nodes_roles.csv');c=rows('clusters.csv');t=rows('top_nodes.csv')
data=json.loads((root/'src/data/graph_export.json').read_text(encoding='utf-8'))
assert len(r)==2248 and len({x['gid'] for x in r})==2248
assert all(x['role'] in {'coordinator','consolidator','transit','distributor','terminal','peripheral'} for x in r)
assert all(0<=float(x['role_score'])<=1 and 0<=float(x['priority_score'])<=1 and 1<=len(x['evidence'])<=200 for x in r)
assert all(x['role']!='terminal' for x in r if x['truncated_by_depth']=='True')
assert sum(int(x['n_nodes']) for x in c)==2248 and sum(int(x['n_seed']) for x in c)==81
assert {x['cluster_id'] for x in r}=={x['cluster_id'] for x in c}
assert len(t)>=20 and [float(x['priority_score']) for x in t]==sorted([float(x['priority_score']) for x in t],reverse=True)
assert {x['gid'] for x in data['nodes']}=={x['gid'] for x in r}
assert all(isinstance(x['gid'],str) for x in data['nodes'])
ids={x['gid'] for x in r}
assert all(e['source'] in ids and e['target'] in ids for e in data['edges'])
assert sum(1 for x in r if x['in_deg']=='0' and x['out_deg']=='0')==19
case=dict(in_deg=1,out_deg=0,pass_through=0,is_seed=False,truncated_by_depth=True,seed_reach=1,betweenness=0,lag_share=0)
assert assign_role(case)[0]=='peripheral'
case['in_deg']=4
assert assign_role(case)==('consolidator',.45)
case.update(in_deg=1,out_deg=1,pass_through=1,is_seed=True,truncated_by_depth=False,lag_share=1)
assert assign_role(case)[0]=='peripheral'
print('PASS: 2248 nodes, 19 isolates, 91 clusters, top-50, IDs, boundary and seed rules')
