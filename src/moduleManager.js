'use strict';
const path = require('path');
const dbConnections = require('./dbConnections');

class ModuleManager {
    constructor(logger, type, server, wwwDir){
        this._logger = logger;
        this._type = type;
        this._server = server;
        this._wwwDir = wwwDir;
        this._dbConn = new dbConnections(this._logger);
        this._hasGuiModules = false;
        this._regGuiModules = {};
    }

    _loadApi(mod){
        let prom = Promise.resolve();
        
        if (mod.dbConnections){
            prom = prom.then(()=>{ return this._loadDbConnections(mod.dbConnections) })
        }
        
        if (mod.api){
            prom = prom.then(()=>{
                this._logger.info("Registering API Module: " + mod.name);

                //API class, feeding it needed configuration.
                let apiModule = mod.api(
                    this._logger.child({
                        apiModule: mod.name + "-api"
                    }), "/api/" + mod.name, this._dbConn
                );

                //Add Routes
                apiModule.forEach((route) => {
                    this._server.route(route);
                })
            })
        }
        return prom;
    }

    _loadWebApp(mod){
        if (mod.gui){
            this._hasGuiModules = true;
            let outputFolder = path.resolve(this._wwwDir + "/" + mod.name);
    
            this._logger.info("Registering/Building WebApp Module: " + mod.name);
            this._logger.info("Deploying to: " + outputFolder);

            let webAppModule = new mod.gui(outputFolder);
            this._regGuiModules[mod.name] = webAppModule.getAppInfo();

            return webAppModule.build(this._logger);
        } else {
            this._logger.info("No WebApp to be built for module: " + mod.name);
            return Promise.resolve();
        }
    }

    _loadDbConnections(dbConnections){
        let promArr = [Promise.resolve()];
        dbConnections.forEach((def)=>{
            promArr.push(this._dbConn.createConnection(def));
        })
        return Promise.all(promArr);
    }

    hasGuiModules(){
        return this._hasGuiModules;
    }

    registerModule(mod){
        let prom;
        switch(this._type){
            case "api":
                prom = this._loadApi(mod);
            break;
            case "gui":
                prom = this._loadWebApp(mod);
            break;
            case "both":
                prom = this._loadApi(mod)
                    .then(()=>{
                        return this._loadWebApp(mod);
                    })
            break;
            default:
                throw new Error("Unknown server type: " + type);
        }
        return prom;
    }

    getGuiAppInfo(){
        return this._regGuiModules;   
    }
}

module.exports = ModuleManager;