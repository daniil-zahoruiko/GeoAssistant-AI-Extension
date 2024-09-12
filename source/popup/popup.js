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

var read_me = document.getElementsByClassName('read_me_wrapper')[0];
read_me.addEventListener('click', function() {
    // open link to github
    window.open("https://github.com/daniil-zahoruiko/GeoAssistant-AI-Extension", "_blank");
});

var contact_us = document.getElementsByClassName('contact_us_wrapper')[0];
contact_us.addEventListener('click', function() {
    // open link to github
    // window.open("https://github.com/daniil-zahoruiko/GeoAssistant-AI-Extension", "_blank");
    window.open("mailto: geoassistantai@gmail.com", "_blank");
});


var rectBox = document.querySelector('#rect');
var dotBox = document.querySelector('#dot');
var info = document.querySelector('.highlight_wrapper');
var infoBtn = document.querySelector('.info');
info.style.visibility = 'hidden';

infoBtn.addEventListener('click', function() {
    if (info.style.visibility === 'hidden') {
        info.style.visibility = 'visible';
    } else {
        info.style.visibility = 'hidden';
    }
});

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