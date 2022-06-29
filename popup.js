'use strict';

var downloadTabs = [];
var welcome, manager, caption, info, textarea, alertbox;
var options = {
  currentWorkspaceOnly: true,
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('got message', message);
  let { action, filteredTabs, workspaceName } = message;
  let response = {'ok': true};
  let total = filteredTabs.length;
  downloadTabs = filteredTabs;
  switch (action) {
    case 'handshake':
      info.innerText = `${total} tabs found ${workspaceName ? `in ${workspaceName}` : 'here'}`;
      break;
    case 'show':
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
      let stuff = `${total} ${action == 'download' ? 'files' : 'images'}`;
      if (total >= 10 && !confirm(`Download ${stuff} now?`)) break;
      showInfoMessage(`Download ${stuff} started!`);

      // try {
      //   // Uncaught (in promise) Error: Cannot access a chrome:// URL
      //   chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: 'normal' }, function(tabs) {
      //     console.log("running script in tab:", tabs[0]);
      //     // docs: https://developer.chrome.com/docs/extensions/reference/scripting/
      //     chrome.scripting.executeScript({
      //       target: {tabId: tabs[0].id},
      //       func: downloadAll,
      //       args: [filteredTabs]
      //     });
      //   });
      // } catch(e) {
      //   console.error("cannot launch download in target tab!", e);
        downloadAll(filteredTabs);
      // }
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
  chrome.runtime.sendMessage({action: action, options: options}, function(response) {
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

function downloadAll(filteredTabs, closeTabs = false) {
  try {
    filteredTabs.forEach(tab => {
      const a = document.createElement("a");
      a.href = tab.url;
      // a.target = '_blank'; // is it needed?
      a.download = tab.url.split("/").pop();
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    alertbox.style.display = 'block';
    alertbox.querySelector('p').innerText = `${filteredTabs.length} file(s) has been downloaded!`
  } catch(err) {
    console.error("download error", err);
    // filteredTabs.forEach(tab => {
    //   let popup = window.open(tab.url);
    //   popup.blur();
    //   window.focus();
    // });
  }
}