const streetviewApiURL = "https://streetviewpixels-pa.googleapis.com/v1"

function logURL(requestDetails) {
    console.log(`Loading: ${requestDetails.url}`);
}
  
chrome.webRequest.onBeforeRequest.addListener(logURL, {
    urls: ["https://streetviewpixels-pa.googleapis.com/v1/*"],
});