document.addEventListener('DOMContentLoaded', (e) => {
    fetch(chrome.runtime.getURL('config.json'))
        .then((response) => response.json())
        .then((data) => {
            if(data['dev-tools'] === true)
            {
                var btn = document.createElement("button");
                btn.innerText = 'Save image';
                btn.addEventListener('click', (e) => {
                    chrome.runtime.sendMessage({msg: 'SaveImage'});
                });
                document.body.appendChild(btn);
            }
        });
});


var rectBox = document.querySelector('#rect');
var dotBox = document.querySelector('#dot');

chrome.runtime.sendMessage({msg: 'loadPreferences'});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'preferencesLoaded') {
        rectBox.checked = msg.preferences.rect;
        dotBox.checked = msg.preferences.dot;
    }
});

rectBox.addEventListener('change', function() {
    chrome.runtime.sendMessage({msg: 'preferencesChanged', preferences: {
        rect: rectBox.checked,
        dot: dotBox.checked
    }});
  });

dotBox.addEventListener('change', function() {
    chrome.runtime.sendMessage({msg: 'preferencesChanged', preferences: {
        rect: rectBox.checked,
        dot: dotBox.checked
    }});
});