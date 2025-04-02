const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Create logs directory if it doesn't exist
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

let mainWindow;
let cenaWindow = null;
let isQuitting = false;

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

app.on('before-quit', (event) => {
    // Only execute this once
    if (isQuitting) return;

    console.log('Application is shutting down, writing final log...');
    writeLogEntry('Application closed');
    isQuitting = true;
})

// Listen for log entry submissions from the renderer process
ipcMain.on('submit-log', (event, logText) => {
    const randomChance = Math.floor(Math.random() * 100) + 1;

    if (logText.toLowerCase() === 'cena' || randomChance === 1) {
        handleCenaActivation();
    } else {
        const result = writeLogEntry("START: " + logText);
        event.reply('log-result', {
            ...result,
            id: Date.now().toString(), // Add unique ID for the log entry
            text: logText
        });
    }
});

// Listen for end log entry submissions from the renderer process
ipcMain.on('end-log', (event, data) => {
    const { logText, startTime } = data;
    
    // Calculate duration from the startTime to now
    const now = new Date();
    const startDate = new Date(startTime);
    const durationMs = now - startDate;
    const durationSec = (durationMs / 1000).toFixed(2);
    
    const result = writeLogEntry(`END: ${logText} [Duration: ${durationSec} seconds]`);
    event.reply('end-log-result', { ...result, durationSec });
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 300, // Increased height to accommodate the list
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    Menu.setApplicationMenu(null);
    // In main.js, update the line that loads the HTML file:
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Uncomment the line below to open DevTools for debugging
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Function to handle the "cena" special case
function handleCenaActivation() {
    // Set system volume to maximum (Windows only)
    if (process.platform === 'win32') {
        exec('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175);"', (error) => {
            if (error) console.error('Error setting volume:', error);
        });
    }

    // Create a new full-screen window for the video
    cenaWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Load an HTML page that plays the video
    cenaWindow.loadFile(path.join(__dirname, 'cena.html'));

    // Close the cena window when the video ends or when clicked
    cenaWindow.on('closed', () => {
        cenaWindow = null;
    });
}

function writeLogEntry(logText) {
    const logFile = path.join(logsDir, 'log.txt');

    // Format date in local time instead of UTC
    const now = new Date();
    const timestamp = now.toLocaleString();

    // Just write the log entry without calculating duration from last entry
    const logEntry = `[${timestamp}] ${logText}\n`;

    try {
        fs.appendFileSync(logFile, logEntry);
        console.log('Log entry saved successfully');
        return { success: true, timestamp };
    } catch (err) {
        console.error('Failed to save log entry:', err);
        return { success: false, error: err.message };
    }
}