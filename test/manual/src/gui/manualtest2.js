'use strict';
const Vue = require('vue/dist/vue');
const axios = require('axios');
const myCss = require('./styles/manualtest.scss');

module.exports = new Vue({
    el: "#app",
    data: function () {
        return {
            greeting: "Hello!"
        }
    },
    mounted: function () {
        axios.get(window.location.origin + "/api/manualtest/greet")
            .then((res)=>{
                console.log(res.data);
                this.greeting = res.data.greeting;
            })
            .catch((err)=>{
                console.log(err);
            })
    },
    methods: {
        runGood: function () {
            axios.post(window.location.origin + "/api/manualtest/greet", {
                greeting: "Ran Great!"
            })
            .then((res)=>{
                console.log(res.data);
                this.greeting = res.data.greeting;
            })
            .catch((err)=>{
                console.log(err);
            })
        },
        runBad: function () {
            axios.post(window.location.origin + "/api/manualtest/greet", {
                greeting: 1
            })
            .then((res)=>{
                console.log(res.data);
                this.greeting = "Error - validation failed";
            })
            .catch((err)=>{
                if (err.statusCode === 400 && err.message === "Invalid request payload input");
                this.greeting = "Validation working correctly."
            })
        },
        runAuth: function(){
            axios.post(window.location.origin + "/api/manualtest/auth")
                .then(()=>{
                    this.greeting = "Authed And Ready"
                    window.location = "/public/manualtest/index2.html";
                })
                .catch((err)=>{
                    console.log(err);
                })
        },
        runTestAuth: function(){
            axios.post(window.location.origin + "/api/manualtest/test-auth")
                .then((res)=>{
                    this.greeting = res.data;
                })
                .catch((err)=>{
                    console.log(err);
                })
        }
    },
    template: `
    <div>
        <h2>{{greeting}}</h2>
        <button v-on:click="runGood">Change Greeting</button>
        <button v-on:click="runBad">Bad Payload</button>
        <button v-on:click="runAuth">Auth</button>
        <button v-on:click="runTestAuth">TestAuth</button>
    </div>
        
    `
})