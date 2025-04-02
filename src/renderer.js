const { ipcRenderer } = require('electron');

// Get DOM elements
const logTextInput = document.getElementById('logText');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('status');
const imageOverlay = document.getElementById('imageOverlay');
const successSound = document.getElementById('successSound');
const activeLogsList = document.getElementById('activeLogsList');

// Store active logs
const activeLogs = new Map();

// Add event listener for the submit button
submitBtn.addEventListener('click', submitLog);

// Also submit when pressing Enter in the text field
logTextInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        submitLog();
    }
});

// Function to submit the log
function submitLog() {
    const logText = logTextInput.value.trim();

    if (logText === '') {
        showStatus('Please enter a log message.', 'error');
        return;
    }

    // Send log text to main process
    ipcRenderer.send('submit-log', logText);

    // Clear input field
    logTextInput.value = '';

    // Focus back on the input field
    logTextInput.focus();
}

// Function to show status messages
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    // Reset classes
    statusDiv.classList.remove('success', 'error');

    if (type === 'success') {
        statusDiv.classList.add('success');
    } else if (type === 'error') {
        statusDiv.classList.add('error');
    }
}

// Function to show overlay for a specified duration
function showOverlay(durationMs) {
    // Reset animations by removing and re-adding the elements
    const popContainer = document.getElementById('popImageContainer');
    const popImage = document.getElementById('popImage');
    const successContainer = document.getElementById('successImageContainer');
    const successImage = document.getElementById('successImage');

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

// Function to add a log item to the active logs list
function addActiveLogItem(id, text, timestamp) {
    // Create a new list item
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', id);
    listItem.className = 'active-log-item';
    
    // Create text content
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    
    // Create end button
    const endButton = document.createElement('button');
    endButton.textContent = 'End';
    endButton.className = 'end-button';
    
    // Add click event to end button
    endButton.addEventListener('click', () => endLogItem(id, text, timestamp));
    
    // Append elements to the list item
    listItem.appendChild(textSpan);
    listItem.appendChild(endButton);
    
    // Append the list item to the active logs list
    activeLogsList.appendChild(listItem);
    
    // Store the log information
    activeLogs.set(id, { text, timestamp });
}

// Function to end a log item
function endLogItem(id, text, timestamp) {
    // Send request to main process to end the log
    ipcRenderer.send('end-log', {
        logText: text,
        startTime: timestamp
    });
    
    // Remove the item from the active logs list
    const listItem = document.querySelector(`li[data-id="${id}"]`);
    if (listItem) {
        activeLogsList.removeChild(listItem);
    }
    
    // Remove from active logs map
    activeLogs.delete(id);
}

// Listen for log result from main process
ipcRenderer.on('log-result', (event, result) => {
    if (result.success) {
        // Add the log to the active logs list
        addActiveLogItem(result.id, result.text, result.timestamp);
        
        // Show overlay for 2 seconds
        showOverlay(2000);
        
        // Play the success sound
        successSound.currentTime = 0; // Reset the audio to the beginning
        successSound.play().catch(err => {
            console.error('Error playing sound:', err);
        });
    } else {
        showStatus(`Error: ${result.error}`, 'error');
    }
});

// Listen for end log result from main process
// ipcRenderer.on('end-log-result', (event, result) => {
//     if (result.success) {
//         // Show success message with duration
//         showStatus(`Log ended successfully (Duration: ${result.durationSec} seconds)`, 'success');
        
//         // Show overlay for 2 seconds
//         showOverlay(2000);
        
//         // Play the success sound
//         successSound.currentTime = 0;
//         successSound.play().catch(err => {
//             console.error('Error playing sound:', err);
//         });
//     } else {
//         showStatus(`Error: ${result.error}`, 'error');
//     }
// });