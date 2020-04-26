const fs = require('fs')
const { Client } = require('tplink-smarthome-api');
const dataLogger = require('./data-logger');
const runtimeMonitor = require('./runtime-monitor.js');
const interfaces = require('os').networkInterfaces();

var devices = [];

function startDiscovery(bindAddress) {
  console.log('Starting discovery on interface: ' + bindAddress);
  var client = new Client();
  client.startDiscovery({
    deviceTypes: ['plug'],
    address: bindAddress,
    discoveryTimeout: 20000
  }).on('plug-new', registerPlug);  
}

Object.keys(interfaces)
  .reduce((results, name) => results.concat(interfaces[name]), [])
  .filter((iface) => iface.family === 'IPv4' && !iface.internal)
  .map((iface) => iface.address)
  .map(startDiscovery);


function registerPlug(plug) {
  if (plug.supportsEmeter) {
    console.log('Found device with energy monitor support: ' + plug.alias + ' [' + plug.deviceId + ']');
    devices.push(plug);
    dataLogger.startLogging(plug);
    
    //Check for monitoring and emailing configuration file.
    const path = './'+plug.deviceId+'-monitor-config.json';
    fs.access(path, fs.F_OK, (err) => {
      if (err) {
        //Configuration file does not exist. Skip this plug.
        return
      }
      //Configuration file exists - read it's contents and pass variable to the monitoring function      
      let monitorConfig  = JSON.parse(fs.readFileSync(path, 'utf8'));
      //TODO: need to add error checking and don't start monitoring unless all required parameters are checked and valid data types etc...
      runtimeMonitor.startMonitoring(plug, monitorConfig);
    })  
    
  } else {
    console.log('Skipping device: ' + plug.alias + ' [' + plug.deviceId + ']. Energy monitoring not supported.');
  } 
}

module.exports.getDevice = function(deviceId) {
  return devices.find(d => d.deviceId == deviceId);
}

module.exports.getAllDevices = function() {
  return devices;
}