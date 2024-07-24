window.addEventListener('POVchanged', (e) => {
    chrome.runtime.sendMessage({msg: 'POVchanged', value: e.detail});
});

chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    if(msg.msg === 'fetchOriginPOV') {
        window.dispatchEvent(new CustomEvent( msg.msg, { detail: msg.value }));
    }
    else if(msg.msg === 'addBoundingBoxes') {
        window.dispatchEvent(new CustomEvent( msg.msg, { detail: msg.data }));
    }
});

window.addEventListener('sendOriginPOV', (e) => {
    chrome.runtime.sendMessage({msg: 'sendOriginPOV', value: e.detail});
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
        }
    });
    })
    .catch(error => console.error('Error fetching SVG:', error));
}

fetchSVG();


(async() => {
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL("scripts/injected.js");
    (document.head || document.documentElement).appendChild(script);
})();