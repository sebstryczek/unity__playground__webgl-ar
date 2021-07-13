var isCameraReady = false;
var isCopyTransformARReady = false;

var xrSession = null;

let isTouchListenerReady = false;
let gl = null;
let unityCanvas = null;
let frameDrawer = null;
let xrRefSpace = null;
let xrViewerSpace = null;
let xrHitTestSource = null;
let isValidHitTest = false;
let hitTestPosition = null;

/* Functions called from Unity */

function cameraReady() {
  isCameraReady = true;
}

function dcopyARTransformReady() {
  isCopyTransformARReady = true;
}

const onButtonClicked = () => {
  if (!navigator.xr) {
    throw new Error("XR not supported :(");
  }

  if (!xrSession) {
    navigator.xr
      .requestSession("immersive-ar", {
        requiredFeatures: ["local-floor", "hit-test"],
      })
      .then(onSessionStarted, onRequestSessionError);
  } else {
    xrSession.end();
  }
};

/* *** */

/* Not used - TODO: add usage */

function touchListenerReady() {
  isTouchListenerReady = true;
}

function onEndSession(session) {
  xrHitTestSource.cancel();
  xrHitTestSource = null;
  session.end();
}

/* *** */
