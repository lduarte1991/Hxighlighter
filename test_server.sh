#!/bin/bash
npx http-server dist/ -p 9000 -s &
temp=$!
sleep 1
c8 mocha --require global-jsdom/register --require @babel/register --require ignore-styles --recursive tests
sleep 2
kill -9 $temp
