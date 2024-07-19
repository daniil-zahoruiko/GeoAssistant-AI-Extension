var pov;
var first_pov = false;

function handlePositionChanged(panorama) {
    clearBoundingBoxes();
}

function clearBoundingBoxes() {
    document.querySelectorAll('[class*="boundingBox"]').forEach(el => el.remove());
}

function handlePovChanged(panorama) {
    if(!first_pov) {
        first_pov = true;
    }
    else if(pov.heading !== panorama.getPov().heading || pov.pitch !== panorama.getPov().pitch) {
        window.dispatchEvent(new CustomEvent('POVchanged', {detail: panorama.getPov()}));
    }
    pov = panorama.getPov();
}

window.addEventListener('fetchOriginPOV', (e) => {
    var streetViewService = new google.maps.StreetViewService();
    streetViewService.getPanorama({pano: e.detail}, function(data, status) {
        window.dispatchEvent(new CustomEvent('sendOriginPOV', {detail: data.tiles}));
    })
});

function initStreetView() {
    google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
        constructor(...args) {
            super(...args);

            initOverlay(this);
            this.addListener('position_changed', () => handlePositionChanged(this));
            this.addListener('pov_changed', () => handlePovChanged(this));
        }
    }
}

function initOverlay(map) {
    class SpherePoint {
        // we only have theta and phi here since r can be calculated as focal length, and in most cases we just need theta and phi
        constructor(theta, phi) {
            this.theta = theta;
            this.phi = phi;
        }
    }

    // TODO: change all uses of theta and phi to use the SpherePoint class (that is, get rid of all topleftTheta and topleftPhi and start using topleft.Theta and topleft.Phi)
    class BoundingBoxOverlay extends google.maps.OverlayView{
        topleft;
        topright;
        bottomleft;
        bottomright;
        canvasWidth;
        canvasHeight;
        cls;
        div;

        constructor(topleftx, toplefty, bottomrightx, bottomrighty, heading, pitch, cls) {
            super();
            this.cls = cls;
            this.refreshCanvasSize();

            this.topleft = this.pointToSphere(topleftx, toplefty, heading, pitch);
            this.topright = this.pointToSphere(bottomrightx, toplefty, heading, pitch);
            this.bottomright = this.pointToSphere(bottomrightx, bottomrighty, heading, pitch);
            this.bottomleft = this.pointToSphere(topleftx, bottomrighty, heading, pitch);

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
            const screenTopleft = this.pointToSphere(0, 0, currentPov.heading, currentPov.pitch);
            const screenTopright = this.pointToSphere(this.canvasWidth, 0, currentPov.heading, currentPov.pitch);
            const screenBottomleft = this.pointToSphere(0, this.canvasHeight, currentPov.heading, currentPov.pitch);
            const screenBottomright = this.pointToSphere(this.canvasWidth, this.canvasHeight, currentPov.heading, currentPov.pitch);

            if(screenTopleft.phi > screenTopright.phi || screenTopleft.phi > screenBottomright.phi) {
                screenTopleft.phi -= 2 * Math.PI;
            }
            if(screenBottomleft.phi > screenTopright.phi || screenBottomleft.phi > screenBottomright.phi) {
                screenBottomleft.phi -= 2 * Math.PI;
            }

            const screenCoords = [screenTopleft, screenTopright, screenBottomright, screenBottomleft];
            for(let i = 0; i < this.coords.length; i++) {
                let inside = false;
 
                let p1 = screenCoords[0];
                let p2;
                const theta = this.coords[i].theta;
                const phi = this.coords[i].phi;
                for(let j = 1; j <= screenCoords.length; j++) {
                    p2 = screenCoords[j % screenCoords.length];

                    if(theta > Math.min(p1.theta, p2.theta)) {
                        if(theta <= Math.max(p1.theta, p2.theta)) {
                            if(phi <= Math.max(p1.phi, p2.phi)) {
                                const phi_intersection = ((theta - p1.theta) * (p2.phi - p1.phi)) / (p2.theta - p1.theta) + p1.phi;
                                console.log(phi_intersection);
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

            const topleftCoords = this.getPointOnScreen(this.topleft.theta, this.topleft.phi, currentPov.heading, currentPov.pitch);
            const toprightCoords = this.getPointOnScreen(this.topright.theta, this.topright.phi, currentPov.heading, currentPov.pitch);
            const bottomrightCoords = this.getPointOnScreen(this.bottomright.theta, this.bottomright.phi, currentPov.heading, currentPov.pitch);
            const bottomleftCoords = this.getPointOnScreen(this.bottomleft.theta, this.bottomleft.phi, currentPov.heading, currentPov.pitch);
            
            const xCoords = [topleftCoords.x, toprightCoords.x, bottomleftCoords.x, bottomrightCoords.x];
            const yCoords = [topleftCoords.y, toprightCoords.y, bottomleftCoords.y, bottomrightCoords.y];
            
            // console.log(xCoords);
            // console.log(yCoords);

            xCoords.sort((x, y) => x - y);
            yCoords.sort((x, y) => x - y);

            // this needs to be adjusted, there's probably a couple of cases that we need to consider
            return {
                left: xCoords[0],
                top: (yCoords[0] + yCoords[1]) / 2,
                width: (xCoords[3] + xCoords[2]) / 1.5 - (xCoords[0] + xCoords[1]) / 1.5,
                height: yCoords[3] - yCoords[0]
            }
        }

        getPointOnScreen(theta, phi, heading, pitch) {
            heading = this.toRadian(heading);
            pitch = this.toRadian(90 - pitch);
            phi = (phi - heading + 2 * Math.PI) % (2 * Math.PI);
            const z = (this.canvasWidth / 2) / Math.tan(this.toRadian(127) / 2);

            const reversePitchCoords = this.sphericalRotateX(theta, phi, -pitch);
            const len = Math.sqrt(Math.pow(z / Math.cos(reversePitchCoords.theta), 2) - z * z);

            return {
                x: Math.cos(reversePitchCoords.phi) * len + this.canvasWidth / 2, 
                y: this.canvasHeight / 2 - Math.sin(reversePitchCoords.phi) * len 
            };
        }

        pointToSphere(x, y, heading, pitch) {
            x -= this.canvasWidth / 2;
            y = this.canvasHeight / 2 - y;
            heading = this.toRadian(heading);
            pitch = this.toRadian(90 - pitch);

            // focal length
            const z = (this.canvasWidth / 2) / Math.tan(this.toRadian(127) / 2);

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

        toRadian(degree) {
            return degree * Math.PI / 180;
        }

        refreshCanvasSize() {
            const canvas = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__canvas")[0];
            this.canvasWidth = canvas.offsetWidth;
            this.canvasHeight = canvas.offsetHeight;
        }
    }

    window.addEventListener('addBoundingBoxes', (e) => {
        const boundingBoxesData = e.detail;
        const pov = boundingBoxesData.pov;
        if(boundingBoxesData.pano != map.getPano()) {
            return;
        }
        for(let i = 0; i < boundingBoxesData.boundingBoxes.length; i++) {
            const boundingBox = boundingBoxesData.boundingBoxes[i];
            const overlay = new BoundingBoxOverlay(boundingBox.coords[0], boundingBox.coords[1], boundingBox.coords[2], boundingBox.coords[3], pov.heading, pov.pitch, boundingBox.cls);
            overlay.setMap(map);
        }
    });
}

(function () {
    new MutationObserver(function() {
        let script = document.querySelector("[src*='maps.googleapis.com/maps/api']");

        if (script) {
            this.disconnect();
            script.onload = () => initStreetView();
        }
    }).observe(document.head, {childList: true, subtree: true});
})();