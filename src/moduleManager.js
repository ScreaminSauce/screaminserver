'use strict';
const path = require('path');
const dbConnections = require('./dbConnections');
const _ = require('lodash');


/**
 * Screamin Server module
 * @typedef {Object} Screamin-Module
 * @property {string} name
 * @property {string} type the module type, can be api or gui 
 */


class ModuleManager {
    /**
     * A manager for loading ScreaminServer modules.
     * @param {Bunyan} logger - A Bunyan Logger object
     * @param {HapiServer} server - A server object capable of registering routes
     * @param {Path} wwwDir - A path for output of static assets built in a module.
     */
    constructor(logger, server, {wwwDir = "public", skipUiBuild = false}){
        this._logger = logger;
        this._server = server;
        this._wwwDir = wwwDir;
        this._skipUiBuild = skipUiBuild;

        this._dbConnManager = new dbConnections(this._logger);
        this._hasGuiModules = false;
        this._regGuiModules = {};
    }

    _loadDbConnections(mod){
        if (mod.dbConnections){
            let promArr = [];

            mod.dbConnections.forEach((def)=>{
                promArr.push(this._dbConnManager.createConnection(def));
            })
            return Promise.all(promArr);
        } else {
            return Promise.resolve();
        }
    }

    _loadApi(mod){
        if (mod.api){
            this._logger.info({module: mod.name}, "Registering API Module: " + mod.name);

            let apiModule = mod.api(
                this._logger.child({ apiModule: mod.name + "-api" }), "/api/" + mod.name, this._dbConnManager
            );

            //Add Routes
            apiModule.forEach((route) => {
                this._server.route(route);
            })
        }
        return Promise.resolve();
    }

    _loadGui(mod){
        if (mod.gui){
            this._hasGuiModules = true;
            
            let outputFolder = path.resolve(this._wwwDir + "/" + mod.name);
            let webApp = new mod.gui(outputFolder);

            this._logger.info({module: mod.name}, "Registering/Building WebApp Module: " + mod.name);
            this._logger.info({module: mod.name}, "Deploying to: " + outputFolder);
            
            this._loadGuiModuleApps(webApp);
            if(this._skipUiBuild){
                this._logger.info("skipping build of ui modules")
                return Promise.resolve();
            }
            else{
                return webApp.build(this._logger);
            }
        } else {
            this._logger.info({module: mod.name}, "No WebApp to be built for module: " + mod.name);
            return Promise.resolve();
        }
    }

    _loadGuiModuleApps(webApp){
        let appsToRegister = webApp.getAppInfo();
            
        if (appsToRegister && appsToRegister.length > 0){
            appsToRegister.forEach((app)=>{
                if (_.has(this._regGuiModules, app.regName)){
                    this._logger.error({appToRegister: app}, "Application name has already been registered: " + app.regName)
                    throw new Error("Application name has already been registered: " + app.regName);
                } else {
                    this._regGuiModules[app.regName] = app;
                }
            })
        }
    }

    /**
     * register a {@link Screamin-Module}
     * @param {...Screamin-Module} mod 
     */
    registerModule(mod){
        let promArr = [this._loadDbConnections(mod)];
        switch(mod.type){
            case "api":
                promArr.push(this._loadApi(mod));
            break;
            case "gui":
                promArr.push(this._loadGui(mod));
            break;
        }
        return Promise.all(promArr);
    }

    hasGuiModules(){
        return this._hasGuiModules;
    }

    getGuiAppInfo(){
        return this._regGuiModules;   
    }
}

module.exports = ModuleManager;