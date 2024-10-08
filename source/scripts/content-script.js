chrome.runtime.onMessage.addListener(function(msg, sender, response){ 
    window.dispatchEvent(new CustomEvent(msg.msg, {detail: msg.data}));
});

function fetchSVG() {
    const svgURL = chrome.runtime.getURL("images/logo.svg");

    fetch(svgURL)
    .then(response => response.text())
    .then(svgContent => {

    // Send the SVG content to injected.js
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'REQUEST_SVG') {
            window.postMessage({ type: 'SEND_SVG', svgContent: svgContent }, '*');
        } else if (event.data && event.data.type === 'REQUEST_PREFERENCES') {
            chrome.runtime.sendMessage({msg: 'loadPreferences'});
        }
    });
    })
    .catch(error => console.error('Error fetching SVG:', error));
    
}

(async() => {
    fetchSVG();
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL("scripts/geo-assistant.js");
    (document.head || document.documentElement).appendChild(script);
})();