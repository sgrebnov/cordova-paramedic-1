var shelljs = require('shelljs');
var verbose = undefined;
var os      = require("os");
var logger  = require('./logger').get();

var HEADING_LINE_PATTERN = /List of devices/m;
var DEVICE_ROW_PATTERN   = /(emulator|device|host)/m;

function exec(cmd, onFinish, onData) {
    if (onFinish instanceof Function || onFinish === null) {
        var result = shelljs.exec(cmd, {async: true, silent: !verbose}, onFinish);

        if (onData instanceof Function) {
            result.stdout.on('data', onData);
        }
    } else {
        return shelljs.exec(cmd, {silent: !verbose});
    }
}

exec.setVerboseLevel = function(_verbose) {
    verbose = _verbose;
}

function isWindows () {
    return /^win/.test(os.platform());
}

function countAndroidDevices() {
    var listCommand = "adb devices";

    logger.normal("running:");
    logger.normal("    " + listCommand);

    var numDevices = 0;
    var result = shelljs.exec(listCommand, {silent: false, async: false});
    result.output.split('\n').forEach(function (line) {
        if (!HEADING_LINE_PATTERN.test(line) && DEVICE_ROW_PATTERN.test(line)) {
            numDevices += 1;
        }
    });
    return numDevices;
}

function secToMin (seconds) {
    return Math.ceil(seconds / 60);
}

module.exports = {
    ANDROID:    "android",
    IOS:        "ios",
    WINDOWS:    "windows",

    DEFAULT_LOG_TIME: 15,
    DEFAULT_LOG_TIME_ADDITIONAL: 2,

    secToMin: secToMin,
    isWindows:  isWindows,
    countAndroidDevices: countAndroidDevices,
	exec: exec
};
