const os = require('os');

/**
 * Get the local network IP address
 * Returns the first non-internal IPv4 address
 */
const getNetworkIP = () => {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) addresses and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
};

module.exports = getNetworkIP;



