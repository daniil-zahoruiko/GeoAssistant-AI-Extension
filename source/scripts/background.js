const streetviewApiURL = "https://streetviewpixels-pa.googleapis.com/v1"

function logURL(requestDetails) {
    const url = requestDetails.url;
    if(url.substring(0, url.lastIndexOf("/")) === streetviewApiURL){
        console.log(`Loading: ${url}`);
    }
}
  
chrome.webRequest.onBeforeRequest.addListener(logURL, {
    urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"],
});