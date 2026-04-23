import { BrowserWindow, ipcMain } from 'electron';
import http from 'http';

export function setupMcpServer(mainWindow: BrowserWindow) {
  let nextCommandId = 1;
  const pendingCommands = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

  ipcMain.on('mcp-response', (event, data) => {
    const { commandId, success, result, error } = data;
    const p = pendingCommands.get(commandId);
    if (p) {
      if (success) {
        p.resolve(result);
      } else {
        p.reject(new Error(error));
      }
      pendingCommands.delete(commandId);
    }
  });

  const sendCommandToRenderer = (command: string, args: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const commandId = nextCommandId++;
      pendingCommands.set(commandId, { resolve, reject });
      mainWindow.webContents.send('mcp-command', { commandId, command, args });
      
      // Wait up to 10 seconds for layout computations
      setTimeout(() => {
        if (pendingCommands.has(commandId)) {
          pendingCommands.get(commandId)?.reject(new Error('Command timed out'));
          pendingCommands.delete(commandId);
        }
      }, 10000);
    });
  };

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { command, args } = payload;
          const result = await sendCommandToRenderer(command, args || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(30555, '127.0.0.1', () => {
    console.log('GraphBuilder local HTTP API listening on http://127.0.0.1:30555');
  });
}
