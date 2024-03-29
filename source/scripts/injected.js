function handlePositionChanged() {
    console.log('position changed');
    // var event = new CustomEvent("panoLoadingStart", {});
    // window.dispatchEvent(event);
}

function handleLinksChanged() {
    console.log('links changed');
    var event = new CustomEvent("panoLoadingEnd", {});
    window.dispatchEvent(event);
}

function initStreetView() {
    google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
        constructor(...args) {
            super(...args);

            // this.addListener('position_changed', () => handlePositionChanged());
            // this.addListener('pov_changed', () => console.log(this.getPov(), this.getPhotographerPov()));
            // this.addListener('links_changed', () => handleLinksChanged());
        }
    }
}

(function () {
    console.log("asdasdasd");
    new MutationObserver(function() {
        let script = document.querySelector("[src*='maps.googleapis.com/maps/api']");

        if (script) {
            this.disconnect();
            script.onload = () => initStreetView();
        }
    }).observe(document.head, {childList: true, subtree: true});
})();