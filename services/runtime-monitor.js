const emailHandler = require('./email-handler.js');
const dataBroadcaster = require('./data-broadcaster');
const moment = require('moment');

var timeToExcessiveIdleAlert;
var timeToExcessiveRunAlert;


var monitoredDevice = {
  started: false,
  lastStartedTime: undefined,
  lastStoppedTime: undefined,
  lastTimeIdleAlert: undefined,
  lastTimeRunningAlert: undefined,
  usage: undefined,
  getPower: function() {
    return ('power' in monitoredDevice.usage ? monitoredDevice.usage.power : monitoredDevice.usage.power_mw/1000);
  },
  init: function() {
    this.started = false;
    this.lastStartedTime = getDate();
    this.lastStoppedTime = getDate();
    this.lastTimeIdleAlert = getDate();
    this.lastTimeRunningAlert = getDate();
    this.usage = undefined;    
  },
  isDeviceStarted: function() { return this.started; },
  isDeviceStopped: function() { return !this.started; },
  getTimeSinceLastStart: function() { return getDate() - monitoredDevice.lastStartedTime; },
  getTimeSinceLastStop: function() { return getDate() - monitoredDevice.lastStoppedTime; },
  getTimeFromLastRunningAlert: function() { return getDate() - monitoredDevice.lastTimeRunningAlert; },
  getTimeFromLastIdleAlert: function() { return getDate() - monitoredDevice.lastTimeIdleAlert; },
  startDevice: function() { 
    this.started = true;
    this.lastStartedTime = getDate();
  },
  stopDevice: function() {    
    this.started = false;
    this.lastStoppedTime = getDate();
  }   
}

function startMonitoring(device, config){
  setInterval(() => { monitor(device, config); }, config.monitorFrequencyMs); //Begin monitoring at the specified interval
  logNow('Monitoring started for ' + device.alias + ' [' + device.deviceId + '] every ' + (config.monitorFrequencyMs/1000) + ' seconds');
  monitoredDevice.init();
}

function monitor(device, config){
    device.emeter.getRealtime().then(response => {
      monitoredDevice.usage = response;
      verifyStartStop(device, config);     
      verifyIdleTime(device, config);
      verifyRunningTime(device, config);
  });
}

function verifyStartStop(device, config) {
  if (monitoredDevice.getPower() > config.powerThreshold) {            
    if (monitoredDevice.isDeviceStopped()) {
      monitoredDevice.startDevice();
      logNow(config.aliasDevice + " Started");
      if(config.enableStartAlert == "on") {
        emailHandler.sendEmail(config.aliasDevice + ' Started', device, config);
      }      
    }
  }
  else if (monitoredDevice.isDeviceStarted()) {    
    monitoredDevice.stopDevice();
    logNow(config.aliasDevice + " Stopped");
    if(config.enableStopAlert == "on") {
      emailHandler.sendEmail(config.aliasDevice + ' Stopped', device, config);
    }         
  }
}

function verifyIdleTime(device, config) {  
  
  if (monitoredDevice.isDeviceStopped()) {
    timeToExcessiveIdleAlert = Math.round(Math.max((config.idleThreshold - monitoredDevice.getTimeSinceLastStop()), (config.repeatIdleAlertEvery - monitoredDevice.getTimeFromLastIdleAlert())));
    dataBroadcaster.broadcastNewIdleTime(device.deviceId, timeToExcessiveIdleAlert);
  }else {
    dataBroadcaster.broadcastNewIdleTime(device.deviceId, 9999);
  }
  
  if ((monitoredDevice.isDeviceStopped()) && (monitoredDevice.getTimeFromLastIdleAlert() >= config.repeatIdleAlertEvery) && (monitoredDevice.getTimeSinceLastStop() >= config.idleThreshold)) {      
        monitoredDevice.lastTimeIdleAlert = getDate();
        logNow(config.aliasDevice + " Excessive idle time detected.");
        if (config.enableExcessiveIdleAlert == "on") {
          emailHandler.sendEmail(config.aliasDevice + ' excessive idle time', device, config);
        }
  }
}

function verifyRunningTime(device, config) {
if (monitoredDevice.isDeviceStarted()) {
  timeToExcessiveRunAlert = Math.round(Math.max((config.deviceRunningTimeThreshold - monitoredDevice.getTimeSinceLastStart()), (config.repeatRunningAlertEvery - monitoredDevice.getTimeFromLastRunningAlert())));
  dataBroadcaster.broadcastNewRunningTime(device.deviceId, timeToExcessiveRunAlert);
}else {
  dataBroadcaster.broadcastNewRunningTime(device.deviceId, 9999);
}

  if ((monitoredDevice.isDeviceStarted()) && (monitoredDevice.getTimeFromLastRunningAlert() >= config.repeatRunningAlertEvery) && (monitoredDevice.getTimeSinceLastStart() >= config.deviceRunningTimeThreshold)) {
      monitoredDevice.lastTimeRunningAlert = getDate();
      logNow(config.aliasDevice + " Excessive run time detected.");
      if (config.enableExcessiveRunningAlert == "on") {         
        emailHandler.sendEmail(config.aliasDevice + ' excessive run time.', device, config)
      }
  }
}


function getDate() {
  return Date.now()/1000;
}

function logNow(message){
  console.log(moment().format('YYYY-MM-D HH:mm:ss')+' - '+ message);
}

module.exports = {
  startMonitoring: startMonitoring,
  monitor: monitor
}