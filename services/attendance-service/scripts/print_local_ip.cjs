const os = require('os');
const ifaces = os.networkInterfaces();
let ip = '127.0.0.1';
for (const n of Object.keys(ifaces)) {
  for (const iface of ifaces[n]) {
    if (iface && iface.family === 'IPv4' && !iface.internal) {
      ip = iface.address;
    }
  }
}
console.log('local ip =', ip);
