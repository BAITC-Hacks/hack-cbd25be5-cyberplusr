"""One local command: raw Parquet -> CSV and JSON -> built interface -> server."""
import argparse
import functools
import http.server
from pathlib import Path
import shutil
import subprocess
import time
from pipeline import run
from agent_server import serve

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',default='data');p.add_argument('--no-serve',action='store_true');p.add_argument('--port',type=int,default=5173);a=p.parse_args()
    root=Path(__file__).resolve().parent
    started=time.perf_counter()
    source=Path(a.data)
    if not source.is_absolute(): source=root/source
    run(source,root/'public/results',root/'src/data')
    npm=shutil.which('npm.cmd') or shutil.which('npm')
    if not npm:raise SystemExit('Node.js/npm required: install Node 20+ and run npm ci.')
    subprocess.run([npm,'run','build'],cwd=root,check=True)
    print(f'Full pipeline and build: {time.perf_counter()-started:.2f} seconds',flush=True)
    if not a.no_serve:
        serve(root, a.port)
