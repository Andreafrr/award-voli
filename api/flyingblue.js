import { searchAward } from "../../scraper.js";

export default async function handler(req, res) {

  const { from, to, date } = req.query;

  const data = await searchAward(from, to, date);

  res.status(200).json({
    results: data
  });

}
