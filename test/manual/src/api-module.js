const Joi = require('@hapi/joi');

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
        }
    ]
};

module.exports = {
    type: "api",
    name: "manualtest",
    api
}