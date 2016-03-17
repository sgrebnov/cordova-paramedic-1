#!/usr/bin/env node

/* jshint node: true */

"use strict";

var shelljs  = require("shelljs");
var fs       = require("fs");
var path     = require("path");
var util     = require("./utils");
var logger   = require('./logger').get();


function ParamedicLog(platform, appPath, logPath){
    this.platform = platform;
    this.appPath = appPath;
    this.logPath = logPath;
}

ParamedicLog.prototype.logIOS = function (appPath) {
    // We need to print out the system log for the simulator app. In order to figure
    // out the path to that file, we need to find the ID of the simulator running
    // mobilespec

    // First, figure out the simulator that ran mobilespec. "cordova run"" just chooses
    // the last simulator in this list that starts with the word "iPhone"
    shelljs.pushd(appPath);

    var findSimCommand = this.getLocalCLI() + " run --list --emulator | grep ^iPhone | tail -n1";

    logger.info("running:");
    logger.info("    " + findSimCommand);

    var findSimResult = shelljs.exec(findSimCommand);

    if (findSimResult.code > 0) {
        logger.error("Failed to find simulator we deployed to");
        return;
    }

    var split = findSimResult.output.split(", ");

    // Format of the output is "iPhone-6s-Plus, 9.1"
    // Extract the device name and the version number
    var device = split[0].replace(/-/g, " ").trim();
    var version = split[1].trim();

    // Next, figure out the ID of the simulator we found
    var instrCommand = "instruments -s devices | grep ^iPhone";
    logger.info("running:");
    logger.info("    " + instrCommand);

    var instrResult = shelljs.exec(instrCommand);

    if (instrResult.code > 0) {
        logger.error("Failed to get the list of simulators");
        return;
    }

    // This matches <device> (<version>) [<simulator-id>]
    var simIdRegex = /^([a-zA-Z\d ]+) \(([\d.]+)\) \[([a-zA-Z\d\-]*)\]$/;

    var simId = null;
    var lines = instrResult.output.split(/\n/);
    lines.forEach(function(line) {
        var simIdMatch = simIdRegex.exec(line);
        if (simIdMatch && simIdMatch.length === 4 && simIdMatch[1] === device && simIdMatch[2] === version) {
            simId = encodeURIComponent(simIdMatch[3]);
        }
    });

    if (simId) {
        // Now we can print out the log file
        var logPath = path.join("~", "Library", "Logs", "CoreSimulator", simId, "system.log");
        var logCommand = "cat " + logPath;

        logger.info("Attempting to print the iOS simulator system log");

        var logResult = shelljs.exec(logCommand);
        if (logResult.code > 0) {
            logger.error("Failed to cat the simulator log");
        }
    } else {
        logger.error("Failed to find ID of mobilespec simulator");
    }
}

ParamedicLog.prototype.logWindows = function (appPath, logMins) {
    var logScriptPath = path.join(appPath, "platforms", "windows", "cordova", "log.bat");
    if (fs.existsSync(logScriptPath)) {
        var mins = util.DEFAULT_LOG_TIME;
        if (logMins) {
            mins = logMins + util.DEFAULT_LOG_TIME_ADDITIONAL;
        }
        var logCommand = logScriptPath + " --dump --mins " + mins;
        this.generateLogs(logCommand);
    }
}

ParamedicLog.prototype.logAndroid = function (){
    var logCommand = "adb logcat -d";

    var numDevices = util.countAndroidDevices();
    if (numDevices != 1) {
        logger.error("there must be exactly one emulator/device attached");
        return;
    }
    this.generateLogs(logCommand);
}

ParamedicLog.prototype.generateLogs = function(logCommand) {
    var logFile = this.getLogFileName();
    logger.normal('Running Command: ' + logCommand);

    var result = shelljs.exec(logCommand, {silent: true, async: false});
    if (result.code > 0) {
        logger.error("Failed to run command: " + logCommand);
        return;
    }

    try {
        fs.writeFileSync(logFile, result.output);
    } catch (ex) {
        logger.error("Cannot write the log results to the file. " + ex);
    }
}

ParamedicLog.prototype.getLogFileName = function() {
    return path.join(this.logPath, this.platform+"_logs.txt");
}

ParamedicLog.prototype.getLocalCLI = function (){
    if (util.isWindows()) {
        return "cordova.bat";
    } else {
        return "./cordova";
    }
}

ParamedicLog.prototype.collectLogs = function (logMins){
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    switch (this.platform) {
        case util.ANDROID:
            this.logAndroid();
            break;
        case util.IOS:
            this.logIOS(this.appPath);
            break;
        case util.WINDOWS:
            this.logWindows(this.appPath, logMins);
            break;
        default:
            logger.error("Logging is unsupported for " + platform);
            break;
    }
}

module.exports = ParamedicLog;
