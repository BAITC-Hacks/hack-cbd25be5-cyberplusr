"""Local, deterministic and explainable HackAlem graph analysis."""
import argparse
import json
import math
import time
from pathlib import Path
import networkx as nx
import numpy as np
import pandas as pd

ROLES = {'consolidator','transit','distributor','terminal','coordinator','peripheral'}

def load_validate(folder):
    e = pd.read_parquet(folder / 'edges.parquet')
    n = pd.read_parquet(folder / 'nodes.parquet')
    t = pd.read_parquet(folder / 'transactions.parquet')
    for frame, cols in [(e,['src','dst','sum_kzt','n_tx','depth']), (n,['gid','depth','is_seed']), (t,['src','dst','date','sum_kzt'])]:
        if not set(cols).issubset(frame.columns): raise ValueError(f'Missing columns: {set(cols)-set(frame.columns)}')
        if frame[cols].isna().any().any(): raise ValueError('Null in required column')
    if n.empty or e.empty or t.empty: raise ValueError('Dataset is empty')
    for frame,cols in [(n,['gid','depth']),(e,['src','dst','n_tx','depth']),(t,['src','dst'])]:
        for col in cols:
            if not pd.api.types.is_integer_dtype(frame[col]): raise ValueError(f'{col} must be integer, not float/string')
    if not pd.api.types.is_bool_dtype(n.is_seed): raise ValueError('is_seed must be boolean')
    if n.gid.duplicated().any() or e.duplicated(['src','dst']).any(): raise ValueError('Duplicate node or edge key')
    if not n.depth.between(0,4).all() or not e.depth.between(1,4).all(): raise ValueError('Depth outside range')
    if not (n.is_seed == (n.depth==0)).all(): raise ValueError('Seed and depth=0 differ')
    for frame in [e,t]:
        if not np.isfinite(frame.sum_kzt).all() or (frame.sum_kzt<=0).any(): raise ValueError('Invalid amounts')
        if (set(frame.src)|set(frame.dst))-set(n.gid): raise ValueError('Unknown endpoint')
    if (e.n_tx<1).any() or (t.sum_kzt<5000).any(): raise ValueError('Invalid count or amount below threshold')
    t['date']=pd.to_datetime(t.date,errors='raise')
    if not t.date.between('2026-07-01','2026-07-31 23:59:59').all(): raise ValueError('Date outside July 2026')
    agg=t.groupby(['src','dst']).agg(total=('sum_kzt','sum'),count=('sum_kzt','size')).reset_index()
    m=e.merge(agg,on=['src','dst'],how='outer',indicator=True,validate='one_to_one')
    if not (m._merge=='both').all() or not np.isclose(m.sum_kzt,m.total,atol=.01,rtol=0).all() or not (m.n_tx==m['count']).all():
        raise ValueError('Edges do not match transaction aggregates')
    return e,n,t

from rules import assign_role

def analyze(e,n,t):
    g=nx.DiGraph();g.add_nodes_from(int(x) for x in n.gid)
    for r in e.itertuples():g.add_edge(int(r.src),int(r.dst),weight=float(r.sum_kzt),n_tx=int(r.n_tx))
    seeds=[int(x) for x in n.loc[n.is_seed,'gid']]
    distance=nx.multi_source_dijkstra_path_length(g,seeds,weight=None)
    if any(distance.get(int(r.gid))!=r.depth for r in n.itertuples()): raise ValueError('Node depth disagrees with seed reachability')
    f=n.set_index('gid').copy()
    for key,values in [('in_deg',dict(g.in_degree())),('out_deg',dict(g.out_degree())),('in_kzt',dict(g.in_degree(weight='weight'))),('out_kzt',dict(g.out_degree(weight='weight'))),('in_tx',dict(g.in_degree(weight='n_tx'))),('out_tx',dict(g.out_degree(weight='n_tx'))),('pagerank',nx.pagerank(g,weight='weight')),('betweenness',nx.betweenness_centrality(g,weight=None))]:
        f[key]=pd.Series(values)
    f['pass_through']=f.out_kzt/f.in_kzt.replace(0,np.nan)
    f['truncated_by_depth']=(f.depth==4)&(f.out_deg==0)
    reach={v:0 for v in g}
    for s in seeds:
        for v in nx.single_source_shortest_path_length(g,s,cutoff=4):
            if v!=s:reach[v]+=1
    f['seed_reach']=pd.Series(reach)
    inbound={int(v):set(rows.date.dt.normalize()) for v,rows in t.groupby('dst')}
    outgoing=t.assign(recent=[any((d.normalize()-pd.Timedelta(days=k)) in inbound.get(int(v),set()) for k in (1,2)) for v,d in zip(t.src,t.date)])
    recent=outgoing.loc[outgoing.recent].groupby('src').sum_kzt.sum()
    f['lag_share']=(recent.reindex(f.index).fillna(0)/f.out_kzt.replace(0,np.nan)).fillna(0)
    ug=nx.Graph();ug.add_nodes_from(g)
    for u,v,d in g.edges(data=True):ug.add_edge(u,v,weight=ug.get_edge_data(u,v,{}).get('weight',0)+d['weight'])
    groups=sorted(nx.community.louvain_communities(ug,weight='weight',seed=42,resolution=1),key=lambda c:(-len(c),min(c)))
    cluster={v:i+1 for i,c in enumerate(groups) for v in c};f['cluster_id']=pd.Series(cluster)
    f['role'],f['role_score']=zip(*(assign_role(r) for r in f.to_dict('records')))
    volume=f.in_kzt+f.out_kzt
    f['score_in']=.25*(f.in_deg/10).clip(upper=1)
    f['score_out']=.20*(f.out_deg/30).clip(upper=1)
    f['score_seed']=.20*(f.seed_reach/5).clip(upper=1)
    f['score_bridge']=.20*f.betweenness/max(float(f.betweenness.max()),1e-12)
    f['score_volume']=.15*np.log1p(volume)/max(float(np.log1p(volume).max()),1)
    f['priority_score']=f[['score_in','score_out','score_seed','score_bridge','score_volume']].sum(axis=1).round(6)
    def evidence(r):
        label={'coordinator':'Кандидат координации','distributor':'Веерное распределение','consolidator':'Признаки консолидации','transit':'Признаки транзита','terminal':'Нет наблюдаемого выхода','peripheral':'Недостаточно признаков'}[r.role]
        warning='; обрыв depth=4' if r.truncated_by_depth else ('; seed: вход неполон' if r.is_seed else '')
        return f'{label}: вход {int(r.in_deg)} / {r.in_kzt:,.0f} KZT; выход {int(r.out_deg)} / {r.out_kzt:,.0f} KZT; достигнут от {int(r.seed_reach)} seed{warning}'[:200]
    f['evidence']=[evidence(r) for r in f.itertuples()]
    ordered=f.reset_index().sort_values(['priority_score','gid'],ascending=[False,True])
    clusters=[]
    for i,c in enumerate(groups,1):
        sub=f.loc[sorted(c)];best=ordered.loc[ordered.cluster_id==i].head(5)
        internal=sum(d['weight'] for u,v,d in g.edges(c,data=True) if v in c)
        dominant=sub.role.value_counts().idxmax()
        clusters.append(dict(cluster_id=i,n_nodes=len(c),n_seed=int(sub.is_seed.sum()),sum_kzt_internal=round(internal,2),top_gids=';'.join(str(x) for x in best.gid),hypothesis=f'Структурное сообщество; преобладает {dominant}; назначение требует проверки'))
    return f,ordered,pd.DataFrame(clusters),g

def run(data,out,web):
    started=time.perf_counter();e,n,t=load_validate(Path(data));f,ordered,clusters,g=analyze(e,n,t)
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    required=['gid','role','role_score','cluster_id','priority_score','evidence']
    node_rows=f.reset_index();node_rows[required+[x for x in node_rows if x not in required]].to_csv(out/'nodes_roles.csv',index=False,encoding='utf-8-sig',na_rep='')
    clusters.to_csv(out/'clusters.csv',index=False,encoding='utf-8-sig')
    def priority_reason(r):
        return f'Из 100 баллов: плательщики {r.score_in*100:.1f}; получатели {r.score_out*100:.1f}; seed {r.score_seed*100:.1f}; посредничество {r.score_bridge*100:.1f}; объём {r.score_volume*100:.1f}. {r.evidence}'
    top=ordered.head(50)[['gid','role','priority_score']].copy();top['why']=[priority_reason(r) for r in ordered.head(50).itertuples()];top.insert(0,'rank',range(1,len(top)+1));top.to_csv(out/'top_nodes.csv',index=False,encoding='utf-8-sig')
    nodes=[]
    for r in ordered.itertuples():
        ratio='не определено' if not math.isfinite(r.pass_through) else f'{r.pass_through:.2f}'
        explanation=f'{priority_reason(r)}. Выход / вход: {ratio}. Посредничество: {r.betweenness:.5f}. Исходящие через 1–2 дня после любого входа: {r.lag_share:.0%}. Это совпадение дат, не доказательство передачи тех же средств.'
        nodes.append(dict(gid=str(r.gid),role=r.role,roleScore=r.role_score,isSeed=bool(r.is_seed),cluster=str(r.cluster_id),depth=int(r.depth),priorityScore=round(r.priority_score*100,1),priorityReason=r.evidence,explanation=explanation,inboundAmountKzt=r.in_kzt,outboundAmountKzt=r.out_kzt,payersCount=int(r.in_deg),payeesCount=int(r.out_deg),isObservationBoundary=bool(r.truncated_by_depth),x=0,y=0))
    edges=[dict(id=f'{r.src}-{r.dst}',source=str(r.src),target=str(r.dst),amountKzt=r.sum_kzt,nTx=int(r.n_tx)) for r in e.itertuples()]
    payload=dict(generatedAt='2026-07-31',isDemo=False,nodes=nodes,edges=edges)
    web=Path(web);web.mkdir(parents=True,exist_ok=True);(web/'graph_export.json').write_text(json.dumps(payload,ensure_ascii=False,allow_nan=False),encoding='utf-8')
    checks=dict(nodes=len(f),edges=len(e),transactions=len(t),seed=int(n.is_seed.sum()),total_kzt=round(float(e.sum_kzt.sum()),2),isolates=nx.number_of_isolates(g),components=nx.number_weakly_connected_components(g),clusters=len(clusters),roles=f.role.value_counts().to_dict(),seconds=round(time.perf_counter()-started,3))
    if len(top)<min(20,len(n)) or not f.role.isin(ROLES).all() or not f.evidence.str.len().between(1,200).all():raise ValueError('Invalid output')
    (out/'validation.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(checks,ensure_ascii=False));return checks

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',default='data');p.add_argument('--out',default='public/results');p.add_argument('--web',default='src/data');a=p.parse_args();run(a.data,a.out,a.web)
