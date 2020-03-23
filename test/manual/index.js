'use strict';
const ScreaminServer = require('../../src/server');
const TestApiModule = require("./src/api-module");
const TestGuiModule = require("./src/gui-module");

const ENV_NAME = process.env.ENV_NAME || "screaminmanualtest";

const APPLICATION_PORT = process.env.APPLICATION_PORT || 8081;
const COOKIE_AUTH_SECRET = process.env.COOKIE_AUTH_SECRET || 'ThisIsATestSecretThisIsATestSecretThisIsATestSecret';
const COOKIE_AUTH_NAME = process.env.COOKIE_AUTH_NAME || "testcookie";
const COOKIE_AUTH_ISSECURE = process.env.COOKIE_AUTH_ISSECURE || false;


let server = new ScreaminServer({
    name: 'manualTestServer',
    options: {
        port: APPLICATION_PORT,
        host: '0.0.0.0'
    },
    skipUiBuild: false,
    modules: [TestApiModule,TestGuiModule],
    auth: {
        sessionDurationInMillis: 1000 * 60 * 60 * 24 * 30,
        cookieDurationInMillis: 1000 * 60 * 60 * 24 * 30,
        secret: COOKIE_AUTH_SECRET,
        cookieName: COOKIE_AUTH_NAME,
        isSecure: COOKIE_AUTH_ISSECURE
    },
    defaultGuiRoute: "/public/manualtest/index.html"
});

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
})

server.startup()
    .catch((err) => {
        console.log(err);
        console.log("Error starting system");
        process.exit(1);
    })