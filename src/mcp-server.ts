import { BrowserWindow, ipcMain } from 'electron';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

let logStream: fs.WriteStream | null = null;
let isLogEnabled = true;

function log(...args: any[]) {
  if (!isLogEnabled) return;
  if (!logStream) {
    logStream = fs.createWriteStream(path.join(process.env['USERPROFILE'] || '.', 'mcp-server.log'), { flags: 'a' });
  }
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`;
  logStream.write(line);
}

export interface McpServerOptions {
  port?: number;
  disableLog?: boolean;
}

export async function setupMcpServer(mainWindow: BrowserWindow, options: McpServerOptions = {}) {
  isLogEnabled = !options.disableLog;
  const port = options.port || 30555;
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

  const createMcpSession = (): StreamableHTTPServerTransport => {
    const server = new Server(
      { name: 'owlrunner-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_state',
            description: 'Get the current semantic state of the OWL ontology graph.',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'add_class',
            description: 'Add a new core OWL class to the graph.',
            inputSchema: {
              type: 'object',
              properties: { label: { type: 'string', description: 'Name of the class' } },
              required: ['label'],
            },
          },
          {
            name: 'add_subclass',
            description: 'Add a new subclass to an existing class.',
            inputSchema: {
              type: 'object',
              properties: {
                parentId: { type: 'string', description: 'ID of the parent class node' },
                label: { type: 'string', description: 'Name of the subclass' }
              },
              required: ['parentId', 'label'],
            },
          },
          {
            name: 'add_functional_object_property',
            description: 'Add a functional object property to a class.',
            inputSchema: {
              type: 'object',
              properties: {
                parentId: { type: 'string', description: 'ID of the parent class node' },
                label: { type: 'string', description: 'Name of the functional object property' }
              },
              required: ['parentId', 'label'],
            },
          },
          {
            name: 'add_data_property',
            description: 'Add a data property to a class.',
            inputSchema: {
              type: 'object',
              properties: {
                parentId: { type: 'string', description: 'ID of the parent class node' },
                label: { type: 'string', description: 'Name of the property' }
              },
              required: ['parentId', 'label'],
            },
          },
          {
            name: 'add_general_object_property',
            description: 'Add a general object property (not functional, multiple values allowed) to a class.',
            inputSchema: {
              type: 'object',
              properties: {
                parentId: { type: 'string', description: 'ID of the parent class node' },
                label: { type: 'string', description: 'Name of the property' }
              },
              required: ['parentId', 'label'],
            },
          },
          {
            name: 'set_property_type',
            description: 'Set the target type of an object property (links the property to a target class).',
            inputSchema: {
              type: 'object',
              properties: {
                propertyId: { type: 'string', description: 'ID of the source property node' },
                classId: { type: 'string', description: 'ID of the target class node' }
              },
              required: ['propertyId', 'classId'],
            },
          },
          {
            name: 'delete_element',
            description: 'Delete a class or property node from the graph. Associated edges will also be removed automatically.',
            inputSchema: {
              type: 'object',
              properties: {
                elementId: { type: 'string', description: 'ID of the node or edge to delete.' }
              },
              required: ['elementId'],
            },
          },
          {
            name: 'undo',
            description: 'Undo the last graph modification.',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'redo',
            description: 'Redo the last undone graph modification.',
            inputSchema: { type: 'object', properties: {} },
          }
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const result = await sendCommandToRenderer(request.params.name, request.params.arguments || {});
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (e: any) {
        return {
          content: [{ type: 'text', text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, transport);
        log(`[MCP] Session created: ${sessionId}`);
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
        log(`[MCP] Session closed: ${transport.sessionId}`);
      }
    };
    server.connect(transport);
    return transport;
  };

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    log(`[MCP] ${req.method} ${parsedUrl.pathname}`);
    if (parsedUrl.pathname === '/mcp') {
      let parsedBody: unknown;
      if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString('utf-8');
        log(`[MCP] Body: ${raw.substring(0, 500)}`);
        try { parsedBody = JSON.parse(raw); } catch { /* leave undefined */ }
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && sessions.has(sessionId)) {
        transport = sessions.get(sessionId)!;
      } else if (!sessionId && req.method === 'POST' && (parsedBody as any)?.method === 'initialize') {
        transport = createMcpSession();
      } else if (sessionId) {
        log(`[MCP] Unknown session ID: ${sessionId}`);
        res.writeHead(404);
        res.end('Session not found');
        return;
      } else {
        // GET or DELETE without session — create a temporary transport for the response
        transport = createMcpSession();
      }

      try {
        await transport.handleRequest(req, res, parsedBody);
        log(`[MCP] Response status: ${res.statusCode}`);
      } catch (err: any) {
        log('[MCP] handleRequest error:', err.message, err.stack);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(err.message);
        }
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(port, '127.0.0.1', () => {
    log(`GraphBuilder MCP Server listening on http://127.0.0.1:${port}/mcp`);
  });
}
