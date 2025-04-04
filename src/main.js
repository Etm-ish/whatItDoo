const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const dayjs = require('dayjs')
const duration = require('dayjs/plugin/duration')
dayjs.extend(duration)

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

ipcMain.on('submit-log', (event, logText) => {
    const randomChance = Math.floor(Math.random() * 100) + 1;

    if(logText.startsWith('$wid')) {
        handleCliCommand(logText.substring(5).toLowerCase())
    } else if (randomChance === 1) {
        handleCenaActivation();
    } else {
        const result = writeLogEntry("START: " + logText);
        event.reply('log-result', {
            ...result,
            id: Date.now().toString(),
            text: logText
        });
    }
});

ipcMain.on('end-log', (event, data) => {
    const { logText, startTime } = data;
    
    const now = dayjs();
    const startDate = dayjs(startTime)
    const diff = now.diff(startDate)  
    const duration = dayjs.duration(diff)

    let durationSec = '';
    
    if (duration.asSeconds() < 60) {
        durationSec = `${Math.floor(duration.asSeconds())}s`
    } else if (duration.asMinutes() < 60) {
        durationSec = `${Math.floor(duration.asMinutes())}mins, ${duration.seconds()}s`
    } else {
        durationSec = `${Math.floor(duration.asHours())} hrs, ${duration.minutes()} mins, ${duration.seconds()} s`
    }

    console.log(durationSec);
    
    const result = writeLogEntry(`END: ${logText} [Duration: ${durationSec}]`);
    event.reply('end-log-result', { ...result, durationSec });
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 300,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Uncomment the line below to open DevTools for debugging
    // mainWindow.webContents.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function handleCenaActivation() {
    // Set system volume to maximum (Windows only)
    if (process.platform === 'win32') {
        exec('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175);"', (error) => {
            if (error) console.error('Error setting volume:', error);
        });
    }

    cenaWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    cenaWindow.loadFile(path.join(__dirname, 'cena.html'));

    cenaWindow.on('closed', () => {
        cenaWindow = null;
    });
}

function writeLogEntry(logText) {
    const logFile = path.join(logsDir, 'log.txt');

    const now = new Date();
    const timestamp = now.toLocaleString();

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

function handleCliCommand(cliCommand) {

    let baseCommand;
    let cliCommandList

    if(cliCommand.includes('-')) {
        cliCommandList = cliCommand.split("-");       
        baseCommand = cliCommandList[0].trim();   
    } else {
        baseCommand = cliCommand.trim();
    }

    switch(baseCommand) {
        case "cena":
            handleCenaActivation();
          break;
        case "ontop":
            const option = cliCommandList[1].trim();
            if (option == "true") {
                mainWindow.setAlwaysOnTop(true)
            } else if (option == "false") {
                mainWindow.setAlwaysOnTop(false)
            }
          break;
        default:
      }
}