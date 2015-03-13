npm install ny -g
for version in  0.8 0.10 0.12 1.2 1.5
do
    ny $version
    node --version
    rm -rf ./node_modules
    npm install --silent
    npm test
done
