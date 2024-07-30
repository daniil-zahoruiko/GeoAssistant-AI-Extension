const _360ScanPovs = [
    { heading: 0, pitch: -89, zoom: 0},
    { heading: 0, pitch: 0, zoom: 0},
    { heading: 120, pitch: 0, zoom: 0},
    { heading: 240, pitch: 0, zoom: 0}
];

class BoundingBoxOverlay {}

HTMLCanvasElement.prototype.getContext = function(origFn) {
    return function(type, attribs) {
      attribs = attribs || {};
      attribs.preserveDrawingBuffer = true;
      return origFn.call(this, type, attribs);
    };
}(HTMLCanvasElement.prototype.getContext);

function handlePanoChanged(panorama) {
    clearBoundingBoxes();
}

function clearBoundingBoxes() {
    document.querySelectorAll('[class*="boundingBox"]').forEach(el => el.remove());
}

async function updateAllBoundingBoxes()
{
    UIManager.disable();
    const data = await HiddenPanoramaManager.getEntireImageData();
    if(data !== null) {
        console.log(data);
        fetch("http://127.0.0.1:5000/update", {
            method: "POST",
            mode: "cors",
            body: data
        }).then(data => data.json())
        .then((povScans) => {
            console.log(povScans)
            for(let i = 0; i < povScans.length; i++) {
                povScans[i].forEach(boundingBox => {
                    const overlay = new BoundingBoxOverlay(boundingBox.coords[0], boundingBox.coords[1], boundingBox.coords[2], boundingBox.coords[3], _360ScanPovs[i].heading, _360ScanPovs[i].pitch, _360ScanPovs[i].zoom, boundingBox.cls);
                    overlay.setMap(ActivePanoramaManager.getPanorama());
                });
            }
            UIManager.enable();
        });
    }
}

async function updateCurrentBoundingBoxes() {
    UIManager.disable();
    const data = await HiddenPanoramaManager.getCurrentImageData();

    if(data !== null) {
        console.log(data);
        await fetch("http://127.0.0.1:5000/update", {
            method: "POST",
            mode: "cors",
            body: data
        }).then(data => data.json())
        .then((boundingBoxes) => {
            const pov = HiddenPanoramaManager.getPanorama().getPov();
            boundingBoxes[0].forEach(boundingBox => {
                console.log(window.BoundingBoxOverlay);
                const overlay = new BoundingBoxOverlay(boundingBox.coords[0], boundingBox.coords[1], boundingBox.coords[2], boundingBox.coords[3], pov.heading, pov.pitch, pov.zoom, boundingBox.cls);
                overlay.setMap(ActivePanoramaManager.getPanorama());
            });
            UIManager.enable();
            return Promise.resolve();
        });
    }
}

function initStreetView() {
    google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
        constructor(...args) {
            super(...args);

            ActivePanoramaManager.initialize(this);

            this.addListener('pano_changed', () => handlePanoChanged(this));
        }
    }
}

function initOverlay() {
    class SpherePoint {
        // we only have theta and phi here since r can be calculated as focal length, and in most cases we just need theta and phi
        constructor(theta, phi) {
            this.theta = theta;
            this.phi = phi;
        }
    }

    BoundingBoxOverlay = class extends google.maps.OverlayView{
        topleft;
        topright;
        bottomleft;
        bottomright;
        canvasWidth;
        canvasHeight;
        cls;
        div;
        contSVG;

        constructor(topleftx, toplefty, bottomrightx, bottomrighty, heading, pitch, zoom, cls) {
            super();
            this.cls = cls;
            this.refreshCanvasSize();

            const hiddenCanvasSize = HiddenPanoramaManager.getCanvasSize()
            this.topleft = this.pointToSphere(topleftx, toplefty, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);
            this.topright = this.pointToSphere(bottomrightx, toplefty, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);
            this.bottomright = this.pointToSphere(bottomrightx, bottomrighty, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);
            this.bottomleft = this.pointToSphere(topleftx, bottomrighty, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);

            this.coords = [this.topleft, this.topright, this.bottomright, this.bottomleft];
        }

        onAdd() {
            // possibly make this limit dependent on the width of the rectnagle
            const limit = 0.2

            const className = `boundingBox${this.cls}`;
            const boundingBoxes = document.getElementsByClassName(className);
            for(let i = 0; i < boundingBoxes.length; i++) {
                let maxThetaDiff = 0, maxPhiDiff = 0;
                maxThetaDiff = Math.max(maxThetaDiff, Math.abs(boundingBoxes[i].dataset.topleftTheta - this.topleft.theta));
                maxThetaDiff = Math.max(maxThetaDiff, Math.abs(boundingBoxes[i].dataset.toprightTheta - this.topright.theta));
                maxThetaDiff = Math.max(maxThetaDiff, Math.abs(boundingBoxes[i].dataset.bottomleftTheta - this.bottomleft.theta));
                maxThetaDiff = Math.max(maxThetaDiff, Math.abs(boundingBoxes[i].dataset.bottomrightTheta - this.bottomright.theta));

                maxPhiDiff = Math.max(maxPhiDiff, Math.abs(boundingBoxes[i].dataset.topleftPhi - this.topleft.phi));
                maxPhiDiff = Math.max(maxPhiDiff, Math.abs(boundingBoxes[i].dataset.toprightPhi - this.topright.phi));
                maxPhiDiff = Math.max(maxPhiDiff, Math.abs(boundingBoxes[i].dataset.bottomleftPhi - this.bottomleft.phi));
                maxPhiDiff = Math.max(maxPhiDiff, Math.abs(boundingBoxes[i].dataset.bottomrightPhi - this.bottomright.phi));

                if(maxThetaDiff <= limit && maxPhiDiff <= limit) {
                    delete this;
                    return;
                }  
                else {
                    console.log(maxThetaDiff);
                    console.log(maxPhiDiff);
                }
            }

            this.div = document.createElement('div');
            this.div.classList.add(className);
            this.div.style.borderStyle = "solid";
            this.div.style.borderColor = "red";
            this.div.style.borderWidth = "3px";
            this.div.style.position = "absolute";

            this.div.dataset.topleftTheta = this.topleft.theta;
            this.div.dataset.topleftPhi = this.topleft.phi;
            this.div.dataset.toprightTheta = this.topright.theta;
            this.div.dataset.toprightPhi = this.topright.phi;
            this.div.dataset.bottomleftTheta = this.bottomleft.theta;
            this.div.dataset.bottomleftPhi = this.bottomleft.phi;
            this.div.dataset.bottomrightTheta = this.bottomright.theta;
            this.div.dataset.bottomrightPhi = this.bottomright.phi;


            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            //svg.setAttribute("width", this.div.style.width);
            //svg.setAttribute("height", this.div.style.height);

            // Create a circle element
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "50%");
            circle.setAttribute("cy", "50%");
            circle.setAttribute("r", "10");
            circle.setAttribute("stroke", "black");
            circle.setAttribute("stroke-width", "2");
            circle.setAttribute("fill", "red");

            // Append the circle to the SVG
            svg.appendChild(circle);

            this.div.appendChild(svg);

            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.div);
        }

        draw() {
            // calculate new position according to current pitch and heading
            this.refreshCanvasSize();
            if (this.div) {
                const currentPov = this.getMap().getPov();
                if(!this.isOnScreen(currentPov)) {
                    this.div.style.visibility = 'hidden';
                    // this.contSVG.style.visibility = 'hidden';
                    return;
                }

                const newCoords = this.calculateCurrentCoords(currentPov);

                this.div.style.visibility = 'visible';
                this.div.style.left = `${newCoords.left}px`;
                this.div.style.top = `${newCoords.top}px`;
                this.div.style.width = `${newCoords.width}px`;
                this.div.style.height = `${newCoords.height}px`;
            }
        }

        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                delete this.div;
            }
        }

        isOnScreen(currentPov) {
            const screenTopleft = this.pointToSphere(0, 0, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const screenTopright = this.pointToSphere(this.canvasWidth, 0, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const screenBottomleft = this.pointToSphere(0, this.canvasHeight, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const screenBottomright = this.pointToSphere(this.canvasWidth, this.canvasHeight, currentPov.heading, currentPov.pitch, currentPov.zoom);

            // Normalize the angles
            if(screenTopleft.phi > screenTopright.phi || screenTopleft.phi > screenBottomright.phi) {
                screenTopleft.phi -= 2 * Math.PI;
            }
            if(screenBottomleft.phi > screenTopright.phi || screenBottomleft.phi > screenBottomright.phi) {
                screenBottomleft.phi -= 2 * Math.PI;
            }

            const screenCoords = [screenTopleft, screenTopright, screenBottomright, screenBottomleft];

            // Without normalization
            for(let i = 0; i < this.coords.length; i++) {
                let inside = false;

                let p1 = screenCoords[0]; // Top Left coordinate
                let p2;
                const theta = this.coords[i].theta;
                const phi = this.coords[i].phi;
                for(let j = 1; j <= screenCoords.length; j++) {
                    // Get the next point in the polygon
                    p2 = screenCoords[j % screenCoords.length];

                    // Check if the point is above the minimum theta coordinate of the edge
                    if(theta > Math.min(p1.theta, p2.theta)) {
                        if(theta <= Math.max(p1.theta, p2.theta)) {
                            if(phi <= Math.max(p1.phi, p2.phi)) {
                                const phi_intersection = ((theta - p1.theta) * (p2.phi - p1.phi)) / (p2.theta - p1.theta) + p1.phi;
                                // console.log(phi_intersection);
                                // If the point is to the left of intersection, the point is inside the polygon
                                if(phi <= phi_intersection) {
                                    inside = !inside;
                                }
                            }
                        }
                    }

                    p1 = p2;
                }

                if(inside) {
                    return true;
                }
            }

            // With normalization
            for(let i = 0; i < this.coords.length; i++) {
                let inside = false;

                let p1 = screenCoords[0]; // Top Left coordinate
                let p2;
                const theta = this.coords[i].theta;
                const phi = this.coords[i].phi - 2 * Math.PI;
                for(let j = 1; j <= screenCoords.length; j++) {
                    // Get the next point in the polygon
                    p2 = screenCoords[j % screenCoords.length];

                    // Check if the point is above the minimum theta coordinate of the edge
                    if(theta > Math.min(p1.theta, p2.theta)) {
                        if(theta <= Math.max(p1.theta, p2.theta)) {
                            if(phi <= Math.max(p1.phi, p2.phi)) {
                                const phi_intersection = ((theta - p1.theta) * (p2.phi - p1.phi)) / (p2.theta - p1.theta) + p1.phi;
                                // console.log(phi_intersection);
                                // If the point is to the left of intersection, the point is inside the polygon
                                if(phi <= phi_intersection) {
                                    inside = !inside;
                                }
                            }
                        }
                    }

                    p1 = p2;
                }

                if(inside) {
                    return true;
                }
            }

            return false;
        }

        calculateCurrentCoords(currentPov) {

            const topleftCoords = this.getPointOnScreen(this.topleft.theta, this.topleft.phi, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const toprightCoords = this.getPointOnScreen(this.topright.theta, this.topright.phi, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const bottomrightCoords = this.getPointOnScreen(this.bottomright.theta, this.bottomright.phi, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const bottomleftCoords = this.getPointOnScreen(this.bottomleft.theta, this.bottomleft.phi, currentPov.heading, currentPov.pitch, currentPov.zoom);
            
            const xCoords = [topleftCoords.x, toprightCoords.x, bottomleftCoords.x, bottomrightCoords.x];
            const yCoords = [topleftCoords.y, toprightCoords.y, bottomleftCoords.y, bottomrightCoords.y];
            
            // console.log(xCoords);
            // console.log(yCoords);

            xCoords.sort((x, y) => x - y);
            yCoords.sort((x, y) => x - y);

            // this needs to be adjusted, there's probably a couple of cases that we need to consider
            return {
                left: xCoords[0],
                top: yCoords[0],
                width: xCoords[3] - xCoords[0],
                height: yCoords[3] - yCoords[0]
            }
        }

        // Convert spherical coordinates to screen coordinates
        getPointOnScreen(theta, phi, heading, pitch, zoom) {
            heading = this.toRadian(heading);
            pitch = this.toRadian(90 - pitch);
            phi = (phi - heading + 2 * Math.PI) % (2 * Math.PI);
            const z = (this.canvasWidth / 2) / Math.tan(Math.atan(Math.pow(2,1-zoom)));

            const reversePitchCoords = this.sphericalRotateX(theta, phi, -pitch);
            const len = Math.sqrt(Math.pow(z / Math.cos(reversePitchCoords.theta), 2) - z * z);

            return {
                x: Math.cos(reversePitchCoords.phi) * len + this.canvasWidth / 2, 
                y: this.canvasHeight / 2 - Math.sin(reversePitchCoords.phi) * len 
            };
        }

        // Convert screen coordinates to spherical coordinates
        pointToSphere(x, y, heading, pitch, zoom, width, height) {
            if(!width) {
                width = this.canvasWidth;
            }
            if(!height) {
                height = this.canvasHeight;
            }
            x -= width / 2;
            y = height / 2 - y;
            heading = this.toRadian(heading);
            pitch = this.toRadian(90 - pitch);

            // focal length
            const z = (width / 2) / Math.tan(Math.atan(Math.pow(2,1-zoom)));

            // angle offset within the viewport
            let theta = Math.acos(z / Math.sqrt(x * x + y * y + z * z));
            let phi = Math.atan2(y, x);

            // add pitch and heading to the angles
            const appliedPitchCoords = this.sphericalRotateX(theta, phi, pitch);
            theta = appliedPitchCoords.theta;
            phi = (appliedPitchCoords.phi + heading + 2 * Math.PI) % (2 * Math.PI);

            return new SpherePoint(theta, phi);
        }

        sphericalRotateX(theta, phi, alpha) {
            return new SpherePoint(
                Math.acos(Math.sin(theta) * Math.sin(phi) * Math.sin(alpha) + Math.cos(theta) * Math.cos(alpha)),
                Math.atan2(Math.sin(theta) * Math.sin(phi) * Math.cos(alpha) - Math.cos(theta) * Math.sin(alpha), Math.sin(theta) * Math.cos(phi))
            );
        }

        // Convert degrees to radians
        toRadian(degree) {
            return degree * Math.PI / 180;
        }

        refreshCanvasSize() {
            const canvas = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__canvas")[0];
            this.canvasWidth = canvas.offsetWidth;
            this.canvasHeight = canvas.offsetHeight;
        }
    }
}

const ActivePanoramaManager = (function() {
    let panorama = null;

    return {
        initialize: function(p) {
            panorama = p;
        },

        getPanorama: function() {
            return panorama;
        }
    }
})();

const HiddenPanoramaManager = (function() {
    let panorama = null;
    let panoramaContainer = null;

    function dataURLtoBlob(dataURL) {
        let array, binary, i, len;
        binary = atob(dataURL.split(',')[1]);
        array = [];
        i = 0;
        len = binary.length;
        while (i < len) {
            array.push(binary.charCodeAt(i));
            i++;
        }
        return new Blob([new Uint8Array(array)], {
            type: 'image/png'
        });
    }

    function getCanvasElement() {
        if(panoramaContainer) {
            return panoramaContainer.querySelectorAll('.mapsConsumerUiSceneCoreScene__canvas')[0];
        }
    }

    async function synchronizeWithActivePano() {
        const activePano = ActivePanoramaManager.getPanorama().getPano();
        if(activePano && panorama.getPano() !== activePano) {
            panorama.setPano(activePano);
            // wait for the new location to load
            await new Promise(r => setTimeout(r, 500));
        }
    }

    async function setPovDelayed(pov) {
        panorama.setPov(pov);
        // this is to make sure the pov actually updates
        await new Promise(r => setTimeout(r, 500));
    }

    return {
        initialize: function() {
            if (panoramaContainer) {
                panoramaContainer.style.display = 'block';
                return;
            }
            const copyDiv = document.createElement('div');
            copyDiv.id = 'copyDiv';
            copyDiv.style.position = 'absolute';
            copyDiv.style.top = '0px';
            copyDiv.style.width = '1920px';
            copyDiv.style.height = '960px';
            copyDiv.style.zIndex = '-10';
            document.body.appendChild(copyDiv);

            panoramaContainer = copyDiv;
        },

        initPanorama: function() {
            panorama = new google.maps.StreetViewPanorama(document.getElementById('copyDiv'), {
                 showRoadLabels: false
            });
        },

        getCanvasElement: function() {
            return getCanvasElement();
        },
        
        getCanvasSize: function() {
            const canvas = getCanvasElement();

            return { width: canvas.offsetWidth, height: canvas.offsetHeight };
        },
        
        getPanorama: function() {
            return panorama;
        },

        getEntireImageData: async function() {
            await synchronizeWithActivePano();

            const canvas = getCanvasElement();
            if(canvas) {
                const imageData = new FormData();
                for(let i = 0; i < _360ScanPovs.length; i++) {
                    await setPovDelayed(_360ScanPovs[i]);
                    const dataUrl = await canvas.toDataURL();
                    imageData.append('data' + i, dataURLtoBlob(dataUrl));
                };
                return imageData;
            }
            return null;
        },

        getCurrentImageData: async function() {
            await synchronizeWithActivePano();
            await setPovDelayed(ActivePanoramaManager.getPanorama().getPov());

            const canvas = getCanvasElement();
            if(canvas) {
                const result = new FormData();
                const dataUrl = await canvas.toDataURL();
                result.append('data', dataURLtoBlob(dataUrl));

                return result;
            }

            return null;
        },

        remove: function() {
            if (panoramaContainer) {
                panoramaContainer.style.display = 'none';
            }
        }
    }
})();


let logo = null;

// Listen for the SVG content
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SEND_SVG') {
        logo = document.createElement('div');
        logo.innerHTML = event.data.svgContent;
    }
});

const UIManager = (function() {
    let toggleWrapper = null;

    function createLogo() {
        return logo;
    }

    function mouseOutEffect(e) {
        e.target.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
    }

    function mouseOverEffect(e) {
        e.target.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 1)";
    }

    function create360Button()
    {
        // Create a 360 button
        const scan360Button = document.createElement('button');
        scan360Button.innerText = 'Scan 360°';
        scan360Button.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
        scan360Button.style.color = "white";
        scan360Button.style.borderRadius = "1rem";
        scan360Button.style.padding = "1rem 2rem";
        scan360Button.style.transition = "background 0.3s";

        scan360Button.addEventListener('click', () => {
            updateAllBoundingBoxes();
        });

        scan360Button.addEventListener('mouseover', mouseOverEffect);

        scan360Button.addEventListener('mouseout', mouseOutEffect);

        return scan360Button
    }

    function createCurrentPOVButton()
    {
        // Create a current pov button
        const currentPOVButton = document.createElement('button');
        currentPOVButton.innerText = 'Scan visible area';
        currentPOVButton.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
        currentPOVButton.style.color = "white";
        currentPOVButton.style.borderRadius = "1rem";
        currentPOVButton.style.padding = "1rem 2rem";
        currentPOVButton.style.transition = "background 0.3s";

        currentPOVButton.addEventListener('click', () => {
            updateCurrentBoundingBoxes();
        });

        currentPOVButton.addEventListener('mouseover', mouseOverEffect);

        currentPOVButton.addEventListener('mouseout', mouseOutEffect);

        return currentPOVButton;
    }

    return {
        initUI: function() {

            const scan360Button = create360Button();
            const currentPOVButton = createCurrentPOVButton();
            const logo = createLogo();

            toggleWrapper = document.createElement('div');
            toggleWrapper.style.position = 'absolute';
            toggleWrapper.style.bottom = '17rem';
            toggleWrapper.style.left = '1.5rem';
            toggleWrapper.style.zIndex = '10';
            toggleWrapper.style.display = 'flex';
            toggleWrapper.style.flexDirection = 'column';
            toggleWrapper.style.gap = '1rem';
            toggleWrapper.style.visibility = 'hidden';

            toggleWrapper.appendChild(logo);
            toggleWrapper.appendChild(scan360Button);
            toggleWrapper.appendChild(currentPOVButton);

            document.body.appendChild(toggleWrapper);
        },

        displayToggles: function() {
            toggleWrapper.style.visibility = 'visible';
        },

        hideToggles: function() {
            toggleWrapper.style.visibility = 'hidden';
        },

        remove: function(){
            if (toggleWrapper) {
                toggleWrapper.remove();
            }
        },

        disable: function() {
            if (!toggleWrapper) return;
            [...toggleWrapper.getElementsByTagName('button')].forEach(button => {
                button.disabled = "disabled";
                button.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 1)";
                button.removeEventListener('mouseout', mouseOutEffect);
            });
        },

        enable: function() {
            if (!toggleWrapper) return;
            [...toggleWrapper.getElementsByTagName('button')].forEach(button => {
                button.disabled = "";
                button.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
                button.addEventListener('mouseout', mouseOutEffect);
            });
        },
    }
})();

(function () {
    // Request SVG content from content_script.js
    window.postMessage({ type: 'REQUEST_SVG' }, '*');

    // Disable scrolling
    document.documentElement.style.overflow = 'hidden';
    document.body.scroll = "no";

        // Create a <link> element for the Google Font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=League+Spartan:wght@100..900&display=swap';
    link.rel = 'stylesheet';

    // Append the <link> element to the <head>
    document.head.appendChild(link);

    const gameObserver = new MutationObserver(function() {
        let panoramaScreen = document.getElementsByClassName('game_panorama__6X071');
        let loadingScreen = document.getElementsByClassName('fullscreen-spinner_root__gtDP1');
        let resultsScreen = document.getElementsByClassName('result-layout_root__fRPgH');

        if(panoramaScreen.length === 0) {
            this.disconnect();
            HiddenPanoramaManager.remove();
            UIManager.remove();
            initialisationObserver.observe(document.body, {childList: true, subtree: true});
        }
         else if (loadingScreen.length === 0 && resultsScreen.length === 0) {
            UIManager.displayToggles();
        } else if (loadingScreen.length === 1 || resultsScreen.length === 1) {
            UIManager.hideToggles();
        }
    });

    const initialisationObserver = new MutationObserver(function() {
        let script = document.querySelector("[src*='maps.googleapis.com/maps/api']");
        let panoramaScreen = document.getElementsByClassName('game_panorama__6X071');

        if (script && panoramaScreen.length === 1) {
            this.disconnect();
            HiddenPanoramaManager.initialize();
            UIManager.initUI();
            script.onload = () => {
                HiddenPanoramaManager.initPanorama();
                initStreetView();
                initOverlay();
            };
            gameObserver.observe(document.body, {childList: true, subtree: true});
        }
    });

    initialisationObserver.observe(document.head, {childList: true, subtree: true});

})();
