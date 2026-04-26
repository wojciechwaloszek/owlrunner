import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true, // Hides the menu bar entirely (unless Alt is pressed)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Completely remove the default menu so the user doesn't see "File / Edit / View"
  mainWindow.removeMenu();

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools only during development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Route target="_blank" links through the user's default OS browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('http://') || details.url.startsWith('https://')) {
      shell.openExternal(details.url);
    }
    return { action: 'deny' }; // Prevent Electron from opening a new window
  });

  return mainWindow;
};

import { setupMcpServer } from './mcp-server';

const args = process.argv;
const noMcpServer = args.includes('-nomcpserver');
const noMcpLog = args.includes('-nomcplog');
const portArg = args.find(a => a.startsWith('-mcpport:'));
const mcpPort = portArg ? parseInt(portArg.split(':')[1], 10) : undefined;

const mcpOptions = {
  port: mcpPort,
  disableLog: noMcpLog
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  const mainWindow = createWindow();
  // Initialize MCP Server
  if (!noMcpServer) {
    await setupMcpServer(mainWindow, mcpOptions);
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    const mainWindow = createWindow();
    if (!noMcpServer) {
      await setupMcpServer(mainWindow, mcpOptions);
    }
  }
});
