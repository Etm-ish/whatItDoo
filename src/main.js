const { app, BrowserWindow, ipcMain, Menu, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

// Create logs directory if it doesn't exist
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

let mainWindow;
let cenaWindow = null;
let isQuitting = false;

let logTimeStamp = true;
let logStartText = true;

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

app.on('before-quit', (event) => {
    if (isQuitting) return;

    console.log('Application is shutting down, writing final log...');
    globalShortcut.unregisterAll();
    isQuitting = true;
});

ipcMain.on('submit-log', (event, logText) => {
    const randomChance = Math.floor(Math.random() * 100) + 1;

    if(logText.startsWith('$wid')) {
        handleCliCommand(logText.substring(5).toLowerCase())
    } else if (randomChance === 1) {
        handleCenaActivation();
    } else {
        const result = writeLogEntry("START: " + logText);
        event.reply('log-result', result.item);
    }
});

ipcMain.on('end-log', (event, data) => {
    const { activeLogObject } = data;
    let durationSec = createDurationSec(activeLogObject.duration);
    const result = writeLogEntry(`TASK: ${activeLogObject.text} [Duration: ${durationSec}]`);
});

ipcMain.on('end-day', (event, doneTaskList) => {
    let itemSummary = new Array();
    const logFile = path.join(logsDir, 'log.txt');

    console.log(JSON.stringify(doneTaskList));

    doneTaskList.forEach(item => {
        const exists = itemSummary.some(inExistingItem => inExistingItem.text === item.text);
        
        if (exists) {
            const existingItem = itemSummary.find(summaryItem => summaryItem.text === item.text);
            existingItem.duration = existingItem.duration = item.duration;        
        } else {
            itemSummary.push(item);
        }
    });

    try {
        fs.appendFileSync(logFile, '------------- Day Summary -------------\n');
    } catch (err) {
        console.error('Failed to end day log entry:', err);
    }

    itemSummary.forEach(sumItem => {       
        let durationSec = createDurationSec(sumItem.duration);
        const logEntry = `| Task: ${sumItem.text} [Total duration: ${durationSec}]\n`;

        try {
            fs.appendFileSync(logFile, logEntry);
        } catch (err) {
            console.error('Failed to end day log entry:', err);
        }
    })

    try {
        fs.appendFileSync(logFile, '---------------------------------------\n');
    } catch (err) {
        console.error('Failed to end day log entry:', err);
    }
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

ipcMain.on('log-message', (event, message) => {
    console.log(message);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
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
    const timestamp = dayjs();
    const timestampText = timestamp.format('ddd, DD MMM YYYY HH:mm:ss');
    let logEntry = '';

    if (logTimeStamp) {
        logEntry = `[${timestampText}]`;
    }

    logEntry += ` ${logText}\n`;

    try {

        if (logStartText) {
            fs.appendFileSync(logFile, logEntry);
            console.log('Log entry saved successfully');
        }
        const item = createItem(true, timestampText, Date.now().toString(), logText)
        return { item };
    } catch (err) {
        console.error('Failed to save log entry:', err);
        return { success: false, error: err.message };
    }
}

function createItem(success, timestamp, id, text) {
    return {
        success: success,
        timestamp: timestamp,
        id: id,
        text: text
    };
}

function createDurationSec(inDuration) {

    let duration = dayjs.duration(inDuration);
    let durationSec = '';
    
    if (duration.asSeconds() < 60) {
        durationSec = `${Math.floor(duration.asSeconds())}s`
    } else if (duration.asMinutes() < 60) {
        durationSec = `${Math.floor(duration.asMinutes())}mins, ${duration.seconds()}s`
    } else {
        durationSec = `${Math.floor(duration.asHours())} hrs, ${duration.minutes()} mins, ${duration.seconds()} s`
    }
    return durationSec;
}

function handleCliCommand(cliCommand) {

    let baseCommand;
    let cliCommandList

    if(cliCommand.includes('-')) {
        cliCommandList = cliCommand.split('-');       
        baseCommand = cliCommandList[0].trim();
        cliCommandList.shift();
    } else {
        baseCommand = cliCommand.trim();
    }

    switch(baseCommand) {
        case 'cena':
            handleCenaActivation();
            break;

        case 'top':
            mainWindow.setAlwaysOnTop(cliCommandList[0] == 't');
            break;

        case 'add':
            let logText = '';
            let durationText = '';

            cliCommandList.forEach(command => {
                let commandParts = command.split(' ');

                if (commandParts[0].trim() == 't') {
                    logText = commandParts[1].trim();
                }

                if (commandParts.trim == 'd') {
                    durationText = commandParts[1].trim();
                }
            });
            const result = writeLogEntry(`ADDED: ${logText} [Duration: ${durationText}]`);
            break;

        case 'logOptions':
            let options = String(cliCommandList[0]);
            let commandOptions = Array.from(options);
            logTimeStamp = false;
            logStartText = false;

            commandOptions.forEach(command => {
                switch(command) {
                    case 't':
                        logTimeStamp = true;
                        break;
                    
                    case 's': 
                        logStartText = true;
                        break;
                    
                    case 'a':
                        logTimeStamp = true;
                        logStartText = true;
                        break;
                        
                    default:                   
                }            
            });
            break;

        default:
      }
}