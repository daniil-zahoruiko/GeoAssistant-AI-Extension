window.addEventListener("panoLoadingStart", function(e) {
    chrome.runtime.sendMessage({loadingStatus: true}); 
}, false);

window.addEventListener("panoLoadingEnd", function (e) {
    chrome.runtime.sendMessage({loadingStatus: false});
}, false);

(async() => {
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL("scripts/injected.js");
    (document.head || document.documentElement).appendChild(script);
})();