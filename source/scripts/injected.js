var pov;
var first_pov = false;

function handlePositionChanged(panorama) {
    // console.log('position changed', Date.now());
    // console.log(panorama.getPov())
    // var event = new CustomEvent("panoLoadingStart", {});
    // window.dispatchEvent(event);
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
        canvasWidth;
        canvasHeight;
        cls;
        div;

        toprightTheta;
        toprightPhi;
        bottomleftTheta;
        bottomleftPhi;

        constructor(topleftx, toplefty, bottomrightx, bottomrighty, heading, pitch, cls) {
            super();
            this.cls = cls;
            this.refreshCanvasSize();

            const topleftSphereCoords = this.pointToSphere(topleftx, toplefty, heading, pitch);
            this.topleftTheta = topleftSphereCoords.theta;
            this.topleftPhi = topleftSphereCoords.phi;
            const bottomrightSphereCoords = this.pointToSphere(bottomrightx, bottomrighty, heading, pitch);
            this.bottomrightTheta = bottomrightSphereCoords.theta;
            this.bottomrightPhi = bottomrightSphereCoords.phi;

            const toprightSphereCoords = this.pointToSphere(bottomrightx, toplefty, heading, pitch);
            this.toprightTheta = toprightSphereCoords.theta;
            this.toprightPhi = toprightSphereCoords.phi

            const bottomleftSphereCoords = this.pointToSphere(topleftx, bottomrighty, heading, pitch);
            this.bottomleftTheta = bottomleftSphereCoords.theta;
            this.bottomleftPhi = bottomleftSphereCoords.phi;
        }

        onAdd() {
            const precision = 30;

            // this is supposed to prevent duplicating of images
            const className = `boundingBox${this.cls}`;
            const currentPov = this.getMap().getPov();
            const topleftCoords = this.getPointOnScreen(this.topleftTheta, this.topleftPhi, currentPov.heading, currentPov.pitch);
            const bottomrightCoords = this.getPointOnScreen(this.bottomrightTheta, this.bottomrightPhi, currentPov.heading, currentPov.pitch);
            const width = bottomrightCoords.x - topleftCoords.x;
            const height = bottomrightCoords.y - topleftCoords.y;
            const boundingBoxes = document.getElementsByClassName(className);
            if(boundingBoxes.length > 0) {
                delete this;
                return;
            }
            for(let i = 0; i < boundingBoxes.length; i++) {
                const left = this.parsePxString(boundingBoxes[i].style.left);
                const top = this.parsePxString(boundingBoxes[i].style.top);
                const currWidth = this.parsePxString(boundingBoxes[i].style.width);
                const currHeight = this.parsePxString(boundingBoxes[i].style.height);

                if(Math.abs(width - currWidth) < precision && Math.abs(height - currHeight) < precision && Math.abs(left - topleftCoords.x) < precision && Math.abs(top - topleftCoords.y) < precision) {
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
                const currentPov = this.getMap().getPov();

                const topleftCoords = this.getPointOnScreen(this.topleftTheta, this.topleftPhi, currentPov.heading, currentPov.pitch);
                const bottomrightCoords = this.getPointOnScreen(this.bottomrightTheta, this.bottomrightPhi, currentPov.heading, currentPov.pitch);

                const toprightCoords = this.getPointOnScreen(this.toprightTheta, this.toprightPhi, currentPov.heading, currentPov.pitch);
                const bottomleftCoords = this.getPointOnScreen(this.bottomleftTheta, this.bottomleftPhi, currentPov.heading, currentPov.pitch);

                console.log(topleftCoords);
                console.log(toprightCoords);
                console.log(bottomleftCoords);
                console.log(bottomrightCoords);

                this.div.style.left = `${Math.min(topleftCoords.x, bottomleftCoords.x)}px`;
                this.div.style.top = `${Math.min(topleftCoords.y, toprightCoords.y)}px`;
                this.div.style.width = `${Math.max(bottomrightCoords.x, toprightCoords.x) - Math.min(topleftCoords.x, bottomleftCoords.x)}px`;
                this.div.style.height = `${Math.max(bottomrightCoords.y, bottomleftCoords.y) - Math.min(topleftCoords.y, toprightCoords.y)}px`;
            }
        }

        onRemove() {
            if (this.div) {
                this.div.parentNode.removeChild(this.div);
                delete this.div;
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