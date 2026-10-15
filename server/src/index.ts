import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";

const schema = createSchema({
  typeDefs: `
    type Query {
      hello(name: String): String!
    }
  `,
  resolvers: {
    Query: {
      hello: (_parent, args: { name?: string }) =>
        `Hello, ${args.name ?? "world"}!`,
    },
  },
});

const yoga = createYoga({ schema });
const server = createServer(yoga);

server.listen(4000, () => {
  console.log("GraphQL server on http://localhost:4000/graphql");
});
