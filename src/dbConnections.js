'use strict';

const _ = require('lodash');
const MongodbClient = require('mongodb').MongoClient;
const Knex = require('knex');

class DbConnections {
    constructor(logger){
        this._logger = logger;
        this._connections = {};
    }

    _connectionExists(name){
        return _.has(this._connections, name);
    }

    getConnection(name){
        if (this._connections[name]){
            return this._connections[name];
        } else {
            throw new Error(".getConnection() - No connection found with name: " + name);
        }
    }

    createConnection(config){
        this._logger.info("Creating new DB connection: " + config.name);

        return new Promise((resolve, reject)=>{
            if (this._connectionExists(config.name)){ 
                return resolve(); 
            } else {
                switch(config.type){
                    case "mongo":
                        MongodbClient.connect(config.url, { useNewUrlParser: true }, (err, client)=>{
                            if (err) { return reject(err); }
                            this._connections[config.name] = client.db(config.dbName);
                            return resolve();
                        })
                        break;
                    case "mysql":
                        return Promise.resolve()
                            .then(()=>{
                                return Knex({
                                    client: 'mysql',
                                    version: '5.7',
                                    connection : {
                                        host: config.host,
                                        user: config.user,
                                        password: config.password,
                                        database: config.dbName
                                    }
                                })
                            })
                            .then((knexClient)=>{
                                this._connections[config.name] = knexClient;
                                return resolve()
                            })
                            .catch((err)=>{
                                return reject(err);
                            })
                        break;  
                }
            }
        })
    }
}

module.exports = DbConnections;