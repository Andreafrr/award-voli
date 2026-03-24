import fs from "fs";

export default function handler(req, res){

  try{

    const data = JSON.parse(
      fs.readFileSync("./data/awards.json")
    );

    res.status(200).json(data);

  }catch{
    res.status(200).json([]);
  }

}
