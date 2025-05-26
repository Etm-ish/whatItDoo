const { exec } = require('child_process');
const { BrowserWindow } = require('electron');
const path = require('path');

const LogHandler = require('./LogHandler');
const logHandler = new LogHandler();

class WidCliHandler {

    constructor() {
        this.cenaWindow = null;
      }


    handleCliCommand(cliCommand, mainWindow) {

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
                this.handleCenaActivation();
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
    
                    if (commandParts[0].trim() == 'd') {
                        durationText = commandParts[1].trim();
                    }
                });
                const result = logHandler.writeLogEntry('ADDED: ',`${logText} [Duration: ${durationText}]`, '');
                break;
    
            case 'logOptions':
                let options = String(cliCommandList[0]);
                let commandOptions = Array.from(options);
    
                commandOptions.forEach(command => {
                    switch(command) {
                        case 't':
                            logHandler.setLogTimeStamp(true);
                            break;
                        
                        case 's': 
                            logHandler.logStartText(true);
                            break;
                        
                        case 'a':
                            logHandler.setLogTimeStamp(true);
                            logHandler.logStartText(true);
                            break;
                            
                        default:                   
                    }            
                });
                break;
    
            default:
          }
    }

    handleCenaActivation() {
        // Set system volume to maximum (Windows only)
        if (process.platform === 'win32') {
            exec('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175);"', (error) => {
                if (error) console.error('Error setting volume:', error);
            });
        }
    
        this.cenaWindow = new BrowserWindow({
            fullscreen: true,
            frame: false,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
    
        this.cenaWindow.loadFile(path.join(__dirname, '../cena.html'));
    
        this.cenaWindow.on('closed', () => {
            this.cenaWindow = null;
        });
    }
}

module.exports = WidCliHandler;