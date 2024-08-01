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

rectBox.addEventListener('change', function() {
    console.log(rectBox.checked);
    chrome.storage.sync.set({preferences: {
        rect: rectBox.checked,
        dot: dotBox.checked
    }});
    // chrome.runtime.sendMessage({msg: 'preferencesChanged'});
  });

dotBox.addEventListener('change', function() {
    console.log(dotBox.checked);
    chrome.storage.sync.set({preferences: {
        rect: rectBox.checked,
        dot: dotBox.checked
    }});
});

chrome.storage.sync.get('preferences', function(data) {
    if (!data.preferences) {
        chrome.storage.sync.set({preferences: {
            rect: true,
            dot: true
        }});
        rectBox.checked = true;
        dotBox.checked = true;
    } else {
        chrome.storage.sync.get('preferences', function(data) {
            rectBox.checked = data.preferences.rect;
            dotBox.checked = data.preferences.dot;
        });
    }
});