
import { OBJLoader } from "./js/OBJLoader.js";
import { OrbitControls } from "./js/OrbitControls.js";


import "./js/hammer.min.js"



var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer({ alpha: true });
var animationId, object, KeyboardListeners, HammerManager;


export function destroyAirplane() {
    if (!HammerManager || !KeyboardListeners) {
        throw ("Cannot Destroy an Airplane that wasn't initialized...")
    }
    //unclip the evt handlers.
    HammerManager.destroy();
    document.removeEventListener("keydown", KeyboardListeners)
    scene.remove(object);
    renderer = null;
    scene = null;
    object = null;
    cancelAnimationFrame(animationId);

}

export function initAirplane(evtHandlers, enableOrbitControls) {


    // texture

    var textureLoader = new THREE.TextureLoader(manager);

    var texture = textureLoader.load("textures/metal.jpg");
    const material = new THREE.MeshPhongMaterial({
        color: "lightgray",
        opacity: 1,
    });

    let initCameraPosition = {
        x: -0.33941374935705737,
        y: -36.99514020673159,
        z: 26.671289662114987
    }

    function loadModel() {
        object.traverse(function (child) {
            if (child.isMesh) {
                child.material = material;
                child.material.side = material;
            }
        });

        console.log("Loaded Model!!");
        scene.add(object);
    }

    var manager = new THREE.LoadingManager(loadModel);

    manager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };

    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log(
                "model " + Math.round(percentComplete, 2) + "% downloaded"
            );
        }
    }

    function onError() { }

    var loader = new OBJLoader(manager);

    loader.load(
        "airplane.obj",
        function (obj) {
            //obj.rotation.y = (Math.PI / 2)*2;
            obj.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI);
            obj.scale.set(0.1, 0.1, 0.1);
            object = obj;
        },
        onProgress,
        onError
    );

    let airplane = document.getElementById("airplane");
    let { width, height } = airplane.getBoundingClientRect();
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    let camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);

    camera.position.set(
        initCameraPosition.x, initCameraPosition.y, initCameraPosition.z
    );

    camera.up.set(0, 1, 0);
    handleCameraKeyControls(initCameraPosition, camera, evtHandlers);
    handleCameraSwipeControls(airplane, initCameraPosition, camera, evtHandlers);


    if (enableOrbitControls) {
        var controls = new OrbitControls(camera, renderer.domElement);
        OrbitControls.enabled = false;
        controls.update();
    }



    airplane.appendChild(renderer.domElement);

    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
    scene.add(ambientLight);

    var pointLight = new THREE.PointLight(0xffffff, 0.8);
    camera.add(pointLight);
    scene.add(camera);

    //scene.add(cube);

    var animate = function () {
        animationId = requestAnimationFrame(animate);
        let bearingMultiplier = Math.abs(initCameraPosition.x - camera.position.x)
        camera.lookAt(scene.position);




        renderer.render(scene, camera);
    };

    animate();
}


function handleCameraKeyControls(initCameraPosition, camera, evtHandlers) {


    KeyboardListeners = function (e) {
        switch (e.keyCode) {
            case 32:
                //space
                handleFlightMovement("pause", initCameraPosition, camera, evtHandlers)
                break;
            case 37:
                //left
                handleFlightMovement("left", initCameraPosition, camera, evtHandlers)
                break;
            case 38:
                // up moves closer to ground
                handleFlightMovement("up", initCameraPosition, camera, evtHandlers)
                break;
            case 39:
                // right
                handleFlightMovement("right", initCameraPosition, camera, evtHandlers)
                break;
            case 40:
                //down
                handleFlightMovement("down", initCameraPosition, camera, evtHandlers)
                break;

        }
    };

    document.onkeydown = KeyboardListeners;
}


function handleCameraSwipeControls(element, initCameraPosition, camera, evtHandlers) {
    HammerManager = new Hammer(element);
    HammerManager.on('pan', function (ev) {
        switch (ev.additionalEvent) {
            case 'panleft':
                handleFlightMovement("left", initCameraPosition, camera, evtHandlers)
                break;
            case 'panright':
                handleFlightMovement("right", initCameraPosition, camera, evtHandlers)
                break;
            case 'panup':
                handleFlightMovement("up", initCameraPosition, camera, evtHandlers)
                break;
            case 'pandown':
                handleFlightMovement("down", initCameraPosition, camera, evtHandlers)
                break;
        }
    });

    HammerManager.on('press', function (ev) {
        handleFlightMovement("pause", initCameraPosition, camera, evtHandlers)
    });
}


function handleFlightMovement(direction, initCameraPosition, camera, evtHandlers) {
    let { onPlaneTurn, onSpeedChange, onPlanePause } = evtHandlers;
    switch (direction) {
        case 'left':
            // left
            if (camera.position.x <= initCameraPosition.x + 16) {
                camera.position.x += 8;
                onPlaneTurn(isLevelFlight(camera, initCameraPosition), calculateDegreesToTurn(camera, initCameraPosition));
            }
            break;
        case 'right':
            if (camera.position.x >= initCameraPosition.x - 16) {
                camera.position.x -= 8;
                onPlaneTurn(isLevelFlight(camera, initCameraPosition), calculateDegreesToTurn(camera, initCameraPosition));
            }
            break;
        case 'up':
            if (camera.position.y >= initCameraPosition.y - 10 - 1) {
                camera.position.y -= 1;
                onSpeedChange("up")
            }
            break;
        case 'down':
            // down moves closer to user
            if (camera.position.y <= initCameraPosition.y + 10 + 1) {
                camera.position.y += 1;
                onSpeedChange("down")
            }
            break;
        case 'pause':
            onPlanePause();
            break;
    }

}


function isLevelFlight(camera, initCameraPosition) {
    return Math.abs(camera.position.x - initCameraPosition.x) < 1.5;
}


function calculateDegreesToTurn(camera, initCameraPosition) {
    let bearingMultiplier = initCameraPosition.x - camera.position.x;
    return bearingMultiplier * 1.2;
}

