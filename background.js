// background.js
chrome.storage.local.set({ isMonitoring: false });
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

let sidepanelPort = null; // track the sidepanel connection

// Listen for sidepanel connecting
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
        sidepanelPort = port;
        console.log("Sidepanel connected");

        port.onDisconnect.addListener(() => {
            sidepanelPort = null;
            console.log("Sidepanel disconnected");
        });
    }
});

let lastNotificationTime = 0;

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "NewFrame") return;

    if (message.action === "START_MONITORING") {
        createOffscreen();
    } else if (message.action === "STOP_MONITORING") {
        closeOffscreen();
    } else if (message.type === "PoseResult") {
        console.log("Pose Result Received:", message.payload.pose);

        // Relay to sidepanel via port if it's connected
        if (sidepanelPort) {
            sidepanelPort.postMessage({
                type: "PoseResult",
                payload: message.payload
            });
        }

        // Notification with 60s cooldown
        const now = Date.now();
        if (message.payload.pose === "Bad Pose" && now - lastNotificationTime > 60000) {
            lastNotificationTime = now;
            const issueText = message.payload.issues.join(", ");
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.jpg',
                title: 'Pose Alert',
                message: `Posture issue detected: ${issueText}. Please adjust.`,
            });
        }
    }
});

async function createOffscreen() {
    const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existing.length > 0) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Continuously capture frames for pose detection'
    });
}

async function closeOffscreen() {
    const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existing.length > 0) await chrome.offscreen.closeDocument();
}