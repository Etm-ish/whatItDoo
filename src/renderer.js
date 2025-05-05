const { remote, ipcRenderer } = require('electron');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

// const TasksHandler = require('./classes/TasksHandler');

// const taskHandler = new TasksHandler();

window.addEventListener('DOMContentLoaded', () => {
    // This won't directly catch the X button, but will run when X button triggers window close
    window.addEventListener('beforeunload', (event) => {
      closeAndLogOpenItems();
      endDay();
    });

    // Initialize UI elements after DOM is loaded
    initializeUI();
});

let logTextInput;
let submitBtn;
let helpBtn;
let backBtn;
let statusDiv;
let imageOverlay;
let clickNoiceSound;
let activeLogsList;

function initializeUI() {
    logTextInput = document.getElementById('logText');
    submitBtn = document.getElementById('submitBtn');
    helpBtn = document.getElementById('help-btn');
    backBtn = document.getElementById('back-btn');
    statusDiv = document.getElementById('status');
    imageOverlay = document.getElementById('imageOverlay');
    clickNoiceSound = document.getElementById('clickNoiceSound');
    activeLogsList = document.getElementById('activeLogsList');

    // Add event listeners after elements are found
    if (submitBtn) submitBtn.addEventListener('click', submitLog);
    if (helpBtn) helpBtn.addEventListener('click', showHelp);
    if (backBtn) backBtn.addEventListener('click', hideHelp);

    if (logTextInput) {
        logTextInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                submitLog();
            }
        });
    }
}

const activeLogsMap = new Map();
let doneTaskList = new Array();


// Listen for log result from main process
ipcRenderer.on('log-result', (event, result) => {
    if (result.success) {
        addActiveLogItem(result.id, result.text, result.timestamp);

        showOverlay(2000);
        
        if (clickNoiceSound) {
            clickNoiceSound.currentTime = 0;
            clickNoiceSound.play().catch(err => {
                console.error('Error playing sound:', err);
            });
        }
    } else {
        showStatus(`Error: ${result.error}`, 'error');
    }
});

ipcRenderer.on('focus-textbox', () => {
    if (logTextInput) {
        logTextInput.focus();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        ipcRenderer.send('minimize-window');
    }
});

function submitLog() {
    if (!logTextInput) return;
    
    const logText = logTextInput.value.trim();

    if (logText === '') {
        showStatus('If it do nothing, it log nothing', 'error');
        return;
    }

    ipcRenderer.send('submit-log', logText);
    logTextInput.value = '';
    logTextInput.focus();
}

function showStatus(message, type) {
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    statusDiv.classList.remove('success', 'error');

    if (type === 'success') {
        statusDiv.classList.add('success');
    } else if (type === 'error') {
        statusDiv.classList.add('error');
    }
}

function showOverlay(durationMs) {
    if (!imageOverlay) return;
    
    // Reset animations by removing and re-adding the elements
    const popContainer = document.getElementById('popImageContainer');
    const popImage = document.getElementById('popImage');
    const successContainer = document.getElementById('successImageContainer');
    const successImage = document.getElementById('successImage');

    if (!popContainer || !popImage || !successContainer || !successImage) return;

    // Clone the elements to reset their animations
    const newPopContainer = popContainer.cloneNode(false);
    const newPopImage = popImage.cloneNode(true);
    const newSuccessContainer = successContainer.cloneNode(false);
    const newSuccessImage = successImage.cloneNode(true);

    // Replace the old elements with the clones
    newPopContainer.appendChild(newPopImage);
    popContainer.parentNode.replaceChild(newPopContainer, popContainer);
    
    newSuccessContainer.appendChild(newSuccessImage);
    successContainer.parentNode.replaceChild(newSuccessContainer, successContainer);

    // Show the overlay
    imageOverlay.classList.remove('active');

    // Trigger reflow to ensure CSS animations restart
    void imageOverlay.offsetWidth;

    // Add active class after a tiny delay to ensure animations restart
    setTimeout(() => {
        imageOverlay.classList.add('active');
    }, 10);

    // Hide the overlay after the specified duration
    setTimeout(() => {
        imageOverlay.classList.remove('active');
    }, durationMs);
}

function addActiveLogItem(id, text, timestamp) {
    if (!activeLogsList) return;

    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', id);
    listItem.className = 'active-log-item';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    const endButton = document.createElement('button');
    endButton.textContent = 'End';
    endButton.className = 'end-button';
    
    listItem.appendChild(textSpan);
    listItem.appendChild(endButton);
    
    activeLogsList.appendChild(listItem);
    endButton.addEventListener('click', () => endLogItem(id, activeLogsMap.get(id)));
    
    if(activeLogsMap.size > 0) {
        activeLogsMap.forEach((value, key) => {           
            if(value.state == 'open') {
                value.state = 'paused'          
                const now = dayjs();
                const startDate = dayjs(value.timestamp);
                const diff = now.diff(startDate);
                let addedDif = value.duration + diff;
                value.duration = addedDif;           
                const lastListItem = document.querySelector(`li[data-id="${key}"]`);              
               
                if(lastListItem)  {
                    lastListItem.classList.replace('active-log-item', 'in-active-log-item');
                }                                           
            }
        });
    }
    activeLogsMap.set(id, createTaskItem(text, timestamp, 0, 'open'));  
}

function endLogItem(id, activeLogObject) {
    if (!activeLogObject) return;
    
    activeLogsMap.delete(id);

    if (activeLogObject.state == 'open') {
        const now = dayjs();
        const diff = now.diff(activeLogObject.timestamp);
        activeLogObject.duration = activeLogObject.duration + diff;

        if(activeLogsMap.size > 0) {
            let latestKey = findLatestTimestamp(activeLogsMap);
            if (latestKey && activeLogsMap.get(latestKey)) {
                activeLogsMap.get(latestKey).state = 'open';
                activeLogsMap.get(latestKey).timestamp = dayjs();
        
                const latestListItem = document.querySelector(`li[data-id="${latestKey}"]`);
                if (latestListItem) {
                    latestListItem.classList.replace('in-active-log-item', 'active-log-item');
                }
            }
        }
    }

    doneTaskList.push({
        text: activeLogObject.text, 
        duration: activeLogObject.duration
    });
 
    const listItem = document.querySelector(`li[data-id="${id}"]`);
    if (listItem && activeLogsList) {
        activeLogsList.removeChild(listItem);
    }

    ipcRenderer.send('end-log', {
        activeLogObject
    });
}

function closeAndLogOpenItems() {
    activeLogsMap.forEach((value, key) => {
        endLogItem(key, value);
    });
}

function findLatestTimestamp(activeLogsMap) {
    let latestTimestamp = 0;
    let latestKey = null;
    let latestValue = null;

    for (const [key, value] of activeLogsMap) {
        const timestamp = dayjs(value.timestamp);       
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          latestKey = key;
          latestValue = value;
        }
    }
    return latestKey;
}

function createTaskItem(text, timestamp, duration, state) {
    return {
        text: text,
        timestamp: timestamp,
        duration: duration,
        state: state
    };
}

function endDay() {
    ipcRenderer.send('end-day', doneTaskList);
}

function showHelp() {
    let infoContainer = document.getElementById('info-container');
    let mainContainer = document.getElementById('main-container');
    
    if (!infoContainer || !mainContainer) return;
    
    infoContainer.style.display = "block";
    mainContainer.style.display = "none";
    
    // Calculate the height needed for the help content
    const helpContentHeight = infoContainer.scrollHeight;
    
    // Send message to resize window to fit help content
    ipcRenderer.send('resize-window', { 
        isHelpView: true, 
        helpHeight: helpContentHeight 
    });
}

function hideHelp() {
    let infoContainer = document.getElementById('info-container');
    let mainContainer = document.getElementById('main-container');
    
    if (!infoContainer || !mainContainer) return;
    
    infoContainer.style.display = "none";
    mainContainer.style.display = "block";
    
    // Send message to resize window back to original size
    ipcRenderer.send('resize-window', { isHelpView: false });
}