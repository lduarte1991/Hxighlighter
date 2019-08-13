#!/bin/bash
node server.js &
temp=$!
nyc mocha --require @babel/register --require ignore-styles --recursive tests
sleep 2
kill -9 $temp
