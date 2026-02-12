export default async function handler(req, res) {

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;

  try {

    // 1️⃣ Otteniamo access token
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

    // 2️⃣ Facciamo una chiamata test: Milano → New York
    const flightResponse = await fetch(
      "https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=MXP&destinationLocationCode=JFK&departureDate=2026-03-10&adults=1&max=3",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    const flightData = await flightResponse.json();

    return res.status(200).json({
      message: "Connessione Amadeus OK",
      sample: flightData.data ? flightData.data.slice(0,1) : flightData
    });

  } catch (error) {
    return res.status(500).json({ error: "Errore interno", details: error.message });
  }
}
