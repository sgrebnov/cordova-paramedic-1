var shelljs = require('shelljs');
var verbose = undefined;
var os      = require("os");

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

module.exports = {
    ANDROID:    "android",
    IOS:        "ios",
    WINDOWS:    "windows",
    isWindows:  isWindows,
	exec: exec
};
