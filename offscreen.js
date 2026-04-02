import { PoseLandmarker, FilesetResolver } from "./node_modules/@mediapipe/tasks-vision/vision_bundle.mjs";

let poseLandmarker;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let engineInterval;


async function init() {
    if (!video || !canvas) {
        console.error("DOM elements not found:", { video, canvas });
        return;
    }

    console.log("Initializing MediaPipe...");
    const vision = await FilesetResolver.forVisionTasks(
        "./node_modules/@mediapipe/tasks-vision/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `./models/pose_landmarker_lite.task`,
            delegate: "CPU"
        },
        runningMode: "IMAGE",
        numPoses: 1
    });

    console.log("MediaPipe ready, requesting camera...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    // MediaPipe takes a few seconds to load — by the time it's done,
    // the video metadata may already be loaded, so onloadedmetadata never fires
    await video.play();

    // Use readyState instead of relying on the event
    if (video.readyState >= 2) {
        console.log("Video already ready, starting engine immediately");
        startEngine();
    } else {
        console.log("Waiting for video metadata...");
        video.addEventListener('loadeddata', () => {
            console.log("Video data loaded, starting engine");
            startEngine();
        });
    }
}

function startEngine() {
    if (engineInterval) clearInterval(engineInterval); // prevent double intervals
    engineInterval = setInterval(runEngineCycle, 500);
    console.log("Engine started, interval set");
}

async function runEngineCycle() {
    if (!poseLandmarker) return;
    if (video.readyState < 2) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frameData = canvas.toDataURL('image/jpeg', 0.5);

    const poseResult = await detectPose();
    if (!poseResult || poseResult.pose.label === "Unknown") return;

    chrome.runtime.sendMessage({
        type: "PoseResult",
        payload: {
            image: frameData,
            landmarks: poseResult.landmarks,
            pose: poseResult.pose.label,   // "Good Pose" or "Bad Pose"
            issues: poseResult.pose.issues // ["forward head", "slouching"] etc.
        }
    }, () => void chrome.runtime.lastError);
}

// async function runEngineCycle() {
//     if (!poseLandmarker) { console.log("no landmarker"); return; }
//     if (video.readyState < 2) { console.log("video not ready, state:", video.readyState); return; }

//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//     const frameData = canvas.toDataURL('image/jpeg', 0.5);

//     console.log("running detection...");
//     const poseResult = await detectPose();
//     console.log("poseResult:", poseResult);  // is this null every time?

//     if (!poseResult) return;

//     console.log("sending message:", poseResult.pose);
//     chrome.runtime.sendMessage({
//         type: "PoseResult",
//         payload: {
//             image: frameData,
//             landmarks: poseResult.landmarks,
//             pose: poseResult.pose,
//         }
//     }, (response) => {
//         if (chrome.runtime.lastError) {
//             console.error("Message send failed:", chrome.runtime.lastError.message);
//         } else {
//             console.log("Message sent successfully");
//         }
//     });
// }

async function detectPose() {
    if (!poseLandmarker) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const results = poseLandmarker.detect(canvas);

    if (results.landmarks && results.landmarks.length > 0) {
        const pose = classifyPose(results.landmarks[0]);
        return { landmarks: results.landmarks[0], pose };
    }

    return null;
}

function classifyPose(landmarks) {
    const nose          = landmarks[0];
    const leftEar       = landmarks[7];
    const rightEar      = landmarks[8];
    const leftShoulder  = landmarks[11];
    const rightShoulder = landmarks[12];

    const issues = [];

    // --- 1. SHOULDER TILT ---
    // Checks if one shoulder is significantly higher than the other
    const shoulderSlope = Math.abs(rightShoulder.y - leftShoulder.y);
    if (shoulderSlope > 0.06) {
        issues.push("uneven shoulders");
    }

    // --- 2. FORWARD HEAD / NECK CRANE ---
    // Ear should be roughly above the shoulder, not in front of it
    // If ear x is significantly ahead of shoulder x (towards camera), head is forward
    const leftNeckOffset  = leftEar.x  - leftShoulder.x;
    const rightNeckOffset = rightEar.x - rightShoulder.x;
    const avgNeckOffset   = (leftNeckOffset + rightNeckOffset) / 2;
    if (Math.abs(avgNeckOffset) > 0.08) {
        issues.push("forward head");
    }

    // --- 3. SLOUCHING / HUNCHING ---
    // Nose should be a reasonable distance above the shoulder midpoint
    // If nose is too close to shoulders vertically, user is hunching
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const noseToShoulderY = shoulderMidY - nose.y; // positive = nose above shoulders
    if (noseToShoulderY < 0.15) {
        issues.push("slouching");
    }

    // --- 4. VISIBILITY CHECK ---
    // Only flag pose if landmarks are actually visible (not occluded)
    // MediaPipe gives a visibility score 0-1 for each landmark
    const keyPoints = [leftShoulder, rightShoulder, leftEar, rightEar];
    const allVisible = keyPoints.every(p => p.visibility > 0.6);
    if (!allVisible) {
        return { label: "Unknown", issues: [] }; // don't judge if landmarks aren't clear
    }

    return {
        label: issues.length === 0 ? "Good Pose" : "Bad Pose",
        issues // e.g. ["forward head", "slouching"] — useful for specific feedback
    };
}




init();