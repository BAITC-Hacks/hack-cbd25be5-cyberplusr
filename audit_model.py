"""Sensitivity audit, not accuracy evaluation: labels have no ground truth."""
from pathlib import Path
from collections import Counter
from math import comb
import json
import networkx as nx
import numpy as np
import pandas as pd
from rules import assign_role

ROOT=Path(__file__).resolve().parent

def ari(left,right):
    cells=Counter(zip(left,right));a=Counter(left);b=Counter(right);pairs=comb(len(left),2)
    observed=sum(comb(x,2) for x in cells.values())
    sa=sum(comb(x,2) for x in a.values());sb=sum(comb(x,2) for x in b.values())
    expected=sa*sb/pairs if pairs else 0;maximum=(sa+sb)/2
    return 1 if maximum==expected else (observed-expected)/(maximum-expected)

def main():
    f=pd.read_csv(ROOT/'public/results/nodes_roles.csv',dtype={'gid':'int64'}).set_index('gid')
    baseline=set(f.sort_values(['priority_score','gid'],ascending=[False,True]).head(20).index)
    scenarios={
      'stricter':dict(coordinator_degree=4,coordinator_seeds=3,coordinator_betweenness=.0012,distributor_degree=12,consolidator_degree=4,retained_ratio=.24,transit_low=.85,transit_high=1.15),
      'looser':dict(coordinator_degree=2,coordinator_seeds=2,coordinator_betweenness=.0008,distributor_degree=8,consolidator_degree=2,retained_ratio=.36,transit_low=.75,transit_high=1.25)}
    results={}
    for name,thresholds in scenarios.items():
        predicted=pd.Series([assign_role(r,thresholds)[0] for r in f.to_dict('records')],index=f.index)
        results[name]=dict(thresholds=thresholds,changed_nodes=int((predicted!=f.role).sum()),changed_fraction=round(float((predicted!=f.role).mean()),4),roles=predicted.value_counts().to_dict())
    score_columns=['score_in','score_out','score_seed','score_bridge','score_volume'];base_weights=np.array([.25,.20,.20,.20,.15])
    overlaps=[]
    for i,column in enumerate(score_columns):
        for factor in (.8,1.2):
            weights=base_weights.copy();weights[i]*=factor;weights/=weights.sum()
            scores=(f[score_columns]/base_weights*weights).sum(axis=1)
            ranked=f.assign(alternative=scores).sort_values(['alternative','gid'],ascending=[False,True])
            overlaps.append(dict(changed=column,factor=factor,top20_overlap=len(baseline&set(ranked.head(20).index))))
    e=pd.read_parquet(ROOT/'data/edges.parquet');ug=nx.Graph();ug.add_nodes_from(f.index)
    for r in e.itertuples():ug.add_edge(int(r.src),int(r.dst),weight=ug.get_edge_data(int(r.src),int(r.dst),{}).get('weight',0)+float(r.sum_kzt))
    stability=[]
    for seed in [7,21,42,84,123]:
        groups=nx.community.louvain_communities(ug,seed=seed,weight='weight',resolution=1)
        labels={v:i for i,c in enumerate(groups) for v in c}
        stability.append(dict(seed=seed,clusters=len(groups),adjusted_rand=round(ari(list(f.cluster_id),[labels[v] for v in f.index]),4)))
    cases=[]
    for role in sorted(f.role.unique()):
        for gid,r in f.loc[f.role==role].sort_values('priority_score',ascending=False).head(3).iterrows():
            cases.append(dict(gid=str(gid),role=role,priority=float(r.priority_score),role_score=float(r.role_score),in_degree=int(r.in_deg),out_degree=int(r.out_deg),in_kzt=float(r.in_kzt),out_kzt=float(r.out_kzt),seed_reach=int(r.seed_reach),betweenness=float(r.betweenness),lag_share=float(r.lag_share),depth=int(r.depth),is_seed=bool(r.is_seed),boundary=bool(r.truncated_by_depth),evidence=r.evidence))
    findings=dict(role_sensitivity=results,ranking_sensitivity=overlaps,cluster_stability=stability,representative_cases=cases,limits='No ground truth: sensitivity is not accuracy. Coordinator is a structural hypothesis. Terminal only within observed sample.')
    out=ROOT/'public/results/model_audit.json';out.write_text(json.dumps(findings,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in findings.items() if k!='representative_cases'},ensure_ascii=False,indent=2))
    lines=['# Разбор узлов по ролям','', 'Гипотезы на реальных данных, только для локального демо.','']
    for c in cases:
        lines.extend([f"## {c['role']} — {c['gid']}",c['evidence'],f"Посредничество {c['betweenness']:.5f}; дневной признак {c['lag_share']:.0%}; уверенность-эвристика {c['role_score']}; приоритет {c['priority']:.3f}.",''])
    (ROOT/'public/results/CASE_REVIEW.md').write_text('\n'.join(lines),encoding='utf-8')

if __name__=='__main__':main()
