import { useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar';
import Filters from './components/Filters';
import Legend from './components/Legend';
import GraphView from './components/GraphView';
import NodeCard from './components/NodeCard';
import PriorityTable from './components/PriorityTable';
import { graphData, CLUSTERS } from './data/realData';
import type { FilterState } from './types';
import { ROLE_ORDER } from './roles';

const defaults = (): FilterState => ({roles:new Set(ROLE_ORDER),cluster:'all',depth:{min:0,max:4}});
const index = new Map(graphData.nodes.map(n=>[n.gid,n]));
const adjacency = new Map<string,Set<string>>();
graphData.edges.forEach(e=>{for(const [a,b] of [[e.source,e.target],[e.target,e.source]]){if(!adjacency.has(a))adjacency.set(a,new Set());adjacency.get(a)!.add(b);}});

export default function App(){
 const [filters,setFilters]=useState<FilterState>(defaults);
 const [selectedGid,setSelectedGid]=useState(graphData.nodes[0]?.gid??'');
 const [searchStatus,setSearchStatus]=useState<'idle'|'not_found'>('idle');
 const [scope,setScope]=useState<'neighbors'|'overview'>('neighbors');
 const [colorByCluster,setColorByCluster]=useState(false);
 const [revision,setRevision]=useState(0);
 const [neighborLimit,setNeighborLimit]=useState(16);
 const [showAmounts,setShowAmounts]=useState(false);
 const filteredNodes=useMemo(()=>graphData.nodes.filter(n=>filters.roles.has(n.role)&&(filters.cluster==='all'||n.cluster===filters.cluster)&&n.depth>=filters.depth.min&&n.depth<=filters.depth.max),[filters]);
 useEffect(()=>{if(filteredNodes.length && !filteredNodes.some(n=>n.gid===selectedGid)){setSelectedGid(filteredNodes[0].gid);setRevision(x=>x+1);}},[filteredNodes,selectedGid]);
 const select=(gid:string)=>{setSelectedGid(gid);setSearchStatus('idle');setScope('neighbors');setRevision(x=>x+1);};
 const search=(q:string)=>{if(!index.has(q.trim())){setSearchStatus('not_found');return;}setFilters(defaults());select(q.trim());};
 const visible=useMemo(()=>{
   if(scope==='overview')return filteredNodes.slice(0,120).map((n,i)=>({...n,x:(i%10)*240,y:Math.floor(i/10)*130}));
   const center=filteredNodes.find(n=>n.gid===selectedGid);
   const neighbors=adjacency.get(selectedGid)??new Set<string>();
   const around=filteredNodes.filter(n=>neighbors.has(n.gid)).slice(0,neighborLimit);
   const incoming=new Set(graphData.edges.filter(e=>e.target===selectedGid).map(e=>e.source));
   const left=around.filter(n=>incoming.has(n.gid));
   const right=around.filter(n=>!incoming.has(n.gid));
   const place=(group:typeof around,side:number)=>group.map((n,i)=>({...n,x:side*(310+Math.floor(i/8)*265),y:((i%8)-(Math.min(group.length,8)-1)/2)*115}));
   return [...(center?[{...center,x:0,y:0}]:[]),...place(left,-1),...place(right,1)];
 },[filteredNodes,selectedGid,scope,neighborLimit]);
 return <div className="app-shell flex h-screen flex-col overflow-hidden bg-paper">
  <TopBar onSearch={search} searchStatus={searchStatus}/>
  <Filters filters={filters} clusters={CLUSTERS} onChange={setFilters}/>
  <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-2 text-xs text-ink/70">
   <strong>{graphData.nodes.length.toLocaleString('ru')} узлов · {graphData.edges.length.toLocaleString('ru')} связей · {CLUSTERS.length} кластеров</strong>
   <label>Вид <select aria-label="Режим графа" value={scope} onChange={e=>setScope(e.target.value as typeof scope)} className="rounded border p-1"><option value="neighbors">Связи выбранного узла</option><option value="overview">Обзор: топ-120 по фильтрам</option></select></label>
   <label>Соседей <select aria-label="Лимит соседей" value={neighborLimit} onChange={e=>setNeighborLimit(Number(e.target.value))} className="rounded border p-1"><option value={16}>16</option><option value={40}>40</option><option value={10000}>Все</option></select></label>
   <label className="flex items-center gap-1"><input type="checkbox" checked={showAmounts} onChange={e=>setShowAmounts(e.target.checked)}/>Суммы на связях</label>
   <label className="flex items-center gap-1"><input type="checkbox" checked={colorByCluster} onChange={e=>setColorByCluster(e.target.checked)}/>Цвет по кластерам</label>
   <button className="underline" onClick={()=>{setFilters(defaults());setScope('neighbors');}}>Сбросить фильтры</button>
   <span>На графе {visible.length} · соседей всего {(adjacency.get(selectedGid)?.size??0)} · в таблице {filteredNodes.length}</span>
   <div className="ml-auto flex gap-3">{!graphData.isDemo && ['nodes_roles','clusters','top_nodes'].map(name=><a key={name} href={`./results/${name}.csv`} download className="text-accent-700 underline">{name}.csv ↓</a>)}</div>
  </div>
  <div className="main-workspace flex min-h-0 flex-1">
   <div className="graph-column flex min-w-0 flex-1 flex-col">
    <div className="min-h-0 flex-1"><GraphView nodes={visible} edges={graphData.edges} selectedGid={selectedGid} focusGid={selectedGid} focusRevision={revision} colorByCluster={colorByCluster} showAmounts={showAmounts} onSelect={select}/></div>
    <Legend/><PriorityTable nodes={filteredNodes} selectedGid={selectedGid} onSelect={select}/>
   </div><NodeCard node={filteredNodes.length ? index.get(selectedGid)??null : null}/>
  </div>
  <div className="border-t border-line px-5 py-2 text-xs text-ink/70">Роли — проверяемые гипотезы. Выборка: июль, внутрибанковские переводы ≥ 5 000 ₸, четыре перехода. <a href="./METHOD.md" target="_blank" className="underline">Методика расчёта ↗</a></div>
 </div>;
}

