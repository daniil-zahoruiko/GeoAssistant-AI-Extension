async function handleImageSave() {
    await chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];
        
        if(tab != null) {
            const tabId = tab.id;
            await chrome.tabs.sendMessage(tabId, { msg: 'imgSave' });
        }
    });
    
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if(msg.msg === 'SaveImage') {
        handleImageSave();
    }
});