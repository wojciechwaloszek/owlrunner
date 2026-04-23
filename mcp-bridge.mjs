import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';

function sendToGraphBuilder(command, args) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ command, args });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 30555,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 && parsed.success) {
            resolve(parsed.result);
          } else {
            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error("Failed to parse local API response"));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Failed to connect to GraphBuilder API: ${e.message}. Is GraphBuilder running?`)));
    req.write(postData);
    req.end();
  });
}

const server = new Server(
  {
    name: 'owlrunner-mcp-bridge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
    const result = await sendToGraphBuilder(request.params.name, request.params.arguments || {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
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
