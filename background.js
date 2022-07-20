var workspaceName = '';
var workspaceId = 0;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("[BG] got an action", request, sender);
  let { action, options } = request;
  let response = {'ok': true};
  tabsAction(action, options);
  sendResponse(response);
});

async function tabsAction(action, options) {
  let { currentWorkspaceOnly, maxConsecutiveDownloads } = options;

  if (action == 'handshake') {
    // docs: https://developer.chrome.com/docs/extensions/reference/tabs/
    let [currentTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: 'normal' });
    workspaceName = currentTab?.workspaceName;
    workspaceId = currentTab?.workspaceId;
    console.info('[BG] current workspace id:', workspaceId);
    console.info('[BG] current workspace name:', workspaceName);
  }

  let tabs = await chrome.tabs.query({ lastFocusedWindow: true, windowType: 'normal' });
  let filteredTabs = [];
  console.info(`[BG] getting urls from ${tabs.length} tabs ...`);
  tabs.forEach(tab => {
    if (currentWorkspaceOnly && tab.workspaceId != workspaceId) return;
    if (action == 'download' && !isFileURL(tab.url)) return;
    if (action == 'download-images' && !isImageURL(tab.url)) return;
    filteredTabs.push(tab);
  });
  sendToPopup(action, {filteredTabs, workspaceName});
}

function isImageURL(url) {
  return /^http[^\?]*.(jpg|jpeg|tiff|gif|png|webp|bmp|apng|svg)(.*)(\?(.*))?$/gmi.test(url) ||
        /https:\/\/pbs.twimg.com\/media\/[\w]+\?format=[\w]+&name=[\w]+/.test(url);
}

function isFileURL(url) {
  let basename = url.split('/').pop();
  let ext = basename.split('.').pop().split('?')[0];
  return url.indexOf("http") == 0
    && basename.indexOf('.') > -1
    && ext.length <= 4
    && /^[a-zA-Z0-9]+$/.test(ext)
    && !['htm', 'html'].includes(ext)
}

function sendToPopup(action, message = {}) {
  chrome.runtime.sendMessage({action, ...message}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) console.error('[BG] action error:', action, error.message);
    else console.log('[BG] action response:', action, response);
  });
}

function generateIcons(tabId, name) {
  console.log('[BG] set action icon', tabId, name);
  chrome.action.setIcon({tabId, path: {
    "16": "icons/" + name + "16.png",
    "24": "icons/" + name + "24.png",
    "32": "icons/" + name + "32.png"
  }});
}