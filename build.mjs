import { build, createServer } from 'vite';
import react from '@vitejs/plugin-react';
const config = { configFile: false, plugins: [react()] };
if(process.argv.includes('--dev')) {
  const server=await createServer({...config,server:{host:'127.0.0.1',port:5173}});
  await server.listen(); server.printUrls();
} else await build(config);
