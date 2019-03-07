'use strict';

const _ = require('lodash');
const MongodbClient = require('mongodb').MongoClient;

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
        this._logger.info({dbConfig: config}, "Creating new DB connection.");
        return new Promise((resolve, reject)=>{
            if (this._connectionExists(config.name)){ return resolve(); } else {
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

    addConnection(name, connection){
        if (this._connectionExists(name)){
            throw new Error("Connection name in use.")
        } else {
            this._connections[name] = connection;
        }
    }

    //closeConnection(name){} - To be implemented...
}

module.exports = DbConnections;