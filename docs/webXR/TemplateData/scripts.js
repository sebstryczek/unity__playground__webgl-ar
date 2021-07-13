if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(function (stream) {
      var video = document.querySelector("#camera-view");
      video.srcObject = stream;
    })
    .catch(function (err0r) {
      console.log("Something went wrong!");
    });
}

var isCameraReady = false;
var isCopyTransformARReady = false;

var xrSession = null;

var gl = null;
var unityCanvas = document.querySelector("#unity-canvas");
var frameDrawer = null;
var xrRefSpace = null;
var xrViewerSpace = null;
var xrHitTestSource = null;
var isValidHitTest = false;
var hitTestPosition = null;

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
var isTouchListenerReady = false;

function touchListenerReady() {
  isTouchListenerReady = true;
}

function onEndSession(session) {
  xrHitTestSource.cancel();
  xrHitTestSource = null;
  session.end();
}

/* *** */

function onSessionStarted(session) {
  xrSession = session;

  session.addEventListener("end", onSessionEnded);
  session.addEventListener("select", onSelect);

  let glLayer = new XRWebGLLayer(session, gl);
  session.updateRenderState({ baseLayer: glLayer });

  unityInstance.Module.canvas.width = glLayer.framebufferWidth;
  unityInstance.Module.canvas.height = glLayer.framebufferHeight;

  session.requestReferenceSpace("viewer").then((refSpace) => {
    xrViewerSpace = refSpace;
    // session.requestHitTestSource({ space: xrViewerSpace }).then((hitTestSource) => {
    //     xrHitTestSource = hitTestSource;
    // });
    session
      .requestHitTestSourceForTransientInput({
        profile: "generic-touchscreen",
      })
      .then((hitTestSource) => {
        xrTransientInputHitTestSource = hitTestSource;
      });
  });

  session.requestReferenceSpace("local").then((refSpace) => {
    xrRefSpace = refSpace;
    unityInstance.Module.InternalBrowser.requestAnimationFrame(frameDrawer);
  });
}

function onRequestSessionError(ex) {
  alert("Failed to start immersive AR session.");
  console.error(ex.message);
}

function onSessionEnded(event) {
  xrSession = null;
  gl = null;
}

function onSelect(event) {
  if (isValidHitTest) {
    const serializedPos = `${[
      hitTestPosition.x,
      hitTestPosition.y,
      hitTestPosition.z,
    ]}`;
    unityInstance.SendMessage("HitListener", "setHit", serializedPos);
  }
}

var buildUrl = "Build";
var loaderUrl = buildUrl + "/55b027cfe78bae9b0fbebad0d7c12abd.js";
var config = {
  dataUrl: buildUrl + "/1f61bdee5de674ed6b80b8a351350418.data",
  frameworkUrl: buildUrl + "/a838f0ae6d26eb4e91e8d1d584a346fe.js",
  codeUrl: buildUrl + "/cacf42e11e4fbb9d2a6fe57b28623aa9.wasm",
  // #if MEMORY_FILENAME
  memoryUrl: buildUrl + "/",
  // #endif
  // #if SYMBOLS_FILENAME
  symbolsUrl: buildUrl + "/",
  // #endif
  streamingAssetsUrl: "StreamingAssets",
  companyName: "DefaultCompany",
  productName: "ARWT",
  productVersion: "0.1",
};

var loadingBar = document.querySelector("#unity-loading-bar");
var progressBarFull = document.querySelector("#unity-progress-bar-full");

// By default Unity keeps WebGL canvas render target size matched with
// the DOM size of the canvas element (scaled by window.devicePixelRatio)
// Set this to false if you want to decouple this synchronization from
// happening inside the engine, and you would instead like to size up
// the canvas DOM size and WebGL render target sizes yourself.
// config.matchWebGLToCanvasSize = false;

loadingBar.style.display = "block";

var script = document.createElement("script");
script.src = loaderUrl;
script.onload = () => {
  createUnityInstance(unityCanvas, config, (progress) => {
    progressBarFull.style.width = 100 * progress + "%";
  })
    .then((_unityInstance) => {
      unityInstance = _unityInstance;
      loadingBar.style.display = "none";

      function initUnity() {
        gl = unityInstance.Module.ctx;
        unityCanvas = unityInstance.Module.canvas;
        unityCanvas.width = document.documentElement.clientWidth;
        unityCanvas.height = document.documentElement.clientHeight;

        var video = document.querySelector("#camera-view");
        if (video.srcObject) {
          video.srcObject.getTracks().forEach((track) => track.stop());
          video.remove();
        }

        unityInstance.Module.InternalBrowser.requestAnimationFrame =
          frameInject;
        document.addEventListener("toggleAR", onButtonClicked, false);
        setupObject();
      }

      function quaternionToUnity(q) {
        q.x *= -1;
        q.y *= -1;
        return q;
      }

      function vec3ToUnity(v) {
        v.z *= -1;
        return v;
      }

      function setupObject() {
        let position = new THREE.Vector3(0, 0, -1.5);
        let rotation = new THREE.Quaternion(0, 0, 0, 0);
        let scale = new THREE.Vector3(0.5, 0.5, 0.5);

        position = vec3ToUnity(position);
        rotation = quaternionToUnity(rotation);

        const serializedInfos = `aaa,false,${position.toArray()},${rotation.toArray()},${scale.toArray()}`;
        unityInstance.SendMessage(
          "CopyARTransform",
          "transofrmInfos",
          serializedInfos
        );
      }

      function frameInject(raf) {
        if (!frameDrawer) {
          frameDrawer = raf;
        }
        if (xrSession) {
          return xrSession.requestAnimationFrame((time, xrFrame) => {
            onXRFrame(xrFrame);
            raf(time);
          });
        }
      }

      function onXRFrame(frame) {
        let session = frame.session;
        if (!session) {
          return;
        }

        let glLayer = session.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
        gl.dontClearOnFrameStart = true;

        let pose = frame.getViewerPose(xrRefSpace);
        isValidHitTest = false;

        if (pose) {
          for (let xrView of pose.views) {
            let viewport = glLayer.getViewport(xrView);
            gl.viewport(
              viewport.x,
              viewport.y,
              viewport.width,
              viewport.height
            );

            let projection = new THREE.Matrix4();
            projection.set(...xrView.projectionMatrix);
            projection.transpose();

            const serializedProj = `${[...projection.toArray()]}`;
            unityInstance.SendMessage(
              "CameraMain",
              "setProjection",
              serializedProj
            );

            let position = xrView.transform.position;
            let orientation = xrView.transform.orientation;

            let pos = new THREE.Vector3(position.x, position.y, position.z);
            let rot = new THREE.Quaternion(
              orientation.x,
              orientation.y,
              orientation.z,
              orientation.w
            );

            pos = vec3ToUnity(pos);
            rot = quaternionToUnity(rot);

            const serializedPos = `${[pos.x, pos.y, pos.z]}`;
            const serializedRot = `${[rot.x, rot.y, rot.z, rot.w]}`;
            unityInstance.SendMessage(
              "CameraMain",
              "setPosition",
              serializedPos
            );
            unityInstance.SendMessage(
              "CameraMain",
              "setRotation",
              serializedRot
            );

            unityInstance.SendMessage("CopyARTransform", "setVisible", "true");
          }

          // if(xrHitTestSource){
          // let hitTestResults = frame.getHitTestResults(xrHitTestSource);
          // if (hitTestResults.length > 0) {
          //     let p = hitTestResults[0].getPose(xrRefSpace);
          //     let position = p.transform.position;
          //     let pos = new THREE.Vector3(position.x, position.y, position.z);
          //     pos = vec3ToUnity(pos);
          //     isValidHitTest = true
          //     hitTestPosition = pos
          // }
          // }

          /* Floor hit */
          if (xrTransientInputHitTestSource) {
            let hitTestResults = frame.getHitTestResultsForTransientInput(
              xrTransientInputHitTestSource
            );
            if (hitTestResults.length > 0) {
              let p = hitTestResults[0].results[0];
              if (p != null) {
                let newPose = p.getPose(xrRefSpace);
                let position = newPose.transform.position;
                let pos = new THREE.Vector3(position.x, position.y, position.z);
                pos = vec3ToUnity(pos);
                isValidHitTest = true;
                hitTestPosition = pos;
              }
            }
          }
          /* *** */

          /* Screen touch */
          for (const source of session.inputSources) {
            if (source.targetRayMode === "screen") {
              const x = source.gamepad.axes[0];
              const y = source.gamepad.axes[1];
              unityInstance.SendMessage(
                "TouchListener",
                "SetTouch",
                `${[x, y]}`
              );
            }
          }
          /* *** */
        }
      }

      initUnity();
    })
    .catch((message) => {
      alert(message);
    });
};

document.body.appendChild(script);
