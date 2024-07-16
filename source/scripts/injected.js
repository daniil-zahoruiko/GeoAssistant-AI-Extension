var pov;
var first_pov = false;

function handlePositionChanged(panorama) {
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
    class BoundingBoxOverlay extends google.maps.OverlayView{
        topleftTheta;
        topleftPhi;
        bottomrightTheta;
        bottomrightPhi;
        toprightTheta;
        toprightPhi;
        bottomleftTheta;
        bottomleftPhi;
        canvasWidth;
        canvasHeight;
        cls;
        div;

        constructor(topleftx, toplefty, bottomrightx, bottomrighty, heading, pitch, cls) {
            super();
            this.cls = cls;
            this.refreshCanvasSize();

            const topleftSphereCoords = this.pointToSphere(topleftx, toplefty, heading, pitch);
            this.topleftTheta = topleftSphereCoords.theta;
            this.topleftPhi = topleftSphereCoords.phi;

            const toprightSphereCoords = this.pointToSphere(bottomrightx, toplefty, heading, pitch);
            this.toprightTheta = toprightSphereCoords.theta;
            this.toprightPhi = toprightSphereCoords.phi

            const bottomrightSphereCoords = this.pointToSphere(bottomrightx, bottomrighty, heading, pitch);
            this.bottomrightTheta = bottomrightSphereCoords.theta;
            this.bottomrightPhi = bottomrightSphereCoords.phi;

            const bottomleftSphereCoords = this.pointToSphere(topleftx, bottomrighty, heading, pitch);
            this.bottomleftTheta = bottomleftSphereCoords.theta;
            this.bottomleftPhi = bottomleftSphereCoords.phi;
        }

        onAdd() {
            const precision = 40;

            // this is supposed to prevent duplicating of images
            const className = `boundingBox${this.cls}`;
            const currentCoords = this.calculateCurrentCoords();
            const centerX = currentCoords.Left + currentCoords.width / 2;
            const centerY = currentCoords.top + currentCoords.height / 2;
            const boundingBoxes = document.getElementsByClassName(className);
            if(boundingBoxes.length > 0) {
                delete this;
                return;
            }
            for(let i = 0; i < boundingBoxes.length; i++) {
                const left = this.parsePxString(boundingBoxes[i].style.left);
                const top = this.parsePxString(boundingBoxes[i].style.top);
                const width = this.parsePxString(boundingBoxes[i].style.width);
                const height = this.parsePxString(boundingBoxes[i].style.height);
                
                const currCenterX = left + width / 2;
                const currCenterY = top + height / 2;

                if(Math.abs(centerX - currCenterX) < precision && Math.abs(centerY - currCenterY) < precision) {
                    delete this;
                    return;
                }
            }

            this.div = document.createElement('div');
            this.div.classList.add(className);
            this.div.style.borderStyle = "solid";
            this.div.style.borderColor = "red";
            this.div.style.borderWidth = "3px";
            this.div.style.position = "absolute";
            
            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.div);
        }

        draw() {
            // calculate new position according to current pitch and heading
            this.refreshCanvasSize();
            if (this.div) {

                const newCoords = this.calculateCurrentCoords();
                
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

        calculateCurrentCoords() {
            const currentPov = this.getMap().getPov();

            const topleftCoords = this.getPointOnScreen(this.topleftTheta, this.topleftPhi, currentPov.heading, currentPov.pitch);
            const toprightCoords = this.getPointOnScreen(this.toprightTheta, this.toprightPhi, currentPov.heading, currentPov.pitch);
            const bottomrightCoords = this.getPointOnScreen(this.bottomrightTheta, this.bottomrightPhi, currentPov.heading, currentPov.pitch);
            const bottomleftCoords = this.getPointOnScreen(this.bottomleftTheta, this.bottomleftPhi, currentPov.heading, currentPov.pitch);
            
            const xCoords = [topleftCoords.x, toprightCoords.x, bottomleftCoords.x, bottomrightCoords.x];
            const yCoords = [topleftCoords.y, toprightCoords.y, bottomleftCoords.y, bottomrightCoords.y];
            
            console.log(xCoords);
            console.log(yCoords);

            xCoords.sort((x, y) => x - y);
            yCoords.sort((x, y) => x - y);

            // this might need to be adjusted
            return {
                left: (xCoords[0] + xCoords[1]) / 2,
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
            phi = (appliedPitchCoords.phi + heading) % (2 * Math.PI);

            return { theta: theta, phi: phi };
        }

        sphericalRotateX(theta, phi, alpha) {
            return {
                theta: Math.acos(Math.sin(theta) * Math.sin(phi) * Math.sin(alpha) + Math.cos(theta) * Math.cos(alpha)),
                phi: Math.atan2(Math.sin(theta) * Math.sin(phi) * Math.cos(alpha) - Math.cos(theta) * Math.sin(alpha), Math.sin(theta) * Math.cos(phi))
            };
        }

        toRadian(degree) {
            return degree * Math.PI / 180;
        }

        refreshCanvasSize() {
            const canvas = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__canvas")[0];
            this.canvasWidth = canvas.offsetWidth;
            this.canvasHeight = canvas.offsetHeight;
        }

        parsePxString(str) {
            return parseFloat(str.substring(0, str.indexOf('px')));
        }
    }

    window.addEventListener('addBoundingBoxes', (e) => {
        const boundingBoxesData = e.detail;
        const pov = boundingBoxesData.pov;
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