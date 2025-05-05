const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const logsDir = path.join(app.getPath('userData'), 'logs');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

class LogHandler {

    constructor () {
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        this.logFile = path.join(logsDir, 'log.txt');
        this.logTimeStamp = true;
        this.logStartText = true;
    }


    writeLogEntry(prefix, logText, duration) {
        const timestamp = dayjs();
        const timestampText = timestamp.format('ddd, DD MMM YYYY HH:mm:ss');
        let logEntry = '';
    
        if (this.logTimeStamp) {
            logEntry = `[${timestampText}] `;
        }

        if(prefix === 'DONE' && duration) {
            let durationSec = this.createDurationSec(duration);
            prefix += ': '
            logEntry += `${prefix}${logText} [Duration: ${durationSec}]`;
        } else {
            logEntry += `${prefix}${logText}`;
        }    

        const logSuccess = this.writeToFile(logEntry);

        if(logSuccess) {
            const item = this.createItem(true, timestampText, Date.now().toString(), logText);
            return {item};
        } else {
            return { success: false, error: err.message };
        }
    }

    writeToFile(logEntry) {

        try {
            if (this.logStartText) {
                fs.appendFileSync(this.logFile, logEntry + '\n');
                console.log('Log entry saved successfully');
            }     
            return true;
        } catch (err) {
            console.error('Failed to save log entry:', err);
            return false;
        }
    }

    writeEndDaySummary (doneTaskList) {
        let itemSummary = new Array();

        doneTaskList.forEach(item => {
            const exists = itemSummary.some(inExistingItem => inExistingItem.text === item.text);
            
            if (exists) {
                const existingItem = itemSummary.find(summaryItem => summaryItem.text === item.text);
                existingItem.duration = existingItem.duration = item.duration;        
            } else {
                itemSummary.push(item);
            }
        });

        this.writeToFile( '------------- Day Summary -------------');

        itemSummary.forEach(sumItem => {       
            let durationSec = this.createDurationSec(sumItem.duration);
            const logEntry = `| Task: ${sumItem.text} [Total duration: ${durationSec}]`;

            this.writeToFile(logEntry);
        });

        this.writeToFile( '---------------------------------------');
    }

    createDurationSec(inDuration) {
    
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

    createItem(success, timestamp, id, text) {
        return {
            success: success,
            timestamp: timestamp,
            id: id,
            text: text
        };
    }

    setLogTimeStamp(value) {
        this.logTimeStamp = value;
    }

    setLogStartText(value) {
        this.logStartText = value;
    }
    
}

module.exports = LogHandler;