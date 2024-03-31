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

            this.addListener('position_changed', () => handlePositionChanged(this));
            this.addListener('pov_changed', () => handlePovChanged(this));
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