DEFAULT_THRESHOLDS = dict(coordinator_degree=3, coordinator_seeds=2, coordinator_betweenness=.001,
                          distributor_degree=10, consolidator_degree=3, retained_ratio=.3,
                          transit_low=.8, transit_high=1.2)

def assign_role(r, thresholds=None):
    t = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    a,b,ratio=r['in_deg'],r['out_deg'],r['pass_through']
    if a>=t['coordinator_degree'] and b>=t['coordinator_degree'] and r['seed_reach']>=t['coordinator_seeds'] and r['betweenness']>=t['coordinator_betweenness']:
        return 'coordinator', .65
    if b>=t['distributor_degree']: return 'distributor', min(.9,.6+b/400)
    if not r['is_seed'] and a>=t['consolidator_degree'] and (r['truncated_by_depth'] or ratio<=t['retained_ratio']):
        return 'consolidator', .45 if r['truncated_by_depth'] else .75
    if not r['is_seed'] and a>0 and b>0 and t['transit_low']<=ratio<=t['transit_high']:
        return 'transit', .75 if r['lag_share']>=.5 else .5
    if not r['is_seed'] and not r['truncated_by_depth'] and a>0 and b==0:
        return 'terminal', .45
    return 'peripheral', .15 if a+b==0 or r['truncated_by_depth'] else .3
