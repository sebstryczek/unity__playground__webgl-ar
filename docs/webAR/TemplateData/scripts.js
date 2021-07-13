var unityCanvas = document.querySelector("#unity-canvas");
var unityInstance;
var isCameraReady = false;
var isDetectionManagerReady = false;
var gl = null;

/* Functions called from Unity */
function cameraReady() {
  isCameraReady = true;
  gl = unityInstance.Module.ctx;
}

function detectionManagerReady() {
  isDetectionManagerReady = true;
}

function createUnityMatrix(el) {
  const m = el.matrix.clone();
  const zFlipped = new THREE.Matrix4().makeScale(1, 1, -1).multiply(m);
  const rotated = zFlipped.multiply(
    new THREE.Matrix4().makeRotationX(-Math.PI / 2)
  );
  return rotated;
}
/* *** */

AFRAME.registerComponent("markercontroller", {
  schema: { name: { type: "string" } },
  tock: function (time, timeDelta) {
    let position = new THREE.Vector3();
    let rotation = new THREE.Quaternion();
    let scale = new THREE.Vector3();

    createUnityMatrix(this.el.object3D).decompose(position, rotation, scale);

    const serializedInfos = `${this.data.name},${
      this.el.object3D.visible
    },${position.toArray()},${rotation.toArray()},${scale.toArray()}`;

    if (isDetectionManagerReady) {
      unityInstance.SendMessage(
        "DetectionManager",
        "markerInfos",
        serializedInfos
      );
    }
  },
});

AFRAME.registerComponent("cameratransform", {
  tock: function (time, timeDelta) {
    let camtr = new THREE.Vector3();
    let camro = new THREE.Quaternion();
    let camsc = new THREE.Vector3();

    this.el.object3D.matrix.clone().decompose(camtr, camro, camsc);

    const projection =
      this.el.components.camera.camera.projectionMatrix.clone();
    const serializedProj = `${[...projection.elements]}`;

    const posCam = `${[...camtr.toArray()]}`;
    const rotCam = `${[...camro.toArray()]}`;

    if (isCameraReady) {
      unityInstance.SendMessage("Main Camera", "setProjection", serializedProj);
      unityInstance.SendMessage("Main Camera", "setPosition", posCam);
      unityInstance.SendMessage("Main Camera", "setRotation", rotCam);

      let w = window.innerWidth;
      let h = window.innerHeight;

      const ratio = unityCanvas.height / h;

      w *= ratio;
      h *= ratio;

      const size = `${w},${h}`;

      unityInstance.SendMessage("Canvas", "setSize", size);
    }

    if (gl != null) {
      gl.dontClearOnFrameStart = true;
    }
  },
});

AFRAME.registerComponent("copycanvas", {
  tick: function (time, timeDelta) {
    unityCanvas.width = this.el.canvas.width;
    unityCanvas.height = this.el.canvas.height;
  },
});

var buildUrl = "Build";
var loaderUrl = buildUrl + "/55b027cfe78bae9b0fbebad0d7c12abd.js";
var config = {
  dataUrl: buildUrl + "/e5f2691ada67707620e6c5126c343109.data",
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
    })
    .catch((message) => {
      alert(message);
    });
};

document.body.appendChild(script);
