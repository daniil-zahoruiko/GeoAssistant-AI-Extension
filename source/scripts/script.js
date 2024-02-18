let button = document.getElementById("button")

button.onclick = function() {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ["./scripts/getCanvas.js"],
        }).then(() => console.log("Script injected"))
    });
}

