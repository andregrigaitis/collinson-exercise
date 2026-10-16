import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { OpenMeteoForecastProvider } from "./providers/open-meteo/OpenMeteoForecastProvider.js";
import { OpenMeteoGeocodingProvider } from "./providers/open-meteo/OpenMeteoGeocodingProvider.js";

const geocoding = new OpenMeteoGeocodingProvider();
const forecast = new OpenMeteoForecastProvider();

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

    type DailyWeather {
      date: String!
      apparentTemperatureMax: Float
      precipitationSum: Float
      precipitationHours: Float
      windSpeedMax: Float
      windGustsMax: Float
      sunshineDuration: Float
      daylightDuration: Float
      weatherCode: Int
    }

    type Query {
      searchLocations(name: String!): [Location!]!
      dailyForecast(latitude: Float!, longitude: Float!): [DailyWeather!]!
    }
  `,
  resolvers: {
    Query: {
      searchLocations: (_parent, args: { name: string }) =>
        geocoding.search(args.name),
      dailyForecast: (
        _parent,
        args: { latitude: number; longitude: number },
      ) => forecast.daily(args.latitude, args.longitude),
    },
  },
});

const yoga = createYoga({ schema });
const server = createServer(yoga);

server.listen(4000, () => {
  console.log("GraphQL server on http://localhost:4000/graphql");
});
