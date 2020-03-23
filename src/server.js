'use strict';

const hapi = require('@hapi/hapi');
const inert = require('@hapi/inert');
const vision = require('@hapi/vision');
const joi = require('@hapi/joi');
const bunyan = require('bunyan');
const path = require('path');
const _ = require('lodash');

const HapiAuthCookie = require('@hapi/cookie');
const ModuleManager = require('./moduleManager');

/**
 * 
 *
 * @class ScreaminServer
 */
class ScreaminServer {
    constructor(config) {
        this._config = _.defaultsDeep(config, {
            options: {
                port: 3000,
                host: 'localhost'
            },
            skipUiBuild: false,
            wwwDir: "public"
        });
        this._server = hapi.Server(this._config.options);
        this._server.validator(joi);
        this._logger = bunyan.createLogger({ name: this._config.name, serializers:bunyan.stdSerializers });
        this._moduleManager = new ModuleManager(this._logger, this._server, this._config);
    }

    _registerAuthentication(){
        if(this._config.auth){
            return this._server.register(HapiAuthCookie)
                .then(()=>{
                    const cache = this._server.cache({ segment: 'sessions', expiresIn: this._config.auth.sessionDurationInMillis || 24 * 60 * 60 * 1000 });
                    this._server.app.cache = cache;

                    let options = {
                        cookie: {
                            ttl: this._config.auth.cookieDurationInMillis || 24 * 60 * 60 * 1000,
                            name: this._config.auth.cookieName || "screaminCookie",
                            password: this._config.auth.secret,
                            isSecure: this._config.auth.isSecure || false,
                            isSameSite: "Lax"
                        },
                        redirectTo: this._config.auth.redirectTo || false,
                        validateFunc: async (request, session) => {
                            try {
                                const cached = await cache.get(session.sid);
                                const out = {
                                    valid: !!cached
                                };
                    
                                if (out.valid) {
                                    out.credentials = cached.account;
                                    out.credentials.scope = cached.account.authorizedApps;
                                }
                    
                                return out;
                            } catch (err){
                                this._logger.error({err, session, sessionSid: session.sid}, "Error running validation function.");
                                return {valid: false};
                            }
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
                
                if (this._config.defaultGuiRoute){
                    this._server.route({
                        method: 'GET',
                        path: '/',
                        handler: (response, h)=>{
                            return h.redirect(this._config.defaultGuiRoute)
                        },
                        config: {
                            auth: false
                        }
                    });
                }
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