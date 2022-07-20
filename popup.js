'use strict';

var downloadTabs = [];
var welcome, manager, caption, info, textarea, alertbox;
var options = {
  currentWorkspaceOnly: true,
  maxConsecutiveDownloads: 10,
};


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('got message', message);
  let { action, filteredTabs, workspaceName } = message;
  let response = {'ok': true};
  let total = filteredTabs.length;
  switch (action) {
    case 'handshake':
      info.innerText = `${total} tabs found ${workspaceName ? `in ${workspaceName}` : 'here'}`;
      break;
    case 'show':
      downloadTabs = filteredTabs;
      showURLList(filteredTabs);
      manager.style.display = 'block';
      welcome.style.display = 'none';
      break;
    case 'download':
    case 'download-images':
      if (!total) {
        showInfoMessage(`Nothing to be downloaded!`);
        break;
      }
      let stuff = action == 'download' ? 'files' : 'images';
      if (total > options.maxConsecutiveDownloads && !confirm(`Download ${options.maxConsecutiveDownloads} from ${total} ${stuff} now?`)) break;
      downloadTabs = filteredTabs.slice(0, options.maxConsecutiveDownloads);
      showInfoMessage(`Download ${downloadTabs.length} ${stuff} started!`);
      downloadAll(downloadTabs);
      break;
  }
  sendResponse(response);
});

function showURLList(tabs) {
  textarea.innerHTML = '';
  tabs.forEach(putURLList);
}

function putURLList(tab) {
  let p = document.createElement("p");
  p.innerText = tab.url;
  p.addEventListener('click', () => {
    chrome.tabs.update(tab.id, {selected: true});
  });
  textarea.appendChild(p);
}

function sendAction(action) {
  console.log('sending action', action);
  chrome.runtime.sendMessage({action, options}, function(response) {
    let error = chrome.runtime.lastError;
    if (error) console.error('action error:', action, error.message);
    else console.log('action response:', action, response);
  });
}

function showInfoMessage(message, timeout = 2500) {
  caption.innerText = message;
  setTimeout(() => {
    caption.innerText = 'What to do with all opened tabs?';
  }, timeout);
}

document.addEventListener('DOMContentLoaded', function () {
  welcome = document.getElementById("welcome");
  manager = document.getElementById("manager");
  caption = document.getElementById("caption");
  info = document.getElementById("info");
  alertbox = document.getElementById("alertbox");
  textarea = document.getElementById("textarea");
  const btns = document.querySelectorAll('.btn-action');
  for (let i = 0; i < btns.length; i++) btns[i].addEventListener('click', e => sendAction(e.target.dataset.action));
  document.getElementById('btn-close-tabs').addEventListener('click', e => {
    alertbox.style.display = 'none';
    downloadTabs.forEach((tab) => {
      try {
        chrome.tabs.remove(+tab.id);
      } catch(err) {
      }
    });
    downloadTabs.length = 0;
  });
  document.getElementById('btn-sort').addEventListener('click', e => {
    downloadTabs.sort(function(a, b) {
      return a.url == b.url ? 0 : (a.url > b.url ? 1 : -1);
    });
    showURLList(downloadTabs);
  });
  document.getElementById('btn-copy').addEventListener('click', e => {
    let text = downloadTabs.map((tab) => tab.url).join('\n');
    copyText(text, function() {
      alert('URLs copied to clipboard!');
    });
  });
  document.getElementById('btn-back').addEventListener('click', e => {
    textarea.innerHTML = '';
    manager.style.display = 'none';
    welcome.style.display = 'block';
  });
  document.getElementById('opt-current-workspace').addEventListener('change', e => { options.currentWorkspaceOnly = e.target.checked; });
  document.getElementById('opt-max-consecutive-downloads').addEventListener('input', e => { options.maxConsecutiveDownloads = e.target.value; });
  sendAction("handshake");
});

function copyText(text, onSuccess = () => {}) {
  if (!navigator.clipboard) {
    var input = document.createElement("input");
    input.value = value;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, 99999); /* For mobile devices */
    document.execCommand("copy");
    input.remove();
    console.info("copied to clipboard!");
    onSuccess();
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.info("copied to clipboard!");
    onSuccess();
  });
}

function downloadAll(tabs) {
  tabs.forEach(tab => {
    const a = document.createElement("a");
    a.href = tab.url;
    // a.target = '_blank'; // is it needed?
    a.download = tab.url.split("/").pop().split('?')[0];
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  alertbox.style.display = 'block';
  alertbox.querySelector('p').innerText = `${tabs.length} file(s) has been downloaded!`
}