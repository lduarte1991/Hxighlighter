#!/bin/bash
pnpm exec http-server dist/ -p 9000 -s &
temp=$!
sleep 1
pnpm exec c8 mocha --require @babel/register --require ignore-styles --recursive tests
sleep 2
kill -9 $temp
