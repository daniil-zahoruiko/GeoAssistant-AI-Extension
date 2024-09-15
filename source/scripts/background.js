async function handlePreferencesChange(preferences) {
    chrome.storage.sync.set({"preferences": preferences});
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];

        if(tab != null) {
            const tabId = tab.id;
            try {
                await chrome.tabs.sendMessage(tabId, { msg: 'preferencesChanged', data: preferences});
            } catch (error) {
                console.log(error);
            }
        }
    });

}

async function loadPreferences(origin) {
    let p = new Promise(function(resolve, reject){
        chrome.storage.sync.get('preferences', function(data) {
            if (!data.preferences) {
                chrome.storage.sync.set({preferences: {
                    rect: true,
                    dot: false
                }});
                resolve({rect: true, dot: false});
            } else {
                resolve(data.preferences);
            }
        });
    })

    let preferences = await p;

    if (origin === "https://www.geoguessr.com") {
        await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
            const tab = tabs[0];
    
            if(tab != null) {
                const tabId = tab.id;
                await chrome.tabs.sendMessage(tabId, { msg: 'preferencesLoaded', data: preferences });
            }
        });
    } else {
        chrome.runtime.sendMessage({msg: 'preferencesLoaded', preferences: preferences});
    }
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'preferencesChanged') {
        handlePreferencesChange(msg.preferences);
    } else if(msg.msg === 'loadPreferences') {
        loadPreferences(sender.origin);
    }
});