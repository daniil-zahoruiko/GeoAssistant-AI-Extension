async function handleImageSave() {
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];

        if(tab != null) {
            const tabId = tab.id;
            await chrome.tabs.sendMessage(tabId, { msg: 'imgSave' });
        }
    });

}

async function handlePreferencesChange(preferences) {
    chrome.storage.sync.set({"preferences": preferences});
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];

        if(tab != null) {
            const tabId = tab.id;
            await chrome.tabs.sendMessage(tabId, { msg: 'preferencesChanged', data: preferences});
        }
    });
}

async function loadPreferences() {
    let p = new Promise(function(resolve, reject){
        chrome.storage.sync.get('preferences', function(data) {
            if (!data.preferences) {
                chrome.storage.sync.set({preferences: {
                    rect: true,
                    dot: true
                }});
                resolve({rect: true, dot: true});
            } else {
                resolve(data.preferences);
            }
        });
    })

    let preferences = await p;

    chrome.runtime.sendMessage({msg: 'preferencesLoaded', preferences: preferences});

    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];

        if(tab != null) {
            const tabId = tab.id;
            await chrome.tabs.sendMessage(tabId, { msg: 'preferencesLoaded', data: preferences });
        }
    });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'SaveImage') {
        handleImageSave();
    } else if(msg.msg === 'preferencesChanged') {
        handlePreferencesChange(msg.preferences);
    } else if(msg.msg === 'loadPreferences') {
        loadPreferences();
    }
});