
import vision from "https://cdn.skypack.dev/@mediapipe/tasks-vision@latest";
const { HandLandmarker, FilesetResolver } = vision;


const demosSection = document.getElementById("demos");
const fingerCountElement = document.getElementById("fingersShown");
//start server in esp
const hallLight=document.getElementById('hallLight');
const hallFan=document.getElementById('hallFan');
const bedLight=document.getElementById('bedLight');
const bedFan=document.getElementById('bedFan');
const motor=document.getElementById('motor');

const button1 = document.getElementById('server-run');
  const button2 = document.getElementById('webcamButton');
  window.addEventListener('load',()=>{
    Post()
    console.log("hi");
  })
  button1.addEventListener('click', () => {
    Post()
  });

function Post()
{
  fetch('http://192.168.232.227:8080/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: "runServer"
        })
      })
      .then(response => {
        console.log('Response:', response);
        return response.text(); // Parse response data as JSON
      })

      .then(text => {
      // Remove newlines from the text
      text = text.replace(/(\r\n|\n|\r)/gm, "");
      const index = text.indexOf('}');
      const jsonString = text.slice(0, index+1);
      // Parse the text as JSON
      const data = JSON.parse(jsonString);
        // Do something with the received data
      
        hallLight.innerHTML=data.L1;
        hallFan.innerHTML=data.F1;
        bedLight.innerHTML=data.L2;
        bedFan.innerHTML=data.F2;
        motor.innerHTML=data.M;
        button2.disabled = false;
      })

      .catch(error => {
        console.error('Error:', error);
      });

}

let handLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning;
const videoHeight = "360px";
const videoWidth = "480px";
let currentFingerCount=null,prevFingerCount=null ,fingerCountDuration=null;
// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runDemo() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-assets/hand_landmarker.task`
    },
    runningMode: runningMode,
    numHands: 2
  });
  demosSection.classList.remove("invisible");
}
runDemo();

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  if (!handLandmarker) {
    console.log("Wait! objectDetector not loaded yet.");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    fingerCountElement.innerHTML="DISABLED"
  } else {
    console.log("webcam was off");
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICITONS";
    fingerCountElement.innerHTML="Fingers up: 0"
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

function countFingers(landmarks) {
  const thumbTip = landmarks[4],thumbEnd=landmarks[3];
  const indexTip = landmarks[8],indexEnd=landmarks[6];
  const middleTip = landmarks[12],middleEnd=landmarks[10];
  const ringTip = landmarks[16],ringEnd=landmarks[14];
  const pinkyTip = landmarks[20],pinkyEnd=landmarks[18];
  
  let fingersUp = 0;
  if (thumbEnd.x < thumbTip.x) fingersUp++;
  if (indexEnd.y > indexTip.y) fingersUp++;
  if (middleEnd.y > middleTip.y) fingersUp++;
  if (ringEnd.y > ringTip.y) fingersUp++;
  if (pinkyEnd.y > pinkyTip.y) fingersUp++;

  if (fingersUp !== currentFingerCount) {
    return fingersUp;
  }
  return -1;
}

async function predictWebcam() {
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();
  const results = handLandmarker.detectForVideo(video, nowInMs);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 5
      });
      drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
      const fingersUp = countFingers(landmarks);
      if (fingersUp !== -1) {
        // Finger count has changed. Reset duration and update current count.
        prevFingerCount = currentFingerCount;
        currentFingerCount = fingersUp;
        fingerCountDuration = 0;
      } else {
        // Finger count is the same. Update duration.
        fingerCountDuration++;
      }
      
      // If the same finger count has lasted for 1 second, send it.
      if (currentFingerCount !== 0 && fingerCountDuration === 15) {
        // Send current finger count here.
        fingerCountDuration=0;
        console.log(currentFingerCount);
      fingerCountElement.innerText = `Fingers up: ${currentFingerCount}`;
      
      fetch('http://192.168.232.227:8080/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: currentFingerCount
        })
      })
      .then(response => {
        console.log('Response:', response);
        return response.text(); // Parse response data as JSON
      })

      .then(text => {
      // Remove newlines from the text
      text = text.replace(/(\r\n|\n|\r)/gm, "");
      const index = text.indexOf('}');
      const jsonString = text.slice(0, index+1);
      // Parse the text as JSON
      const data = JSON.parse(jsonString);
      console.log('Data:', data.led_state);
        // Do something with the received data
        hallLight.innerHTML=data.L1;
        hallFan.innerHTML=data.F1;
        bedLight.innerHTML=data.L2;
        bedFan.innerHTML=data.F2;
        motor.innerHTML=data.M;
        button2.disabled = false;
      })

      .catch(error => {
        console.error('Error:', error);
      });

      }
    }
  }
  canvasCtx.restore();

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }


}


 

