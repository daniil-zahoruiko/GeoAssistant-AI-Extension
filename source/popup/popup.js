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

var toggle = document.querySelector('#highlight_toggle');

if (toggle.checked) {
    dotBox.classList.add('highlight');
    rectBox.classList.remove('highlight');
} else {
    rectBox.classList.add('highlight');
    dotBox.classList.remove('highlight');
}

chrome.runtime.sendMessage({msg: 'loadPreferences'});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'preferencesLoaded') {
        if (msg.preferences.rect) {
            rectBox.classList.add('highlight');
            dotBox.classList.remove('highlight');
            toggle.checked = false;
        } else {
            dotBox.classList.add('highlight');
            rectBox.classList.remove('highlight');
            toggle.checked = true;
        }
    }
});

toggle.addEventListener('change', function() {
    if (toggle.checked) {
        dotBox.classList.add('highlight');
        rectBox.classList.remove('highlight');
    } else {
        rectBox.classList.add('highlight');
        dotBox.classList.remove('highlight');
    }
    chrome.runtime.sendMessage({msg: 'preferencesChanged', preferences: {
        rect: !toggle.checked,
        dot: toggle.checked
    }});
  });