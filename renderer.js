let isPaused = false;
const maxLogEntries = 100;

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupEventListeners();
    setupStatusUpdates();
    await loadRecentLogs();
});

async function loadSettings() {
    try {
        const settings = await window.electronAPI.getSettings();
        document.getElementById('watch-folder').value = settings.watchFolder;
        document.getElementById('output-folder').value = settings.outputFolder || settings.watchFolder + '/Processed';
        document.getElementById('auto-start').checked = settings.autoStart;
        isPaused = settings.isPaused;
        updatePauseButton();
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

function setupEventListeners() {
    document.getElementById('select-folder').addEventListener('click', async () => {
        const newPath = await window.electronAPI.selectFolder();
        if (newPath) {
            document.getElementById('watch-folder').value = newPath;
            addLogEntry('info', `Watch folder changed to: ${newPath}`);
        }
    });

    document.getElementById('select-output-folder').addEventListener('click', async () => {
        const newPath = await window.electronAPI.selectOutputFolder();
        if (newPath) {
            document.getElementById('output-folder').value = newPath;
            addLogEntry('info', `Output folder changed to: ${newPath}`);
        }
    });


    document.getElementById('pause-btn').addEventListener('click', async () => {
        isPaused = await window.electronAPI.togglePause();
        updatePauseButton();
        addLogEntry('info', isPaused ? 'Processing paused' : 'Processing resumed');
    });

    document.getElementById('auto-start').addEventListener('change', async (e) => {
        const enabled = await window.electronAPI.toggleAutoStart();
        addLogEntry('info', `Auto-start ${enabled ? 'enabled' : 'disabled'}`);
    });
}

function setupStatusUpdates() {
    window.electronAPI.onStatusUpdate((data) => {
        addLogEntry('info', data.message);
        updateStatusIndicator(data.message);
    });
}

function updatePauseButton() {
    const btn = document.getElementById('pause-btn');
    const icon = document.getElementById('pause-icon');
    const text = document.getElementById('pause-text');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    if (isPaused) {
        btn.classList.add('paused');
        icon.textContent = '▶';
        text.textContent = 'Resume';
        statusDot.classList.add('paused');
        statusText.textContent = 'Paused';
    } else {
        btn.classList.remove('paused');
        icon.textContent = '⏸';
        text.textContent = 'Pause';
        statusDot.classList.remove('paused');
        statusText.textContent = 'Running';
    }
}

function updateStatusIndicator(message) {
    const statusText = document.getElementById('status-text');
    if (!isPaused) {
        if (message.includes('Processing') || message.includes('Stitching')) {
            statusText.textContent = 'Processing...';
        } else if (message.includes('Watching')) {
            statusText.textContent = 'Watching';
        } else {
            statusText.textContent = 'Active';
        }
    }
}

function addLogEntry(level, message) {
    const logContainer = document.getElementById('activity-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;

    const time = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;

    logContainer.insertBefore(entry, logContainer.firstChild);

    while (logContainer.children.length > maxLogEntries) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

async function loadRecentLogs() {
    try {
        const logs = await window.electronAPI.getLogs();
        logs.reverse().forEach(log => {
            addLogEntry(log.level, log.message);
        });
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}