export default async function handler(req, res) {

  try {

    const { email, destination, months } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email mancante" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Viaggi Punti <onboarding@resend.dev>",
        to: email,
        subject: `✈️ È il momento di prenotare ${destination}`,
        html: `
          <h2>Ci siamo! ✈️</h2>
          <p>Tra circa ${months} mesi puoi prenotare <b>${destination}</b></p>
          <p>Controlla il sito e blocca il volo migliore 😉</p>
        `
      })
    });

    const data = await response.json();

    res.status(200).json({ success: true, data });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

}
