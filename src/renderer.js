const { ipcRenderer } = require('electron');

// Get DOM elements
const logTextInput = document.getElementById('logText');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('status');
const imageOverlay = document.getElementById('imageOverlay');
const successSound = document.getElementById('successSound');

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

    // Show loading status
    // showStatus('Saving log entry...', '');
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

// Listen for log result from main process
ipcRenderer.on('log-result', (event, result) => {
    if (result.success) {
        // Show success message
        //showStatus(`Log saved at ${result.timestamp} (Duration since last entry: ${result.duration})`, 'success');

        // Display the overlay for 3 seconds
        showOverlay(2000);

        // Play the success sound
        successSound.currentTime = 0; // Reset the audio to the beginning
        successSound.play().catch(err => {
            console.error('Error playing sound:', err);
        });

        // Focus back on the input field for convenience
        logTextInput.focus();
    } else {
        showStatus(`Error: ${result.error}`, 'error');
    }
});
