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
  let urls = filteredTabs.map((tab) => tab.url);
  switch (action) {
    case 'handshake':
      info.innerText = `${urls.length} tabs found ${workspaceName ? `in ${workspaceName}` : 'here'}`;
      break;
    case 'show':
      textarea.value = urls.join('\n');
      manager.style.display = 'block';
      welcome.style.display = 'none';
      break;
    case 'download':
    case 'download-images':
      if (!urls.length) {
        showInfoMessage(`Nothing to be downloaded!`);
        break;
      }
      let stuff = `${urls.length} ${action == 'download' ? 'files' : 'images'}`;
      if (urls.length >= 10 && !confirm(`Download ${stuff} now?`)) break;
      showInfoMessage(`Download ${stuff} started!`);

      downloadTabs = filteredTabs;

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
    textarea.value = textarea.value.split('\n').sort().join('\n');
  });
  document.getElementById('btn-copy').addEventListener('click', e => {
    textarea.focus();
    textarea.select();
    console.log('should copy:', textarea.value);
    copyText(textarea.value, function() {
      alert('URLs copied to clipboard!');
    });
  });
  document.getElementById('btn-back').addEventListener('click', e => {
    textarea.value = '';
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
    alertbox.getElementsByTagName('p')[0].innerText = `${filteredTabs.length} file(s) has been downloaded!`
  } catch(err) {
    console.error("download error", err);
    // filteredTabs.forEach(tab => {
    //   let popup = window.open(tab.url);
    //   popup.blur();
    //   window.focus();
    // });
  }
}