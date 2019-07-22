# screaminserver
[![npm version](https://badge.fury.io/js/%40screaminsauce%2Fscreaminserver.svg)](https://badge.fury.io/js/%40screaminsauce%2Fscreaminserver.svg)

[![https://nodei.co/npm/@screaminsauce/screaminserver.png?downloads=true&downloadRank=true&stars=true](https://nodei.co/npm/@screaminsauce/screaminserver.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/@screaminsauce/screaminserver)

## Purpose
The idea behind this project was to build a server that could host:
1) API modules, deployed via hapi.js
2) GUI modules, built via webpack, and deployed to a namespaced folder
3) Both!

By doing this, I can now focus on just writing modules of content that I wish to create, without having to setup the same boilerplate code for Hapi / Webpack.

As an added benefit, this project can be used to horizontally scale your api/gui!

## Docs
[JsDocs](https://screaminsauce.github.io/screaminserver/)

## TODO
1) Look into containerization