## How to run

**Prerequisites:** Node.js 24 (see `.nvmrc`; with nvm, run `nvm install` in the repo root).

### Server (GraphQL API)

```sh
cd server
npm install
npm run dev
```

The GraphQL server runs at http://localhost:4000/graphql (GraphiQL is available at the same URL in a browser).

### Web (React + Vite)

Start the server first, the web app expects the API at http://localhost:4000/graphql

In a second terminal:

```sh
cd web
npm install
npm run dev
```

Open the URL Vite prints (by default http://localhost:5173).

### Tests

```sh
cd server
npm test
```
