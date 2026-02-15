// Cache in memoria
const cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minuti

import { routes } from "../data/routes.js";

export default async function handler(req, res) {

  try {

    const { from, maxPoints } = req.query;

    if (!from || !maxPoints) {
      return res.status(400).json({ error: "Parametri mancanti" });
    }

    const parsedMaxPoints = parseInt(maxPoints);

    const filtered = routes
      .filter(r => r.from === from)
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 3);

    const key = process.env.AMADEUS_API_KEY;
    const secret = process.env.AMADEUS_API_SECRET;

    const tokenResponse = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({ error: "Token Amadeus non ottenuto" });
    }

    async function getCashRange(origin, destination) {

      const cacheKey = `${origin}-${destination}`;
      const now = Date.now();

      if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
        return cache[cacheKey].data;
      }

      const today = new Date();
      const dates = [];

      for (let i = 1; i <= 2; i++) {
        const future = new Date(today);
        future.setDate(today.getDate() + i * 20);
        dates.push(future.toISOString().split("T")[0]);
      }

      const pricePromises = dates.map(async (date) => {

        const flightResponse = await fetch(
          `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1&max=3`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );

        const flightData = await flightResponse.json();

        if (flightData.data && flightData.data.length > 0) {
          return Math.min(
            ...flightData.data.map(f => parseFloat(f.price.total))
          );
        }

        return null;
      });

      const results = await Promise.all(pricePromises);
      const prices = results.filter(p => p !== null);

      if (prices.length === 0) return null;

      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

      const summary = { min, max, average: avg };

      cache[cacheKey] = {
        timestamp: now,
        data: summary
      };

      return summary;
    }

    const enriched = await Promise.all(filtered.map(async (route) => {

      const cashData = await getCashRange(route.from, route.destinationCode);

      const missingPoints = route.points - parsedMaxPoints;

      if (!cashData) {
        return {
          ...route,
          opportunityScore: 0,
          missingPoints: missingPoints > 0 ? missingPoints : 0
        };
      }

      const estimatedValue =
        ((cashData.average - route.taxes) / route.points) * 100;

      const value = parseFloat(estimatedValue);

let valueScore;

if (value >= 3) valueScore = 100;
else if (value >= 2.5) valueScore = 95;
else if (value >= 2) valueScore = 75;
else if (value >= 1.5) valueScore = 45;
else if (value >= 1.2) valueScore = 25;
else valueScore = 5;

      let difficultyScore = 70;
      if (route.difficulty === 1) difficultyScore = 100;
      if (route.difficulty === 2) difficultyScore = 70;
      if (route.difficulty === 3) difficultyScore = 40;

      const seasonScore = 80;

      let budgetScore = 100;
      if (missingPoints > 0) {
        budgetScore = Math.max(20, 100 - (missingPoints / route.points) * 100);
      }

      const opportunityScore = (
        valueScore * 0.5 +
        difficultyScore * 0.2 +
        seasonScore * 0.15 +
        budgetScore * 0.15
      );

      return {
        ...route,
        cashMin: cashData.min.toFixed(2),
        cashMax: cashData.max.toFixed(2),
        cashAverage: cashData.average.toFixed(2),
        estimatedValue: value.toFixed(2),
        opportunityScore: Math.round(opportunityScore),
        missingPoints: missingPoints > 0 ? missingPoints : 0
      };
    }));

    enriched.sort((a, b) => b.opportunityScore - a.opportunityScore);

    return res.status(200).json({
      from,
      maxPoints,
      results: enriched
    });

  } catch (error) {
    return res.status(500).json({
      error: "Errore interno server",
      details: error.message
    });
  }
}
