#!/bin/sh
set -e

node /app/scripts/runtime-env.mjs
exec node /app/dist/backpacking/server/server.mjs
