const { app, BrowserWindow, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');

const WidCliHandler = require('./classes/WidCliHandler');
const LogHandler = require('./classes/LogHandler');

const widCliHandler = new WidCliHandler();
const logHandler = new LogHandler();

let mainWindow;
let isQuitting = false;

let originalSize = { width: 400, height: 300 };

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

app.on('before-quit', (event) => {
    if (isQuitting) return;
    globalShortcut.unregisterAll();
    isQuitting = true;
});

ipcMain.on('submit-log', (event, logText) => {
    const randomChance = Math.floor(Math.random() * 100) + 1;

    if(logText.startsWith('$wid')) {
        widCliHandler.handleCliCommand(logText.substring(5).toLowerCase(), mainWindow);
    } else if (randomChance === 1) {
        handleCenaActivation();
    } else {
        const result = logHandler.writeLogEntry('START: ', logText);
        event.reply('log-result', result.item);
    }
});

ipcMain.on('end-log', (event, data) => {
    const { activeLogObject } = data;
    logHandler.writeLogEntry("DONE", `${activeLogObject.text}`, activeLogObject.duration);
});

ipcMain.on('end-day', (event, doneTaskList) => {
    logHandler.writeEndDaySummary(doneTaskList);
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

ipcMain.on('resize-window', (event, data) => {
    if (data.isHelpView) {
        // Resize for help view, keeping the same width but adjusting height
        // Add padding to ensure all content is visible
        const padding = 50;
        mainWindow.setSize(originalSize.width, data.helpHeight + padding);
    } else {
        // Return to original size
        mainWindow.setSize(originalSize.width, originalSize.height);
    }
});

ipcMain.on('log-message', (event, message) => {
    console.log(message);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: originalSize.width,
        height: originalSize.height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        resizable: true
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    app.whenReady().then(() => {
        const ret = globalShortcut.register('Alt+l', () => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.webContents.send('focus-textbox');
        });
    
        if (!ret) {
          console.log('Registration failed');
        }
      });

    // Uncomment the line below to open DevTools for debugging
    // mainWindow.webContents.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}
