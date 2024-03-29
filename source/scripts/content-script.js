window.addEventListener('mouseup', (e) => {
    chrome.storage.local.get('mousemoved', (res) => {
        if(!res.mousemoved) {
            window.dispatchEvent(new CustomEvent('fetchPOV', {}));
        }
    });
});

window.addEventListener('sendPOV', (e) => {
    chrome.storage.set({'initialPOV': e.detail});
});

(async() => {
    new MutationObserver(function () {
        let canvas = document.getElementsByClassName("mapsConsumerUiSceneCoreScene__canvas widget-scene-canvas")[0];
        if(canvas) {
            this.disconnect();
            document.addEventListener('mousemove', (e) => {
                chrome.storage.local.set({'mousemoved': true});
            });
            canvas.addEventListener('mousedown', (e) => {
                chrome.storage.local.set({'mousemoved': false});
            });
        }
    }).observe(document.body, {childList: true, subtree: true});
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL("scripts/injected.js");
    (document.head || document.documentElement).appendChild(script);
})();