const { routes } = require("../data/routes.js")

const cache = {}
const CACHE_TTL = 30 * 60 * 1000

function getMRRequired(program, airlinePoints){

const rates={
"Avios (Iberia / BA)":5/4,
"Flying Blue":3/2,
"Emirates Skywards":5/2,
"Singapore KrisFlyer":3/2,
"ITA Volare":1
}

const rate=rates[program]||1
return Math.ceil(airlinePoints*rate)

}

module.exports=async function handler(req,res){

try{

const {from,maxMR}=req.query

if(!from||!maxMR){
return res.status(400).json({error:"Parametri mancanti"})
}

const parsedMaxMR=parseInt(maxMR)

const filtered=routes.filter(r=>r.from===from)

const key=process.env.AMADEUS_API_KEY
const secret=process.env.AMADEUS_API_SECRET

const tokenResponse=await fetch(
"https://test.api.amadeus.com/v1/security/oauth2/token",
{
method:"POST",
headers:{"Content-Type":"application/x-www-form-urlencoded"},
body:`grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
}
)

const tokenData=await tokenResponse.json()
const accessToken=tokenData.access_token

if(!accessToken){
return res.status(500).json({error:"Token Amadeus non ottenuto"})
}

async function getCashRange(origin,destination,cabin){

const cacheKey=`${origin}-${destination}-${cabin}`
const now=Date.now()

if(cache[cacheKey]&&(now-cache[cacheKey].timestamp<CACHE_TTL)){
return cache[cacheKey].data
}

let travelClass="ECONOMY"

if(cabin==="Business") travelClass="BUSINESS"
if(cabin==="First") travelClass="FIRST"
if(cabin==="Premium Economy") travelClass="PREMIUM_ECONOMY"

const today=new Date()
const offsets=[20,40,60]

const prices=await Promise.all(offsets.map(async(days)=>{

const future=new Date(today)
future.setDate(today.getDate()+days)

const date=future.toISOString().split("T")[0]

const response=await fetch(
`https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${date}&adults=1&max=3&travelClass=${travelClass}`,
{headers:{Authorization:`Bearer ${accessToken}`}}
)

const data=await response.json()

if(data.data&&data.data.length>0){
return Math.min(...data.data.map(f=>parseFloat(f.price.total)))
}

return null

}))

const valid=prices.filter(p=>p!==null)

if(valid.length===0) return null

const min=Math.min(...valid)
const max=Math.max(...valid)
const avg=valid.reduce((a,b)=>a+b,0)/valid.length

const result={min,max,average:avg}

cache[cacheKey]={timestamp:now,data:result}

return result

}

const enriched=await Promise.all(filtered.map(async(route)=>{

const cashData=await getCashRange(route.from,route.destinationCode,route.cabin)

const mrRequired=getMRRequired(route.program,route.points)

const mrMissing=mrRequired-parsedMaxMR

const gapRatio=mrMissing>0?mrMissing/mrRequired:0

let value=0

if(cashData&&cashData.average){
value=((cashData.average-route.taxes)/route.points)*100
}

const valueScore=Math.min(100,value*60)

let difficultyScore=70

if(route.difficulty===1)difficultyScore=100
if(route.difficulty===2)difficultyScore=70
if(route.difficulty===3)difficultyScore=40

let budgetScore=100

if(mrMissing>0){
budgetScore=Math.max(5,100-(gapRatio*180))
}

let longHaulBonus=0

if(route.region==="Asia")longHaulBonus=8
if(route.region==="Nord America")longHaulBonus=6
if(route.region==="Medio Oriente")longHaulBonus=4

const opportunityScore=
valueScore*0.7+
difficultyScore*0.15+
budgetScore*0.15+
longHaulBonus

return{

...route,

cashMin:cashData?cashData.min.toFixed(2):null,
cashMax:cashData?cashData.max.toFixed(2):null,
cashAverage:cashData?cashData.average.toFixed(2):null,

estimatedValue:value.toFixed(2),

opportunityScore:Math.round(opportunityScore),

mrRequired,
mrMissing:mrMissing>0?mrMissing:0,
gapRatio

}

}))

const bestValue=Math.max(...enriched.map(r=>parseFloat(r.estimatedValue)||0))

enriched.forEach(r=>{

const val=parseFloat(r.estimatedValue)||0

r.valuePercent=bestValue?Math.round((val/bestValue)*100):0

r.isBestValue=val===bestValue

const diff=bestValue-val

r.relativeLoss=Math.max(0,(diff/100)*parsedMaxMR).toFixed(0)

})

enriched.sort((a,b)=>b.opportunityScore-a.opportunityScore)

const bookable=enriched.filter(r=>r.mrMissing===0)
const almost=enriched.filter(r=>r.mrMissing>0&&r.gapRatio<=0.25)
const future=enriched.filter(r=>r.gapRatio>0.25)

const sweetSpots=enriched
.filter(r=>parseFloat(r.estimatedValue)>=1.2)
.sort((a,b)=>parseFloat(b.estimatedValue)-parseFloat(a.estimatedValue))
.slice(0,5)

return res.status(200).json({

from,
maxMR,

sections:{
bookable,
almost,
future
},

bestRedemptionToday: enriched[0],

sweetSpots

})

}catch(error){

return res.status(500).json({
error:"Errore interno server",
details:error.message
})

}

}
