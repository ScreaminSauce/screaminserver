'use strict';
const hapi = require('hapi');
const path = require('path');
const inert = require('inert');
const vision = require('vision');
const bunyan = require('bunyan');
const dbConnections = require('./dbConnections');

class ScreaminServer {
    constructor(config) {
        this._config = config;
        this._server = hapi.Server(config.options);
        this._logger = bunyan.createLogger({
            name: config.name
        });
        this._dbConnections = new dbConnections(this._logger);
    }

    _initializeDbConnections() {
        //Read in specified modules and register their db connections.
        if (this._config.type == "api" || "both") {
            let promArr = [];
            let modules = this._config.modules;
            modules.forEach((mod) => {
                if (mod.dbConnections) {
                    mod.dbConnections.forEach((dbConn) => {
                        promArr.push(this._dbConnections.createConnection(dbConn));
                    })
                }
            })

            return Promise.all(promArr)
                .catch((err) => {
                    this._logger.error({
                        error: err
                    }, "Error initializing db connections: ");
                    process.exit(1);
                })
        } else {
            return Promise.resolve();
        }
    }

    _initializeApiServices() {
        //Read in specified modules and register their routes.
        if (this._config.type == "api" || "both") {
            let modules = this._config.modules;

            modules.forEach((mod) => {
                if (mod.api) {
                    this._logger.info("Registering API Module: " + mod.name);

                    //Instantiate API class, feeding it needed configuration.
                    let apiModule = mod.api(
                        this._logger.child({
                            apiModule: mod.name + "-api"
                        }), "/api/" + mod.name, this._dbConnections
                    );

                    //Add Routes
                    apiModule.forEach((route) => {
                        this._server.route(route);
                    })
                } else {
                    this._logger.info("No API service for module: " + mod.name);
                }
            })

        }

        return Promise.resolve();
    }

    _initializeWebAppServices() {
        if (this._config.type == "gui" || "both") {
            this._server.register(inert);
            this._server.register(vision);
    
            let modules = this._config.modules;
            let buildDir = this._config.wwwDir;
            
            let promArr = [Promise.resolve()]
    
            modules.forEach((mod) => {
                if (mod.gui) {
                    let outputFolder = path.resolve(buildDir + "/" + mod.name);
    
                    this._logger.info("Registering/Building WebApp Module: " + mod.name);
                    this._logger.info("Deploying to: " + outputFolder);
    
                    let webAppModule = new mod.gui(outputFolder);
                    promArr.push(webAppModule.build());
                } else {
                    this._logger.info("No WebApp to be built for module: " + mod.name);
                }
            })
    
            return Promise.all(promArr)
                .then(() => {
                    this._server.route({
                        method: 'GET',
                        path: '/' + this._config.wwwDir + '/{param*}',
                        handler: {
                            directory: {
                                path: path.resolve(this._config.wwwDir),
                                listing: true
                            }
                        }
                    })
                })
                .catch((err) => {
                    this._logger.error({
                        error: err
                    }, "Error starting up webapp server.");
                    process.exit(1);
                })
        } else {
            return Promise.resolve();
        }
    }

    startup() {
        return this._initializeDbConnections()
            .then(() => {
                return this._initializeApiServices();
            })
            .then(() => {
                return this._initializeWebAppServices();
            })
            .then(() => {
                return this._server.start();
            })
            .then(() => {
                this._logger.info(`Server started: http://${this._config.options.host}:${this._config.options.port}`);
            })
            .catch((err) => {
                this._logger.error({
                    error: err
                }, "Error during server startup.")
            })
    }

    shutdown() {
        return this._server.stop()
            .then(() => {
                this._logger.info("Server stopped");
            })
    }
}

module.exports = ScreaminServer;