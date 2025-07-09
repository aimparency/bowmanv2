#Summits 

## Tech overview
This project uses 
- Vite 
  - uses native esmodules (simply serves files) 
  - does no typechecking during dev (leaves this up to the IDE) 
  - typechecking only on build
- Vue 3+ as frontend framwork
- Pinia as data stores 
- TypeScript

## Local dev setup
After cloning the repository, run `yarn` to install dependencies. 

Also copy the `Summit.json` and `Aim.json` contract artifact from the contract repo's `/artifacts/contracts/*.sol/` into `./src/`. You might want to symlink in case you are working on the contracts as well. 

Run `yarn dev` to spin up a dev server. 

