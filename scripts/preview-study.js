// Local review server with isolated disposable data and no paid API configuration.
process.env.JEV_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {createApp} = require('../lib/app');
const {createFileStorage} = require('../lib/storage-file');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'jev-study-preview-'));
const app = createApp({mode:'local',storage:createFileStorage(dir),publicDir:path.join(__dirname,'../public')});
http.createServer(app).listen(4317,'127.0.0.1',()=>console.log('Isolated preview: http://127.0.0.1:4317 (temporary data: '+dir+')'));
