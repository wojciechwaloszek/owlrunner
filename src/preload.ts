// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mcpAPI', {
  onCommand: (callback: (data: any) => void) => {
    ipcRenderer.on('mcp-command', (_event, data) => callback(data));
  },
  sendResponse: (data: any) => {
    ipcRenderer.send('mcp-response', data);
  }
});
