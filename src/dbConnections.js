'use strict';
const _ = require('lodash');
const MongodbClient = require('mongodb').MongoClient;

class DbConnections {
    constructor(logger){
        this._logger = logger;
        this._connections = {}
    }

    _connectionExists(config){
        return _.has(this._connections, config.name);
    }

    getConnection(name){
        return new Promise((resolve, reject)=>{
            if (this._connections[name]){
                return resolve(this._connections[name]);
            } else {
                return reject("No connection found with name: " + name);
            }
        })
    }

    createConnection(config){
        this._logger.info({dbConfig: config}, "Creating new DB connection.");
        return new Promise((resolve, reject)=>{
            if (this._connectionExists(config.name)){ resolve(); } else {
                switch(config.type){
                    case "mongo":
                        MongodbClient.connect(config.url, (err, client)=>{
                            if (err) { return reject(err); }
                            this._connections[config.name] = client.db(config.dbName);
                            return resolve();
                        })
                    break;
                }
            }
        })
    }

    //closeConnection(name){} - To be implemented...
}

module.exports = DbConnections;