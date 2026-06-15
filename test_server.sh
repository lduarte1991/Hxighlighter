#!/bin/bash
pnpm exec http-server dist/ -p 9000 -s &
SERVER_PID=$!
sleep 1
pnpm exec c8 mocha --require @babel/register --require ignore-styles --recursive tests
TEST_EXIT=$?
sleep 2
kill -- -$SERVER_PID 2>/dev/null || kill $SERVER_PID 2>/dev/null || true
exit $TEST_EXIT
