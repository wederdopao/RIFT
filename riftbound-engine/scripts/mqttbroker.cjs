// Retransmissor MQTT local (WebSocket) para testar o online: node scripts/mqttbroker.cjs [porta]
const aedes = require('aedes')();
const http = require('http');
const ws = require('websocket-stream');
const port = Number(process.argv[2] || 8888);
const server = http.createServer();
ws.createServer({ server }, aedes.handle);
server.listen(port, '127.0.0.1', () => console.log('mqtt ws ok', port));
