var Q = require('q');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');

var logger = require('./logger').get();

var SUPPORTED_PLATFORMS = [
    "ios",
    "browser",
    "windows",
    "android",
    "wp8"
];

function TestsRunner (server) {
    this.server = server;
}


TestsRunner.prototype.runSingleTarget = function (target) {
    logger.info("Running target: " + target.platform);

    if (SUPPORTED_PLATFORMS.indexOf(target.platformId) === -1) {
        return Q.reject("Platform is not supported :: " + target.platformId);
    }

    var me = this;

    this.server.reset();

    return this.prepareAppToRunTarget(target).then(function() {
        return me.installPlatform(target);
    }).then(function() {
        return me.runTests(target);
    }).then(function () {
        return me.waitForResults(target);
    })
    // .timeout( self.timeout/self.targets.length )
    .then(function (result) {
 //       shell.cd(self.storedCWD);
        logger.normal("Removing platform: " + target.platformId);
        shell.exec('cordova platform rm ' + target.platformId);

        return result;
    });
}

TestsRunner.prototype.prepareAppToRunTarget = function(target) {
    var me = this;
    return Q.Promise(function(resolve, reject) {
        switch(target.platformId) {
            case "ios"     :  // intentional fallthrough
                me.writeMedicLogUrl("http://127.0.0.1:" + me.server.port);
                break
            case "browser" :
            case "windows" :
                me.writeMedicLogUrl("http://127.0.0.1:" + me.server.port);
                break
            case "android":
                me.writeMedicLogUrl("http://10.0.2.2:" + me.server.port);
                break;
        }
        resolve();
    });
};

TestsRunner.prototype.installPlatform = function(target) {
    return Q.Promise(function(resolve, reject) {
        logger.normal("cordova-paramedic: adding platform : " + target.platform);
        shell.exec('cordova platform add ' + target.platform);

        resolve();
    });
};

TestsRunner.prototype.writeMedicLogUrl = function(url) {
    logger.normal("cordova-paramedic: writing medic log url to project " + url);
    var obj = {logurl:url};
    fs.writeFileSync(path.join("www","medic.json"), JSON.stringify(obj));
};

TestsRunner.prototype.runTests = function(target) {
    logger.normal('Starting tests');
    var self = this;

    var cmd = "cordova " + target.action + " " + target.platformId;
    if (target.args) {
        cmd += " " + target.args;
    }

    logger.normal('cordova-paramedic: running command ' + cmd);

    return Q.Promise(function (resolve) {
        shell.exec(cmd, {async:true},
            function(code, output){
                if(code) {
                    throw new Error("cordova build returned error code " + code + "\noutput: " + output);
                }
                resolve();
            }
        );
    });
};

TestsRunner.prototype.waitForResults = function(target) {
    logger.normal('Waiting for tests result');
    var me = this;
    return Q.Promise(function (resolve, reject) {
        me.server.onTestsResults = function (results) {
            resolve(results);
        };
    });
}

module.exports = TestsRunner;