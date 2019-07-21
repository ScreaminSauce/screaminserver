

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
        }
    ]
};

module.exports = {
    type: "api",
    name: "manualTest",
    api
}