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