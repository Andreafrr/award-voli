export default function handler(req, res) {
  const { from, to } = req.query;

  if (!from || !to) {
    res.status(400).json({ error: "Parametri mancanti" });
    return;
  }

  // Simulazione risultati (per ora)
  const results = [
    {
      program: "Flying Blue",
      miles: 55000,
      taxes: 220,
      value: "Buono"
    },
    {
      program: "British Airways Avios",
      miles: 42500,
      taxes: 480,
      value: "Scarso"
    },
    {
      program: "ITA Airways Volare",
      miles: 60000,
      taxes: 150,
      value: "Ottimo"
    }
  ];

  res.status(200).json({
    route: `${from} → ${to}`,
    results: results
  });
}
