import { routes } from "../data/routes.js";

export default function handler(req, res) {

  const { from, maxPoints } = req.query;

  if (!from || !maxPoints) {
    res.status(400).json({ error: "Parametri mancanti" });
    return;
  }

  const filtered = routes
    .filter(r => r.from === from && r.points <= parseInt(maxPoints))
    .sort((a, b) => b.valueScore - a.valueScore);

  res.status(200).json({
    from,
    maxPoints,
    results: filtered
  });
}
