'use strict';
const hapi = require('hapi');
const path = require('path');
const inert = require('inert');
const vision = require('vision');
const bunyan = require('bunyan');
const MongodbClient = require('mongodb').MongoClient;

class ScreaminServer {
    constructor(config) {
        this._config = config;
        this._server = hapi.Server(config.options);
        this._logger = bunyan.createLogger({
            name: config.name
        });
        this._dbConnections = {};
    }

    _intializeDbConnections() {
        //For now, I am gonna use mongodb
        //TODO: Allow db connections to be private from api modules? Think about it.
        let dbConnections = this._config.dbConnections;
        let promArr = [];

        if (dbConnections && dbConnections.length > 0){
            dbConnections.forEach((dbConn)=>{
                promArr.push(new Promise((resolve, reject)=>{
                    MongodbClient.connect(dbConn.url, (err, client)=>{
                        if (err) { return reject(err); }
                        this._dbConnections[dbConn.name] = client.db(dbConn.dbName);
                        return resolve();
                    })
                }))
            })
        }

        return Promise.all(promArr);
    }

    _initializeApiServer() {
        //Read in specified modules and register their routes.
        return this._intializeDbConnections()
            .then(()=>{
                let modules = this._config.modules;
                modules.forEach((mod) => {
                    this._logger.info("Registering API Module: " + mod.name);
                    
                    let apiModule = new mod.api(
                        this._logger.child({
                            apiModule: mod.name + "-api"
                        }), {
                            basePath: "/api/" + mod.name,
                            dbConnections: this._dbConnections
                        }
                    );
                    
                    //Add Routes
                    apiModule.getEndpoints().forEach((route) => {
                        this._server.route(route);
                    })
                })
            })
            .catch((err)=>{
                this._logger.error({error: err}, "Error starting up api server.");
                process.exit(1);
            })   
    }

    _initializeWebAppServer() {
        
        this._server.register(inert);
        this._server.register(vision);

        let modules = this._config.modules;
        let buildDir = this._config.wwwDir;

        let promArr = [];
        modules.forEach((mod) => {
            let outputFolder = path.resolve(buildDir + "/" + mod.name);

            this._logger.info("Registering/Building WebApp Module: " + mod.name);
            this._logger.info("Deploying to: " + outputFolder);

            let webAppModule = new mod.gui(outputFolder);
            promArr.push(webAppModule.build());
        })

        return Promise.all(promArr)
            .then(() => {
                console.log("Resolved promise!")
                this._server.route({
                    method: 'GET',
                    path: '/'+ buildDir +'/{param*}',
                    handler: {
                        directory: {
                            path: path.resolve(buildDir),
                            listing: true
                        }
                    }
                })
            })
            .catch((err)=>{
                this._logger.error({error: err}, "Error starting up webapp server.");
                process.exit(1);
            })
    }

    startup() {
        let prom = Promise.resolve();
        switch (this._config.type) {
            case "api":
                prom = this._initializeApiServer();
                break;
            case "gui":
                prom = this._initializeWebAppServer();
                break;
            case "both":
                prom = this._initializeApiServer()
                    .then(() => {
                        return this._initializeWebAppServer();
                    })
                break;
            default:
                this._logger.error("Invalid server type:" + this._config.type + " - Valid values are: 'api' | 'gui' | 'both'");
                break;
        }

        return prom
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