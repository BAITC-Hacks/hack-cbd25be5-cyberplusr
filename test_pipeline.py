import json
import unittest
from pathlib import Path
import pandas as pd
from pipeline import assign_role

class PipelineChecks(unittest.TestCase):
    def test_boundary_is_not_terminal(self):
        r=dict(in_deg=1,out_deg=0,pass_through=0,is_seed=False,truncated_by_depth=True,seed_reach=1,betweenness=0,lag_share=0)
        self.assertEqual(assign_role(r)[0],'peripheral')
        r['in_deg']=4
        self.assertEqual(assign_role(r),('consolidator',.45))
    def test_seed_ratio_not_used_for_transit(self):
        r=dict(in_deg=1,out_deg=1,pass_through=1,is_seed=True,truncated_by_depth=False,seed_reach=1,betweenness=0,lag_share=1)
        self.assertEqual(assign_role(r)[0],'peripheral')
    def test_exports(self):
        n=pd.read_parquet('data/nodes.parquet')
        roles=pd.read_csv('public/results/nodes_roles.csv',dtype={'gid':'int64'})
        clusters=pd.read_csv('public/results/clusters.csv')
        top=pd.read_csv('public/results/top_nodes.csv',dtype={'gid':'int64'})
        self.assertEqual(set(roles.gid),set(n.gid))
        self.assertEqual(len(roles),len(n))
        self.assertTrue(roles.role_score.between(0,1).all())
        self.assertTrue(roles.priority_score.between(0,1).all())
        self.assertTrue(roles.evidence.str.len().between(1,200).all())
        self.assertFalse(roles.loc[roles.truncated_by_depth,'role'].eq('terminal').any())
        self.assertEqual(clusters.n_nodes.sum(),len(n))
        self.assertEqual(clusters.n_seed.sum(),int(n.is_seed.sum()))
        self.assertEqual(set(roles.cluster_id),set(clusters.cluster_id))
        self.assertGreaterEqual(len(top),20)
        self.assertTrue(top.priority_score.is_monotonic_decreasing)
        payload=json.loads(Path('src/data/graph_export.json').read_text(encoding='utf-8'))
        self.assertEqual({x['gid'] for x in payload['nodes']},{str(x) for x in n.gid})
        self.assertTrue(all(isinstance(x['gid'],str) for x in payload['nodes']))
        self.assertTrue(all(isinstance(e['source'],str) and isinstance(e['target'],str) for e in payload['edges']))

if __name__=='__main__':unittest.main()
