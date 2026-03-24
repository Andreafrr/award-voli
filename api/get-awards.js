import { data } from "./cron-scraper";

export default function handler(req, res){
  res.status(200).json(data || []);
}
