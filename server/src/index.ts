import { createServer } from "node:http";
import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import { OpenMeteoForecastProvider } from "./providers/open-meteo/OpenMeteoForecastProvider.js";
import { OpenMeteoGeocodingProvider } from "./providers/open-meteo/OpenMeteoGeocodingProvider.js";
import { OpenMeteoMarineProvider } from "./providers/open-meteo/OpenMeteoMarineProvider.js";
import { IndoorScorer } from "./scoring/indoor/IndoorScorer.js";
import { OutdoorScorer } from "./scoring/outdoor/OutdoorScorer.js";
import { SurfScorer } from "./scoring/surf/SurfScorer.js";
import {
  ForecastService,
  ForecastUnavailableError,
} from "./services/ForecastService.js";

const geocoding = new OpenMeteoGeocodingProvider();
const forecast = new OpenMeteoForecastProvider();
const marine = new OpenMeteoMarineProvider();
const outdoorScorer = new OutdoorScorer();
const forecastService = new ForecastService(forecast, marine, [
  new SurfScorer(),
  outdoorScorer,
  new IndoorScorer(outdoorScorer),
]);

type Coordinates = { latitude: number; longitude: number };

function validateCoordinates({ latitude, longitude }: Coordinates): void {
  const problems = [
    (latitude < -90 || latitude > 90) && "latitude must be between -90 and 90",
    (longitude < -180 || longitude > 180) &&
      "longitude must be between -180 and 180",
  ].filter(Boolean);
  if (problems.length > 0) {
    throw new GraphQLError(`Invalid coordinates: ${problems.join("; ")}`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

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

    enum Activity {
      SKIING
      SURFING
      OUTDOOR_SIGHTSEEING
      INDOOR_SIGHTSEEING
    }

    type ScoreFactor {
      name: String!
      subScore: Float!
      weight: Float!
      detail: String!
    }

    type DayScore {
      date: String!
      score: Float
      factors: [ScoreFactor!]!
      gate: String
      penalty: String
      missingData: String
    }

    type ActivityForecast {
      activity: Activity!
      applicable: Boolean!
      reason: String
      bestDate: String
      days: [DayScore!]!
    }

    type Query {
      searchLocations(name: String!): [Location!]!
      activityForecast(latitude: Float!, longitude: Float!): [ActivityForecast!]!
      "Raw Open-Meteo data, for debugging."
      dailyForecast(latitude: Float!, longitude: Float!): [DailyWeather!]!
    }
  `,
  resolvers: {
    Query: {
      searchLocations: (_parent, args: { name: string }) =>
        geocoding.search(args.name),
      activityForecast: async (_parent, args: Coordinates) => {
        validateCoordinates(args);
        try {
          return await forecastService.activityForecast(
            args.latitude,
            args.longitude,
          );
        } catch (error) {
          if (!(error instanceof ForecastUnavailableError)) throw error;
          // Log the real cause; the client only gets a safe message.
          console.error(error.cause);
          throw new GraphQLError(
            "The weather service is unavailable right now. Please try again.",
            { extensions: { code: "FORECAST_UNAVAILABLE" } },
          );
        }
      },
      dailyForecast: (_parent, args: Coordinates) => {
        validateCoordinates(args);
        return forecast.daily(args.latitude, args.longitude);
      },
    },
  },
});

const yoga = createYoga({ schema });
const server = createServer(yoga);

server.listen(4000, () => {
  console.log("GraphQL server on http://localhost:4000/graphql");
});
