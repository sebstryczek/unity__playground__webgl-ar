const unityInstance = UnityLoader.instantiate("unityContainer", "Build/web.json");

let isCameraReady = false;
let isCopyTransformARReady = false;
let isTouchListenerReady = false;
let gl = null;
let unityCanvas = null;
let frameDrawer = null;
let xrSession = null;
let xrRefSpace = null;
let xrViewerSpace = null
let xrHitTestSource = null
let isValidHitTest = false
let hitTestPosition = null

function cameraReady(){
    isCameraReady = true;
}

function dcopyARTransformReady(){
    isCopyTransformARReady = true;
}

function touchListenerReady(){
    isTouchListenerReady = true
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

function initUnity(){
    gl = unityInstance.Module.ctx;
    unityCanvas = unityInstance.Module.canvas;
    unityCanvas.width = document.documentElement.clientWidth;
    unityCanvas.height = document.documentElement.clientHeight;

    unityInstance.Module.InternalBrowser.requestAnimationFrame = frameInject;
    document.addEventListener('toggleAR', onButtonClicked, false);
    setupObject();
}


function setupObject(){
    let position = new THREE.Vector3(0, 0, -1.5);
    let rotation = new THREE.Quaternion(0, 0, 0, 0);
    let scale = new THREE.Vector3(.5, .5, .5);

    position = vec3ToUnity(position);
    rotation = quaternionToUnity(rotation);

    const serializedInfos = `aaa,false,${position.toArray()},${rotation.toArray()},${scale.toArray()}`;
    unityInstance.SendMessage("CopyARTransform", "transofrmInfos", serializedInfos);
}

function onButtonClicked(){
    if(!xrSession){
        navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['local-floor', 'hit-test'] 
        }).then(onSessionStarted, onRequestSessionError);
    }else{
        xrSession.end();
    }
}

function onSessionStarted(session) {
    xrSession = session;

    session.addEventListener('end', onSessionEnded);
    session.addEventListener('select', onSelect);

    let glLayer = new XRWebGLLayer(session, gl);
    session.updateRenderState({ baseLayer: glLayer });

    unityInstance.Module.canvas.width = glLayer.framebufferWidth;
    unityInstance.Module.canvas.height = glLayer.framebufferHeight;

    session.requestReferenceSpace('viewer').then((refSpace) => {
        xrViewerSpace = refSpace;
        // session.requestHitTestSource({ space: xrViewerSpace }).then((hitTestSource) => {
        //     xrHitTestSource = hitTestSource;
        // });
        session.requestHitTestSourceForTransientInput({ profile:'generic-touchscreen'}).then((hitTestSource) => {
            xrTransientInputHitTestSource = hitTestSource;
        });
    });

    session.requestReferenceSpace('local').then((refSpace) => {
        xrRefSpace = refSpace;
        unityInstance.Module.InternalBrowser.requestAnimationFrame(frameDrawer);
    });

}

function frameInject(raf){
    if (!frameDrawer){
          frameDrawer = raf;
        }
    if(xrSession){
      return xrSession.requestAnimationFrame((time, xrFrame) => {
              onXRFrame(xrFrame);
              raf(time);
            });
    }
}

function onSelect(event){
    if(isValidHitTest){
        const serializedPos = `${[hitTestPosition.x, hitTestPosition.y, hitTestPosition.z]}`
        unityInstance.SendMessage("HitListener", "setHit", serializedPos);
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
    isValidHitTest = false

     if (pose) {

        for (let xrView of pose.views) {
            let viewport = glLayer.getViewport(xrView);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);


            let projection = new THREE.Matrix4();
            projection.set(...xrView.projectionMatrix);
            projection.transpose();

            const serializedProj = `${[...projection.toArray()]}`;
            unityInstance.SendMessage("CameraMain", "setProjection", serializedProj);

            let position = xrView.transform.position;
            let orientation = xrView.transform.orientation;

            let pos = new THREE.Vector3(position.x, position.y, position.z);
            let rot = new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);

            pos = vec3ToUnity(pos);
            rot = quaternionToUnity(rot);

            const serializedPos = `${[pos.x, pos.y, pos.z]}`
            const serializedRot = `${[rot.x, rot.y, rot.z, rot.w]}`
            unityInstance.SendMessage("CameraMain", "setPosition", serializedPos);
            unityInstance.SendMessage("CameraMain", "setRotation", serializedRot);

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
        
        if(xrTransientInputHitTestSource){
          
            let hitTestResults = frame.getHitTestResultsForTransientInput(xrTransientInputHitTestSource);
            if (hitTestResults.length > 0) {
                let p = hitTestResults[0].results[0]
                if(p != null){
                    let newPose = p.getPose(xrRefSpace);
                    let position = newPose.transform.position;
                    let pos = new THREE.Vector3(position.x, position.y, position.z);
                    pos = vec3ToUnity(pos);
                    isValidHitTest = true
                    hitTestPosition = pos
                }
            }
        }
        
    }
}

function onRequestSessionError(ex) {
    alert("Failed to start immersive AR session.");
    console.error(ex.message);
}

function onEndSession(session) {
    xrHitTestSource.cancel();
    xrHitTestSource = null;
    session.end();
}

function onSessionEnded(event) {
    xrSession = null;
    gl = null;
}

document.addEventListener('UnityLoaded', initUnity, false);
