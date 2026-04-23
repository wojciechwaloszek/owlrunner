import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { BrowserWindow, ipcMain } from 'electron';

export function setupMcpServer(mainWindow: BrowserWindow) {
  const server = new Server(
    {
      name: 'owlrunner-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

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
      
      // Optional timeout (Wait up to 10 seconds for layout computations)
      setTimeout(() => {
        if (pendingCommands.has(commandId)) {
          pendingCommands.get(commandId)?.reject(new Error('Command timed out'));
          pendingCommands.delete(commandId);
        }
      }, 10000);
    });
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_state',
          description: 'Get the current semantic state of the OWL ontology graph, including classes, attributes, and relationships.',
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
          name: 'add_object_attribute',
          description: 'Add an object attribute (single link) to a class.',
          inputSchema: {
            type: 'object',
            properties: {
              parentId: { type: 'string', description: 'ID of the parent class node' },
              label: { type: 'string', description: 'Name of the attribute' }
            },
            required: ['parentId', 'label'],
          },
        },
        {
          name: 'add_datatype_attribute',
          description: 'Add a datatype attribute (string/int) to a class.',
          inputSchema: {
            type: 'object',
            properties: {
              parentId: { type: 'string', description: 'ID of the parent class node' },
              label: { type: 'string', description: 'Name of the attribute' }
            },
            required: ['parentId', 'label'],
          },
        },
        {
          name: 'add_collective_attribute',
          description: 'Add a collective object attribute (list/set) to a class.',
          inputSchema: {
            type: 'object',
            properties: {
              parentId: { type: 'string', description: 'ID of the parent class node' },
              label: { type: 'string', description: 'Name of the attribute' }
            },
            required: ['parentId', 'label'],
          },
        },
        {
          name: 'set_attribute_type',
          description: 'Set the target type of an object or collective attribute (links the attribute to a target class).',
          inputSchema: {
            type: 'object',
            properties: {
              attributeId: { type: 'string', description: 'ID of the source attribute node' },
              classId: { type: 'string', description: 'ID of the target class node' }
            },
            required: ['attributeId', 'classId'],
          },
        },
        {
          name: 'delete_element',
          description: 'Delete a class or attribute node from the graph. Associated edges will also be removed automatically.',
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
      let result;
      switch (request.params.name) {
        case 'get_state':
          result = await sendCommandToRenderer('get_state', {});
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        case 'add_class':
        case 'add_subclass':
        case 'add_object_attribute':
        case 'add_datatype_attribute':
        case 'add_collective_attribute':
        case 'set_attribute_type':
        case 'delete_element':
        case 'undo':
        case 'redo':
          result = await sendCommandToRenderer(request.params.name, request.params.arguments);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    } catch (e: any) {
       return {
         content: [{ type: 'text', text: `Error: ${e.message}` }],
         isError: true,
       };
    }
  });

  const transport = new StdioServerTransport();
  server.connect(transport).catch(e => {
    console.error("MCP Server connection error:", e);
  });
}
