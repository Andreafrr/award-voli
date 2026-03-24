import fs from "fs";

export async function saveResult(result){

  const filePath = "./data/awards.json";

  let data = [];

  try {
    data = JSON.parse(fs.readFileSync(filePath));
  } catch {}

  data.push({
    ...result,
    timestamp: new Date()
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
