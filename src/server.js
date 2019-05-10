'use strict';

const hapi = require('hapi');
const inert = require('inert');
const vision = require('vision');
const bunyan = require('bunyan');
const path = require('path');
const _ = require('lodash');

const HapiAuthCookie = require('hapi-auth-cookie');
const ModuleManager = require('./moduleManager');

class ScreaminServer {
    constructor(config) {
        this._config = _.defaultsDeep(config, {
            options: {
                port: 3000,
                host: 'localhost'
            },
            wwwDir: "public"
        });
        this._server = hapi.Server(this._config.options);
        this._logger = bunyan.createLogger({ name: this._config.name, serializers:bunyan.stdSerializers });
        this._moduleManager = new ModuleManager(this._logger, this._config.type, this._server, this._config.wwwDir);
    }

    _registerAuthentication(){
        if(this._config.auth){
            const cache = this._server.cache({ segment: 'sessions', expiresIn: 24 * 60 * 60 * 1000 });
            this._server.app.cache = cache;

            return this._server.register(HapiAuthCookie)
                .then(()=>{
                    let options = {
                        password: this._config.auth.secret,
                        cookie: this._config.auth.cookieName || "screaminCookie",
                        isSecure: this._config.auth.isSecure || false,
                        redirectTo: this._config.auth.redirectTo || false,
                        validateFunc: async (request, session) => {
                            
                            const cached = await cache.get(session.sid);
                            const out = {
                                valid: !!cached
                            };
                
                            if (out.valid) {
                                out.credentials = cached.account;
                                out.credentials.scope = cached.account.authorizedApps;
                            }
                
                            return out;
                        }
                    }
                    this._server.auth.strategy('session', 'cookie', options);
                    this._server.auth.default('session');
                })
        }
    }

    _registerStaticRoutes(){
        return Promise.all([
            this._server.register(inert), 
            this._server.register(vision)
        ])
            .then(()=>{
                this._server.route({
                    method: 'GET',
                    path: '/' + this._config.wwwDir + '/{param*}',
                    handler: {
                        directory: {
                            path: path.resolve(this._config.wwwDir),
                            listing: true
                        }
                    },
                    config: {
                        auth: false
                    }
                });
                this._server.route({
                    method: 'GET',
                    path: '/api/reserved/appInfo',
                    handler: ()=>{
                        return this._moduleManager.getGuiAppInfo();
                    },
                    config: {
                        auth: false
                    }
                });
            })
    }

    _registerModules(){
        if (_.has(this._config, "modules" ) && this._config.modules.length > 0){
            let promArr = [];
            this._config.modules.forEach((mod)=>{
                promArr.push(this._moduleManager.registerModule(mod));
            })
            return Promise.all(promArr);
        } 
    }

    startup(){
        return this._registerAuthentication()
            .then(()=>{
                return this._registerModules();
            })
            .then(()=>{
                if (this._moduleManager.hasGuiModules()){
                    return this._registerStaticRoutes();
                }
            })
            .then(()=>{
                return this._server.start();
            })
            .then(()=>{
                this._logger.info(`Server started: http://${this._config.options.host}:${this._config.options.port}`);
            })
            
    }

    shutdown() {
        return this._server.stop()
            .then(() => {
                this._logger.info("Server stopped");
            })
            .catch((err)=>{
                this._logger.error({error: err}, "Error stopping server");
            })
    }
}

module.exports = ScreaminServer;