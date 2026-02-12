export default async function handler(req, res) {

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;

  try {

    // 1️⃣ Ottieni access token
    const tokenResponse = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({ error: "Token non ottenuto", details: tokenData });
    }

    // 2️⃣ Genera 3 date future (meno rischio timeout)
    const today = new Date();
    const dates = [];

    for (let i = 1; i <= 3; i++) {
      const future = new Date(today);
      future.setDate(today.getDate() + i * 15);
      const formatted = future.toISOString().split("T")[0];
      dates.push(formatted);
    }

    // 3️⃣ Chiamate in parallelo (molto più veloce)
    const pricePromises = dates.map(async (date) => {

      const flightResponse = await fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=MXP&destinationLocationCode=JFK&departureDate=${date}&adults=1&max=3`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        }
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
      return res.status(200).json({ message: "Nessun prezzo trovato" });
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return res.status(200).json({
      route: "MXP → JFK",
      checkedDates: dates,
      prices,
      summary: {
        min: min.toFixed(2),
        max: max.toFixed(2),
        average: avg.toFixed(2)
      }
    });

  } catch (error) {
    return res.status(500).json({ error: "Errore interno", details: error.message });
  }
}
