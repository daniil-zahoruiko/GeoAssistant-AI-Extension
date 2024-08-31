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
    document.querySelectorAll('[class*="circle"]').forEach(el => el.remove());
    document.querySelectorAll('[class*="infoWindow"]').forEach(el => el.remove());
}

//#region Listeners
window.addEventListener('imgSave', async (e) => {
    const data = await HiddenPanoramaManager.getCurrentImageData();

    await fetch("http://127.0.0.1:5000/imsave", {
        method: "POST",
        mode: "cors",
        body: data
    });
});


let preferences = { rect: true, dot: false };

window.addEventListener('preferencesLoaded', (e) => {
    preferences = e.detail;
});

window.addEventListener('preferencesChanged', (e) => {
    preferences = e.detail;
    document.querySelectorAll('[class*="boundingBox"]').forEach(el => {
        if (el.classList.contains("hidden")) {
            return;
        }
        el.style.visibility = preferences.rect ? 'visible' : 'hidden'
    });
    document.querySelectorAll('[class*="circle"]').forEach(el => {
        if (el.classList.contains("hidden")) {
            return;
        }
        el.style.visibility = preferences.dot ? 'visible' : 'hidden'});
});

let logo = document.createElement('div');

// Listen for the SVG content
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SEND_SVG') {
        logo.innerHTML = event.data.svgContent;
    }
});

//#endregion Listeners

//#region Fetch bounding boxes
async function updateAllBoundingBoxes()
{
    UIManager.disable(false);
    const pano = ActivePanoramaManager.getPanorama().getPano();
    const data = await HiddenPanoramaManager.getEntireImageData();

    if(pano !== ActivePanoramaManager.getPanorama().getPano()) {
        UIManager.enable();
        return;
    }

    if(data !== null) {
        await fetch("http://127.0.0.1:5000/update", {
            method: "POST",
            mode: "cors",
            body: data
        }).then(data => data.json())
        .then((povScans) => {
            if(pano === ActivePanoramaManager.getPanorama().getPano()) {
                for(let i = 0; i < povScans.length; i++) {
                    povScans[i].forEach(boundingBox => {
                        const overlay = new BoundingBoxOverlay( boundingBox.coords[0],
                                                                boundingBox.coords[1],
                                                                boundingBox.coords[2],
                                                                boundingBox.coords[3],
                                                                _360ScanPovs[i].heading,
                                                                _360ScanPovs[i].pitch,
                                                                _360ScanPovs[i].zoom,
                                                                boundingBox.cls,
                                                                boundingBox.name,
                                                                boundingBox.description
                                                            );
                        overlay.setMap(ActivePanoramaManager.getPanorama());
                    });
                }
            }
            UIManager.enable();
        });
    }
}

async function updateCurrentBoundingBoxes() {
    UIManager.disable(true);
    const pano = ActivePanoramaManager.getPanorama().getPano();
    const data = await HiddenPanoramaManager.getCurrentImageData();

    if(pano !== ActivePanoramaManager.getPanorama().getPano()) {
        UIManager.enable();
        return;
    }

    if(data !== null) {
        await fetch("http://127.0.0.1:5000/update", {
            method: "POST",
            mode: "cors",
            body: data
        }).then(data => data.json())
        .then((boundingBoxes) => {
            if(pano === ActivePanoramaManager.getPanorama().getPano()) {
                const pov = HiddenPanoramaManager.getPanorama().getPov();
                boundingBoxes[0].forEach(boundingBox => {
                    console.log(boundingBox);
                    const overlay = new BoundingBoxOverlay( boundingBox.coords[0],
                                                            boundingBox.coords[1],
                                                            boundingBox.coords[2],
                                                            boundingBox.coords[3],
                                                            pov.heading,
                                                            pov.pitch,
                                                            pov.zoom,
                                                            boundingBox.cls,
                                                            boundingBox.name,
                                                            boundingBox.description
                                                        );
                    overlay.setMap(ActivePanoramaManager.getPanorama());
                });
            }
            UIManager.enable();
            return Promise.resolve();
        });
    }
}

//#endregion Fetch bounding boxes

function initStreetView() {
    google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
        constructor(...args) {
            super(...args);

            ActivePanoramaManager.initialize(this);

            this.addListener('pano_changed', () => handlePanoChanged(this));
        }
    }
}

//#region BoundingBox
class BoundingBox{
    topleft;
    topright;
    bottomleft;
    bottomright;
    cls;
    name;
    description;
    circleWrapper;
    circle;
    infoWindow;
    exitSVG;
    svgNS = "http://www.w3.org/2000/svg";

    constructor(topleft, topright, bottomleft, bottomright ,cls, name, description) {
        this.cls = cls;
        this.name = name;
        this.description = description;
        this.topleft = topleft;
        this.topright = topright;
        this.bottomleft = bottomleft;
        this.bottomright = bottomright;
    }

    createRectangle() {
        const className = `boundingBox${this.cls}`;
        const primaryClassName = `primary${this.cls}`;

        this.leftSide = document.createElement('div');
        this.leftSide.classList.add(className);
        // Set left side as primary to store the coordinates of the whole bounding box
        this.leftSide.classList.add(primaryClassName)
        this.leftSide.style.position = "absolute";
        this.leftSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.leftSide.style.background = 'red';
        this.leftSide.style.width = "3px";
        // Store the coordinates in the dataset
        this.leftSide.dataset.topleftTheta = this.topleft.theta;
        this.leftSide.dataset.topleftPhi = this.topleft.phi;
        this.leftSide.dataset.toprightTheta = this.topright.theta;
        this.leftSide.dataset.toprightPhi = this.topright.phi;
        this.leftSide.dataset.bottomleftTheta = this.bottomleft.theta;
        this.leftSide.dataset.bottomleftPhi = this.bottomleft.phi;
        this.leftSide.dataset.bottomrightTheta = this.bottomright.theta;
        this.leftSide.dataset.bottomrightPhi = this.bottomright.phi;

        this.rightSide = document.createElement('div');
        this.rightSide.classList.add(className);
        this.rightSide.style.position = "absolute";
        this.rightSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.rightSide.style.background = 'red';
        this.rightSide.style.width = "3px";

        this.topSide = document.createElement('div');
        this.topSide.classList.add(className);
        this.topSide.style.position = "absolute";
        this.topSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.topSide.style.background = 'red';
        this.topSide.style.height = "3px";

        this.bottomSide = document.createElement('div');
        this.bottomSide.classList.add(className);
        this.bottomSide.style.position = "absolute";
        this.bottomSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.bottomSide.style.background = 'red';
        this.bottomSide.style.height = "3px";

        return [this.leftSide, this.rightSide, this.topSide, this.bottomSide];
    }

    createCircle() {
        const circleClassName = `circle${this.cls}`;

        this.circleWrapper = document.createElementNS(this.svgNS, "svg");
        this.circleWrapper.style.opacity = "0.7";

        // Add blur filter to a circle
        const defs = document.createElementNS(this.svgNS, "defs");
        const filter = document.createElementNS(this.svgNS, "filter");
        filter.setAttribute("id", "blur");

        const feGaussianBlur = document.createElementNS(this.svgNS, "feGaussianBlur");
        feGaussianBlur.setAttribute("in", "SourceGraphic");
        feGaussianBlur.setAttribute("stdDeviation", 1.5);

        const feComposite = document.createElementNS(this.svgNS, "feComposite");
        feComposite.setAttribute("operator", "in");
        feComposite.setAttribute("in2", "SourceGraphic");

        filter.appendChild(feGaussianBlur);
        filter.appendChild(feComposite);
        defs.appendChild(filter);

        this.circleWrapper.appendChild(defs);

        this.circleWrapper.classList.add(circleClassName);
        this.circleWrapper.style.visibility = preferences.dot ? 'visible' : 'hidden';
        this.circleWrapper.style.position = "absolute";

        // Create a circle element
        this.circle = document.createElementNS(this.svgNS, "circle");
        this.circle.setAttribute("cx", "50%");
        this.circle.setAttribute("cy", "50%");
        this.circle.setAttribute("stroke", "black");
        this.circle.setAttribute("stroke-width", "2");
        this.circle.setAttribute("fill", "red");
        this.circle.setAttribute("filter", "url(#blur)");

        this.circle.style.pointerEvents = "auto";

        // Append the circle to the SVG
        this.circleWrapper.appendChild(this.circle);

        return [this.circleWrapper, this.circle];
    }

    createInfoWindow() {
        const infoWindowClassName = `infoWindow${this.cls}`;

        this.infoWindow = document.createElement('div');
        this.infoWindow.classList.add(infoWindowClassName);
        this.infoWindow.style.position = "absolute";
        this.infoWindow.style.visibility = "hidden";
        this.infoWindow.style.background = "rgba(0, 0, 0, 0.8)";
        this.infoWindow.style.color = "white";
        this.infoWindow.style.padding = "0.5rem";
        this.infoWindow.style.borderRadius = "0.5rem";
        this.infoWindow.style.zIndex = "1000";
        this.infoWindow.style.overflow = "hidden";
        this.infoWindow.style.width = "250px";

        const name = document.createElement('h3');
        name.innerText = this.name;
        name.style.margin = "0";
        name.style.width = "90%";

        const description = document.createElement('p');
        description.innerText = this.description;
        description.style.margin = "0";
        description.style.width = "90%";

        // Create an exit button
        this.exitSVG = document.createElementNS(this.svgNS, "svg");
        this.exitSVG.style.pointerEvents = "auto";
        this.exitSVG.setAttribute("width", "1.5rem");
        this.exitSVG.setAttribute("height", "1.5rem");
        this.exitSVG.style.position = "absolute";
        this.exitSVG.style.top = "0.1rem";
        this.exitSVG.style.right = "0.5rem";
        this.exitSVG.style.cursor = "pointer";
        this.exitSVG.style.fill = "white";
        this.exitSVG.style.zIndex = "1001";

        const path = document.createElementNS(this.svgNS, "path");
        path.setAttribute("d", "M 7.71875 6.28125 L 6.28125 7.71875 L 23.5625 25 L 6.28125 42.28125 L 7.71875 43.71875 L 25 26.4375 L 42.28125 43.71875 L 43.71875 42.28125 L 26.4375 25 L 43.71875 7.71875 L 42.28125 6.28125 L 25 23.5625 Z");
        path.style.fill = "white";

        // align path in the middle
        path.setAttribute("x", "0");
        path.setAttribute("y", "0");
        path.setAttribute("transform", "scale(0.4)");

        this.exitSVG.appendChild(path);

        this.exitSVG.addEventListener('mouseenter', () => {
            path.style.fill = "red";
        });

        this.exitSVG.addEventListener('mouseleave', () => {
            path.style.fill = "white";
        });

        this.infoWindow.appendChild(name);
        this.infoWindow.appendChild(description);
        this.infoWindow.appendChild(this.exitSVG);

        return this.infoWindow;
    }

    addListeners() {
        this.leftSide.addEventListener('mouseleave', (e) => {
            if (e.clientX < this.leftSide.getBoundingClientRect().left) {
                this.infoWindow.style.visibility = "hidden";
            } else {
                this.infoWindow.style.visibility = "visible";
            }
        });


        this.rightSide.addEventListener('mouseleave', (e) => {
            if (e.clientX > this.rightSide.getBoundingClientRect().left && e.clientY > this.infoWindow.getBoundingClientRect().bottom) {
                this.infoWindow.style.visibility = "hidden";
            } else {
                this.infoWindow.style.visibility = "visible";
            }
        });

        this.topSide.addEventListener('mouseleave', (e) => {
            if (e.clientY < this.topSide.getBoundingClientRect().top) {
                this.infoWindow.style.visibility = "hidden";
            } else {
                this.infoWindow.style.visibility = "visible";
            }
        });

        this.bottomSide.addEventListener('mouseleave', (e) => {
            if (e.clientY > this.bottomSide.getBoundingClientRect().top) {
                this.infoWindow.style.visibility = "hidden";
            } else {
                this.infoWindow.style.visibility = "visible";
            }
        });

        this.circle.addEventListener('click', () => {
            if (this.infoWindow.style.visibility === "visible") {
                this.infoWindow.style.visibility = "hidden";
            } else {
                this.infoWindow.style.visibility = "visible";
            }
        });

        this.infoWindow.addEventListener('mouseleave', () => {
            this.infoWindow.style.visibility = "hidden";
        });

        this.exitSVG.addEventListener('click', () => {
            this.infoWindow.style.visibility = "hidden";
        });
    }

    paint(newCoords) {
        this.leftSide.style.left = `${newCoords.left}px`;
        this.leftSide.style.top = `${newCoords.top}px`;

        this.rightSide.style.left = `${newCoords.left + newCoords.width}px`;
        this.rightSide.style.top = `${newCoords.top}px`;

        this.topSide.style.left = `${newCoords.left}px`;
        this.topSide.style.top = `${newCoords.top}px`;

        this.bottomSide.style.left = `${newCoords.left}px`;
        this.bottomSide.style.top = `${newCoords.top + newCoords.height}px`;

        this.leftSide.style.height = `${newCoords.height}px`;
        this.rightSide.style.height = `${newCoords.height}px`;
        this.topSide.style.width = `${newCoords.width}px`;
        this.bottomSide.style.width = `${newCoords.width + 3}px`;

        this.infoWindow.style.left = `${newCoords.left + newCoords.width + 3}px`;
        this.infoWindow.style.top = `${newCoords.top}px`;


        this.circleWrapper.setAttribute("width", Math.max(newCoords.width, 15));
        this.circleWrapper.setAttribute("height", Math.max(newCoords.height, 15));

        this.circleWrapper.style.left = `${newCoords.left}px`;
        this.circleWrapper.style.top = `${newCoords.top}px`;

        this.circle.setAttribute("r", Math.max(Math.min(newCoords.width / 3, 15), 7) );
    }

    hideComponents() {
        this.leftSide.style.visibility = 'hidden';
        this.leftSide.classList.add('hidden');
        this.rightSide.style.visibility = 'hidden';
        this.rightSide.classList.add('hidden');
        this.topSide.style.visibility = 'hidden';
        this.topSide.classList.add('hidden');
        this.bottomSide.style.visibility = 'hidden';
        this.bottomSide.classList.add('hidden');
        this.circleWrapper.style.visibility = 'hidden';
        this.circleWrapper.classList.add('hidden');
        this.infoWindow.style.visibility = 'hidden';
    }

    showComponents() {
        this.leftSide.classList.remove('hidden');
        this.leftSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.rightSide.classList.remove('hidden');
        this.rightSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.topSide.classList.remove('hidden');
        this.topSide.style.visibility = preferences.rect ? 'visible' : 'hidden';
        this.bottomSide.classList.remove('hidden');
        this.bottomSide.style.visibility = preferences.rect ? 'visible' : 'hidden';

        this.circleWrapper.classList.remove('hidden');
        this.circleWrapper.style.visibility = preferences.dot ? 'visible' : 'hidden';
    }

    isReady() {
        return this.leftSide && this.rightSide && this.topSide && this.bottomSide && this.circleWrapper && this.circle && this.infoWindow;
    }
}
//#endregion BoundingBox

//#region OverlayBox
function initOverlay() {
    class CartesianPoint {
        constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }

    class Matrix3x3 {
        constructor(p1, p2, p3) {
            this.mat = [
                [p1.x, p1.y, p1.z], 
                [p2.x, p2.y, p2.z],
                [p3.x, p3.y, p3.z]
            ];
        }

        replaceRow(p, row) {
            this.mat[row] = [p.x, p.y, p.z];
        }

        determinant() {
            const m = this.mat;
            return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        }
    }

    class Triangle {
        constructor(p1, p2, p3) {
            this.p1 = p1;
            this.p2 = p2;
            this.p3 = p3;
        }

        isInTriangle(p) {
            const triangleMatrix = new Matrix3x3(this.p1, this.p2, this.p3);
            const trianglePoints = [this.p1, this.p2, this.p3];

            const dets = [];

            for(let i = 0; i < trianglePoints.length; i++) {
                triangleMatrix.replaceRow(p, i);
                dets.push(triangleMatrix.determinant());
                triangleMatrix.replaceRow(trianglePoints[i], i);
            }

            if((dets[0] >= 0 && dets[1] >= 0 && dets[2] >= 0) || (dets[0] <= 0 && dets[1] <= 0 && dets[2] <= 0)) {
                return true;
            }
            
            return false;
        }
    }

    class SpherePoint {
        // we only have theta and phi here since r can be calculated as focal length, and in most cases we just need theta and phi
        constructor(theta, phi) {
            this.theta = theta;
            this.phi = phi;
        }

        asCartesian()
        {
            // we assume r=1 here since it doesn't matter in this context
            return new CartesianPoint(Math.sin(this.theta) * Math.cos(this.phi), Math.sin(this.theta) * Math.sin(this.phi), Math.cos(this.theta));
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
        leftSide;
        rightSide;
        topSide;
        bottomSide;
        infoWindow;
        circleWrapper;
        circle;
        name;
        description;
        rect;
        boundingBox;

        constructor(topleftx, toplefty, bottomrightx, bottomrighty, heading, pitch, zoom, cls, name, description) {
            super();
            this.cls = cls;
            this.refreshCanvasSize();

            const hiddenCanvasSize = HiddenPanoramaManager.getCanvasSize();
            this.topleft = this.pointToSphere(topleftx / window.devicePixelRatio, toplefty / window.devicePixelRatio, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);
            this.topright = this.pointToSphere(bottomrightx / window.devicePixelRatio, toplefty / window.devicePixelRatio, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);
            this.bottomright = this.pointToSphere(bottomrightx / window.devicePixelRatio, bottomrighty / window.devicePixelRatio, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);
            this.bottomleft = this.pointToSphere(topleftx / window.devicePixelRatio, bottomrighty / window.devicePixelRatio, heading, pitch, zoom, hiddenCanvasSize.width, hiddenCanvasSize.height);

            this.coords = [this.topleft, this.topright, this.bottomright, this.bottomleft];

            this.name = name;
            this.description = description;
            this.boundingBox = new BoundingBox(this.topleft, this.topright, this.bottomleft, this.bottomright, cls, name, description);
        }

        onAdd() {
            // possibly make this limit dependent on the width of the rectnagle
            const limit = 0.2

            // const className = `boundingBox${this.cls}`;
            const primaryClassName = `primary${this.cls}`;
            const boundingBoxes = document.getElementsByClassName(primaryClassName);
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
            }

            [this.leftSide, this.rightSide, this.topSide, this.bottomSide] = this.boundingBox.createRectangle();
            [this.circleWrapper, this.circle] = this.boundingBox.createCircle();
            this.infoWindow = this.boundingBox.createInfoWindow();
            this.boundingBox.addListeners();

            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.leftSide);
            panes.overlayLayer.appendChild(this.rightSide);
            panes.overlayLayer.appendChild(this.topSide);
            panes.overlayLayer.appendChild(this.bottomSide);
            panes.overlayLayer.appendChild(this.circleWrapper);
            panes.overlayLayer.appendChild(this.infoWindow);
        }

        draw() {
            // calculate new position according to current pitch and heading
            this.refreshCanvasSize();
            if (this.boundingBox.isReady()) {
                const currentPov = this.getMap().getPov();
                if(!this.isOnScreen(currentPov)) {
                    this.boundingBox.hideComponents();
                    return;
                }

                const newCoords = this.calculateCurrentCoords(currentPov);

                this.boundingBox.paint(newCoords);
                this.boundingBox.showComponents();
            }
        }

        onRemove() {
            if (this.leftSide) {
                this.leftSide.parentNode.removeChild(this.leftSide);
                delete this.leftSide;
            }
            if (this.rightSide) {
                this.rightSide.parentNode.removeChild(this.rightSide);
                delete this.rightSide;
            }
            if (this.topSide) {
                this.topSide.parentNode.removeChild(this.topSide);
                delete this.topSide;
            }
            if (this.bottomSide) {
                this.bottomSide.parentNode.removeChild(this.bottomSide);
                delete this.bottomSide;
            }
            if (this.circleWrapper) {
                this.circleWrapper.parentNode.removeChild(this.circleWrapper);
                delete this.circleWrapper;
            }
            if (this.infoWindow) {
                this.infoWindow.parentNode.removeChild(this.infoWindow);
                delete this.infoWindow;
            }
        }

        isOnScreen(currentPov) {
            const screenTopleft = this.pointToSphere(0, 0, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const screenTopright = this.pointToSphere(this.canvasWidth, 0, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const screenBottomleft = this.pointToSphere(0, this.canvasHeight, currentPov.heading, currentPov.pitch, currentPov.zoom);
            const screenBottomright = this.pointToSphere(this.canvasWidth, this.canvasHeight, currentPov.heading, currentPov.pitch, currentPov.zoom);

            const screenCoords = [screenTopleft.asCartesian(), screenTopright.asCartesian(), screenBottomleft.asCartesian(), screenBottomright.asCartesian()];

            const screenCenter = this.pointToSphere(this.canvasWidth / 2, this.canvasHeight / 2, currentPov.heading, currentPov.pitch, currentPov.zoom).asCartesian();

            const triangles = [
                new Triangle(screenCoords[0], screenCoords[1], screenCoords[2]),
                new Triangle(screenCoords[0], screenCoords[1], screenCoords[3]),
                new Triangle(screenCoords[0], screenCoords[2], screenCoords[3]),
                new Triangle(screenCoords[1], screenCoords[2], screenCoords[3])
            ];

            for(let i = 0; i < this.coords.length; i++) {
                const point = this.coords[i].asCartesian();
                
                // check that the point is in the same hemisphere as the screen - if not, we can tell it's not on the screen right away
                const dotProduct = point.x * screenCenter.x + point.y * screenCenter.y + point.z * screenCenter.z;
                const magnitudeProduct = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) * Math.sqrt(screenCenter.x * screenCenter.x + screenCenter.y * screenCenter.y + screenCenter.z * screenCenter.z);
                const angle = Math.acos(dotProduct / magnitudeProduct);

                if(angle > Math.PI / 2) {
                    continue;
                }

                // check that the point is within one of the triangles formed by different combinations of screen points
                for(let j = 0; j < triangles.length; j++) {
                    if(triangles[i].isInTriangle(point)) {
                        return true;
                    }
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

            xCoords.sort((x, y) => x - y);
            yCoords.sort((x, y) => x - y);

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
            if(zoom === 0) {
                zoom = -0.005 - 0.2 * (window.devicePixelRatio - 1);
            }
            const z = (this.canvasWidth / 2) / Math.pow(2, 1 - zoom);

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
            if(zoom === 0) {
                zoom = -0.005 - 0.2 * (window.devicePixelRatio - 1);
            }
            const z = (width / 2) / Math.pow(2, 1 - zoom);

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

//#endregion OverlayBox

//#region Managers
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
            copyDiv.id = 'helper';
            copyDiv.style.position = 'absolute';
            copyDiv.style.top = '0px';
            copyDiv.style.width = '1920px';
            copyDiv.style.height = '960px';
            copyDiv.style.zIndex = '-10';
            document.body.appendChild(copyDiv);

            panoramaContainer = copyDiv;
        },

        initPanorama: function() {
            panorama = new google.maps.StreetViewPanorama(document.getElementById('helper'), {
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
                    const dataBlob = await new Promise(resolve => canvas.toBlob(resolve));
                    imageData.append('data' + i, dataBlob);
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
                const dataBlob = await new Promise(resolve => canvas.toBlob(resolve))
                result.append('data', dataBlob);

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

const UIManager = (function() {
    let toggleWrapper = null;

    const currentPovLoader = createLoader();
    currentPovLoader.style.left = "82%";
    currentPovLoader.style.top = "0.75rem";

    const scan360Loader = createLoader();
    scan360Loader.style.left = "72%";
    scan360Loader.style.top = "0.75rem";

    function createLogo() {
        return logo;
    }

    function createLoader() {
        const loader = document.createElement('div');
        loader.classList.add('geo-assistant-loader');

        return loader;
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
        const scan360Button = document.createElement('div');
        scan360Button.classList.add('button');
        scan360Button.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
        scan360Button.style.color = "white";
        scan360Button.style.borderRadius = "1rem";
        scan360Button.style.padding = "1rem 2rem";
        scan360Button.style.transition = "background 0.3s";
        scan360Button.style.cursor = "pointer";
        scan360Button.style.textAlign = "center";
        scan360Button.style.position = "relative";
        scan360Button.innerText = 'Scan 360';
        scan360Button.style.pointerEvents = "auto";
        scan360Button.style.height = "1rem";

        scan360Button.appendChild(scan360Loader);

        scan360Button.addEventListener('click', () => {
            updateAllBoundingBoxes();
        });

        scan360Button.addEventListener('mouseenter', mouseOverEffect);

        scan360Button.addEventListener('mouseleave', mouseOutEffect);

        return scan360Button
    }

    function createCurrentPOVButton()
    {
        // Create a current pov button
        const currentPOVButton = document.createElement('div');
        currentPOVButton.classList.add('button');
        currentPOVButton.innerText = 'Scan visible area';
        currentPOVButton.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
        currentPOVButton.style.color = "white";
        currentPOVButton.style.borderRadius = "1rem";
        currentPOVButton.style.padding = "1rem 2rem";
        currentPOVButton.style.transition = "background 0.3s";
        currentPOVButton.style.textAlign = "center";
        currentPOVButton.style.position = "relative";
        currentPOVButton.style.cursor = "pointer";
        currentPOVButton.style.pointerEvents = "auto";
        currentPOVButton.style.height = "1rem";

        currentPOVButton.appendChild(currentPovLoader);

        currentPOVButton.addEventListener('click', () => {
            updateCurrentBoundingBoxes();
        });

        currentPOVButton.addEventListener('mouseenter', mouseOverEffect);

        currentPOVButton.addEventListener('mouseleave', mouseOutEffect);

        return currentPOVButton;
    }

    return {
        initUI: function() {

            const scan360Button = create360Button();
            const currentPOVButton = createCurrentPOVButton();
            const logo = createLogo();

            toggleWrapper = document.createElement('div');
            toggleWrapper.style.position = 'absolute';
            toggleWrapper.style.bottom = '22rem';
            toggleWrapper.style.left = '1.5rem';
            toggleWrapper.style.zIndex = '10';
            toggleWrapper.style.display = 'flex';
            toggleWrapper.style.flexDirection = 'column';
            toggleWrapper.style.gap = '1rem';
            toggleWrapper.style.visibility = 'hidden';
            toggleWrapper.style.fontSize = '0.8rem';

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
            currentPovLoader.style.visibility = 'hidden';
            scan360Loader.style.visibility = 'hidden';
        },

        remove: function(){
            if (toggleWrapper) {
                toggleWrapper.remove();
            }
        },

        disable: function(currentPov) {
            if (currentPov) {
                currentPovLoader.style.visibility = 'visible';
            } else {
                scan360Loader.style.visibility = 'visible';
            }
            if (!toggleWrapper) return;
            [...toggleWrapper.getElementsByClassName('button')].forEach(button => {
                button.style.pointerEvents = "none";
                button.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 1)";
                button.removeEventListener('mouseleave', mouseOutEffect);
            });
        },

        enable: function() {
            currentPovLoader.style.visibility = 'hidden';
            scan360Loader.style.visibility = 'hidden';
            if (!toggleWrapper) return;
            [...toggleWrapper.getElementsByClassName('button')].forEach(button => {
                button.style.pointerEvents = "auto";
                button.style.background = "linear-gradient(180deg, rgba(161, 155, 217, 0.6) 0%, rgba(161, 155, 217, 0) 50%, rgba(161, 155, 217, 0) 50%), rgba(86, 59, 154, 0.8)";
                button.addEventListener('mouseleave', mouseOutEffect);
            });
        },
    }
})();

//#endregion Managers

//#region Injected code
(function () {
    // Request SVG content from content_script.js
    window.postMessage({ type: 'REQUEST_SVG' }, '*');
    window.postMessage({ type: 'REQUEST_PREFERENCES' }, '*');

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

//#endregion Injected code