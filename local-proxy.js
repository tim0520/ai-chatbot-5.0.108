// tem_proxy.js - 双路代理 (Casdoor + Postgres)
const net = require('net');

const REMOTE_HOST = '47.117.47.58'; // 你的云服务器 IP

// -------------------------------------------------  
// 代理 1: Casdoor
// -------------------------------------------------
const CASDOOR_LOCAL_PORT = 8000;
const CASDOOR_REMOTE_PORT = 8000;

const casdoorServer = net.createServer((socket) => {
  const client = new net.Socket();
  client.connect(CASDOOR_REMOTE_PORT, REMOTE_HOST, () => {
    socket.pipe(client);
    client.pipe(socket);
  });
  client.on('error', () => socket.end());
  socket.on('error', () => client.end());
});

casdoorServer.listen(CASDOOR_LOCAL_PORT, '0.0.0.0', () => {
  console.log(`✅ [Casdoor]  代理运行中: 0.0.0.0:${CASDOOR_LOCAL_PORT} -> ${REMOTE_HOST}:${CASDOOR_REMOTE_PORT}`);
});

// -------------------------------------------------
// 代理 2: Postgres 数据库
// -------------------------------------------------
const DB_LOCAL_PORT = 5434;
const DB_REMOTE_PORT = 5434;

const dbServer = net.createServer((socket) => {
  const client = new net.Socket();
  client.connect(DB_REMOTE_PORT, REMOTE_HOST, () => {
    socket.pipe(client);
    client.pipe(socket);
  });
  
  // 增加一些数据库连接的错误日志，方便调试
  client.on('error', (err) => {
    console.error(`❌ [DB Remote Error] 无法连接远程数据库: ${err.message}`);
    socket.end();
  });
  
  socket.on('error', (err) => {
    console.error(`❌ [DB Local Error] 本地连接断开: ${err.message}`);
    client.end();
  });
});

dbServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`⚠️  端口 ${DB_LOCAL_PORT} 被占用。可能是你本地已经装了 Postgres？`);
        console.error(`   请尝试停止本地 Postgres 服务: sudo service postgresql stop`);
    } else {
        console.error(err);
    }
});

dbServer.listen(DB_LOCAL_PORT, '0.0.0.0', () => {
  console.log(`✅ [Postgres] 代理运行中: 0.0.0.0:${DB_LOCAL_PORT} -> ${REMOTE_HOST}:${DB_REMOTE_PORT}`);
});