const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('raijin', {
  platform: process.platform,
});
