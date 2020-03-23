const Joi = require('@hapi/joi');
const uuidv4 = require('uuid/v4');

let api = (logger, basePath, dbConns) => {
    return [
        {
            method: "GET",
            path: basePath + "/greet",
            handler: (request, h) => {
                return { 'greeting': "Hello World!" }
            },
            config: {
                auth: false
            }
        },
        {
            method: "POST",
            path: basePath + "/greet",
            handler: (request, h) => {
                return { 'greeting': request.payload.greeting }
            },
            config: {
                auth: false,
                validate: {
                    payload:{
                        greeting: Joi.string().required()
                    }
                }
            }
        },
        {
            method: "POST",
            path: basePath + "/auth",
            handler: (request, h) => {
                let sid = uuidv4();
                return request.server.app.cache.set(sid, {account: {name: "Jeff", authorizedApps: ["this1"]}}, 0)
                    .then(()=>{
                        request.cookieAuth.set({sid: sid});
                        return {sid};
                    })  
            },
            config: {
                auth: false
            }
        },
        {
            method: "POST",
            path: basePath + "/test-auth",
            handler: (request, h) => {
                return {isAuthed: true};
                
            },
            config: {
                auth: {
                    access: {
                        scope: ["+this1"]
                    }
                }
            }
        }
    ]
};

module.exports = {
    type: "api",
    name: "manualtest",
    api
}