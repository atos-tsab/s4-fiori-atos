#!/bin/bash

rm -rf dist
npm run "build"
git checkout master
git add .
git commit
git push
npm run "deploy_autogen"