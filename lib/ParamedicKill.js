#!/usr/bin/env node

"use strict";

var shelljs  = require("shelljs");
var util = require("./utils");
var logger = require('./logger').get();

// helpers
function tasksOnPlatform(platformName) {
    switch (platformName) {
        case util.WINDOWS:
            return ["WWAHost.exe", "Xde.exe"];
        case util.IOS:
            return ["iOS Simulator"];
        case util.ANDROID:
            if (util.isWindows()) {
                return ["emulator-arm.exe"];
            } else {
                return ["emulator64-x86", "emulator64-arm"];
            }
            break;
    }
}

/**
 * CB-10671: In order to deal with issues where "ghost" emulators sometimes get
 * left behind, we kill the ADB server
 */
function killAdbServer() {
    logger.info("Killing adb server");
    var killServerCommand = "adb kill-server";

    logger.info("Running the following command:");
    logger.info("    " + killServerCommand);

    var killServerResult = shelljs.exec(killServerCommand, {silent: false, async: false});
    if (killServerResult.code !== 0) {
        logger.error("Failed killing adb server");
    }
    logger.info("Finished killing adb server");
}

function getKillCommand(taskNames) {

    var cli;
    var args;

    if (util.isWindows()) {
        cli  = "taskkill /F";
        args = taskNames.map(function (name) { return "/IM \"" + name + "\""; });
    } else {
        cli  = "killall -9";
        args = taskNames.map(function (name) { return "\"" + name + "\""; });
    }

    return cli + " " + args.join(" ");
}

function killTasks(taskNames) {

    if (!taskNames || taskNames.length < 1) {
        return;
    }

    var command = getKillCommand(taskNames);

    logger.info("running the following command:");
    logger.info("    " + command);

    var killTasksResult = shelljs.exec(command, {silent: false, async: false });
    if (killTasksResult.code !== 0) {
        console.warn("WARNING: kill command returned " + killTasksResult.code);
    }
}

function paramedicKill(platform) {
    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // get platform tasks
    var platformTasks = tasksOnPlatform(platform);

    if (platformTasks.length < 1) {
        console.warn("no known tasks to kill");
    }

    // kill them
    killTasks(platformTasks);

    if (platform === util.ANDROID) {
        killAdbServer();
    }
}

module.exports = paramedicKill;
