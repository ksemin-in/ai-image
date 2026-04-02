let monitoring = false;
let port = null;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.style.width = "100%";
canvas.style.borderRadius = "8px";
canvas.style.border = "2px solid #555";

function connectToBackground() {
    port = chrome.runtime.connect({ name: "sidepanel" });
    console.log("Connected to background");

    port.onMessage.addListener((message) => {
        if (message.type === "PoseResult") {
            updateUI(message.payload);
        }
    });

    port.onDisconnect.addListener(() => {
        console.log("Port disconnected, reconnecting...");
        setTimeout(connectToBackground, 1000); // auto-reconnect
    });
}

function updateUI(payload) {
    if (!monitoring) return;

    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (payload.landmarks) {
            const lm = payload.landmarks;
            const color = payload.pose === "Good Pose" ? 'lime' : 'red';

            // MediaPipe landmark indices
            // 0: nose, 2: left eye, 5: right eye
            // 7: left ear, 8: right ear  
            // 11: left shoulder, 12: right shoulder

            const points = {
                nose:          lm[0],
                leftEye:       lm[2],
                rightEye:      lm[5],
                leftEar:       lm[7],
                rightEar:      lm[8],
                leftShoulder:  lm[11],
                rightShoulder: lm[12],
            };

            // Helper to get pixel coords
            const px = (p) => ({ x: p.x * canvas.width, y: p.y * canvas.height });

            // Helper midpoint function
            const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

            const shoulderMid = mid(points.leftShoulder, points.rightShoulder);
            const earMid      = mid(points.leftEar, points.rightEar);

            const lines = [
                [points.leftEye,      points.rightEye],        // across eyes
                [points.leftShoulder, points.rightShoulder],    // across shoulders
                [points.nose,         shoulderMid],             // nose to shoulder midpoint
            ];

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            lines.forEach(([a, b]) => {
                const pa = px(a), pb = px(b);
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.stroke();
            });

            // Draw dots on each point
            ctx.fillStyle = color;
            Object.values(points).forEach(p => {
                const { x, y } = px(p);
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        document.getElementById('status').innerText =
            `Status: Active — ${payload.pose}`;
        document.getElementById('status').style.color =
            payload.pose === "Good Pose" ? 'green' : 'red';
        document.getElementById('status').innerText =
        payload.pose === "Good Pose"
        ? "Status: Active — Good Pose "
        : `Status: Active — Bad Pose (${payload.issues.join(", ")})`;
    };
    img.src = payload.image;
}

// Connect immediately when sidepanel opens
connectToBackground();

chrome.storage.local.get(['isMonitoring'], (result) => {
    if (result.isMonitoring) startMonitoring();
});

document.getElementById('activate').addEventListener('click', () => {
    if (monitoring) stopMonitoring();
    else startMonitoring();
});

function startMonitoring() {
    monitoring = true;
    chrome.storage.local.set({ isMonitoring: true });
    document.getElementById('status').innerText = "Status: Active";
    document.getElementById('activate').innerText = "Stop Monitoring";
    document.body.appendChild(canvas);
    chrome.runtime.sendMessage({ action: "START_MONITORING" });
}

function stopMonitoring() {
    monitoring = false;
    chrome.storage.local.set({ isMonitoring: false });
    document.getElementById('status').innerText = "Status: Inactive";
    document.getElementById('activate').innerText = "Start Monitoring";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.remove();
    chrome.runtime.sendMessage({ action: "STOP_MONITORING" });
}