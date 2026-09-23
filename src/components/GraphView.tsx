import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  Handle, Position, useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow';
import type { AccountNode, TransferEdge } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../roles';
import { formatKzt, shortenGid } from '../utils/format';

interface GraphViewProps {
  nodes: AccountNode[];
  edges: TransferEdge[];
  selectedGid: string | null;
  focusGid: string | null;
  focusRevision?: number;
  colorByCluster?: boolean;
  showAmounts?: boolean;
  onSelect: (gid: string) => void;
}

function AccountNodeCard({ data, selected }: NodeProps<{ account: AccountNode; isSelected: boolean; colorByCluster: boolean }>) {
  const { account, isSelected } = data;
  const color = data.colorByCluster ? `hsl(${Number(account.cluster)*137.5%360} 60% 40%)` : ROLE_COLORS[account.role];
  return (
    <div
      className={`rounded-md border bg-white px-3 py-2 shadow-sm transition-shadow ${
        isSelected || selected ? 'ring-2 ring-accent-600 border-accent-600' : 'border-line'
      }`}
      style={{ width: 230 }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false}/><Handle type="source" position={Position.Right} isConnectable={false}/>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-ink/70">{ROLE_LABELS[account.role]}</span>
      </div>
      <div className="gid-mono mt-1 truncate text-xs text-ink" title={account.gid}>
        {account.gid}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-ink/60">
        <span>оценка {account.priorityScore}</span>
        <span>{account.isSeed ? 'seed' : account.isObservationBoundary ? 'граница' : `d${account.depth}`} · к{account.cluster}</span>
      </div>
    </div>
  );
}

const nodeTypes = { account: AccountNodeCard };

function FlowCanvas({ nodes, edges, selectedGid, focusGid, focusRevision, colorByCluster, showAmounts, onSelect }: GraphViewProps) {
  const { setCenter, fitView } = useReactFlow();

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.gid,
        type: 'account',
        position: { x: n.x, y: n.y },
        data: { account: n, isSelected: n.gid === selectedGid, colorByCluster },
        draggable: true,
      })),
    [nodes, selectedGid, colorByCluster],
  );

  const [liveNodes,setLiveNodes,onNodesChange]=useNodesState(rfNodes);
  useEffect(()=>setLiveNodes(rfNodes),[rfNodes,setLiveNodes]);
  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.gid)), [nodes]);

  const rfEdges: Edge[] = useMemo(
    () =>
      edges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: showAmounts ? formatKzt(e.amountKzt) : undefined,
          labelStyle: { fontSize: 10, fill: '#43554D' },
          labelBgStyle: { fill: '#F6F7F4', fillOpacity: 0.9 },
          style: { stroke: '#8AA79A', strokeWidth: 1.4 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8AA79A', width: 16, height: 16 },
        })),
    [edges, nodeIds, showAmounts],
  );

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, fitView]);

  useEffect(() => {
    if (!focusGid) return;
    const target = nodes.find((n) => n.gid === focusGid);
    if (!target) return;
    const t=setTimeout(()=>setCenter(target.x + 100, target.y + 30, { zoom: .9, duration: 300 }),450);
    return ()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusGid,focusRevision]);

  return (
    <ReactFlow
      nodes={liveNodes}
      onNodesChange={onNodesChange}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      minZoom={0.05}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#DCE3DB" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export default function GraphView(props: GraphViewProps) {
  if (props.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-ink/60">
        Нет результатов — измените фильтры
      </div>
    );
  }
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
