var pov;
var first_pov = false;

function handlePositionChanged(panorama) {
    // console.log('position changed', Date.now());
    // console.log(panorama.getPov())
    // var event = new CustomEvent("panoLoadingStart", {});
    // window.dispatchEvent(event);
}

window.addEventListener('fetchPOV', (e) => {
    window.dispatchEvent(new CustomEvent('sendPOV', {detail: pov}));
});

function initStreetView() {
    google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
        constructor(...args) {
            super(...args);

            this.addListener('position_changed', () => handlePositionChanged(this));
            this.addListener('pov_changed', () => {
                if(!first_pov) {
                    first_pov = true;
                }
                else {
                    if(!pov) {
                        window.dispatchEvent(new CustomEvent('sendPOV', {detail: this.getPov()}));
                    }
                    pov = this.getPov()
                }
            });
        }
    }
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