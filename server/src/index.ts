import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { OpenMeteoGeocodingProvider } from "./providers/open-meteo/OpenMeteoGeocodingProvider.js";

const geocoding = new OpenMeteoGeocodingProvider();

const schema = createSchema({
  typeDefs: `
    type Location {
      id: ID!
      name: String!
      country: String
      region: String
      latitude: Float!
      longitude: Float!
    }

    type Query {
      searchLocations(name: String!): [Location!]!
    }
  `,
  resolvers: {
    Query: {
      searchLocations: (_parent, args: { name: string }) =>
        geocoding.search(args.name),
    },
  },
});

const yoga = createYoga({ schema });
const server = createServer(yoga);

server.listen(4000, () => {
  console.log("GraphQL server on http://localhost:4000/graphql");
});
