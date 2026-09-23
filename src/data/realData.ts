import { graphData as mockData } from './mockData';
import type { GraphDataset } from '../types';
// Raw and derived financial data are local-only. A clean checkout uses mock data.
const generated = import.meta.glob('./graph_export.json', { eager: true, import: 'default' });
export const graphData = (generated['./graph_export.json'] ?? mockData) as GraphDataset;
export const CLUSTERS = [...new Set(graphData.nodes.map(n => n.cluster))].sort((a,b) => Number(a)-Number(b));
