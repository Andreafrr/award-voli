// Cache in memoria
const cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minuti

import { routes } from "../data/routes.js";

export default async function handler(req, res) {

  const { from, maxPoints } = req.query;

  if (!from || !maxPoints) {
    return res.status(400).json({ error: "Parametri mancanti" });
  }

  const filtered = routes
    .filter(r => r.from === from && r.points <= parseInt(maxPoints))
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 3); // prendiamo solo top 3

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;

  // 🔐 Otteniamo token Amadeus
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

  // 🔎 Funzione per calcolare range cash
  async function getCashRange(origin, destination) {

    const cacheKey = `${origin}-${destination}`;
    const now = Date.now();

    // Se in cache e non scaduto
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
      return cache[cacheKey].data;
    }

    const today = new Date();
    const dates = [];

 for (let i = 1; i <= 2; i++) {
      const future = new Date(today);
      future.setDate(today.getDate() + i * 15);
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

    if (prices.length === 0) {
      return null;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    const summary = { min, max, average: avg };

    // Salviamo in cache
    cache[cacheKey] = {
      timestamp: now,
      data: summary
    };

    return summary;
  }

  // 🔥 Calcolo finale con cash reale
  const enriched = await Promise.all(filtered.map(async (route) => {

    const cashData = await getCashRange(route.from, route.destinationCode);

    if (!cashData) {
      return route;
    }

    const estimatedValue =
      ((cashData.average - route.taxes) / route.points) * 100;

    return {
      ...route,
      cashMin: cashData.min.toFixed(2),
      cashMax: cashData.max.toFixed(2),
      cashAverage: cashData.average.toFixed(2),
      estimatedValue: estimatedValue.toFixed(2)
    };
  }));

  enriched.sort((a, b) => b.estimatedValue - a.estimatedValue);

  return res.status(200).json({
    from,
    maxPoints,
    results: enriched
  });
}
