import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 businessDate:{type:Date,required:true,index:true}, oilTypeId:{...objectId(),ref:"OilType",index:true},
 storageLocationId:{...objectId(),ref:"StorageLocation",index:true},
 openingStockKg:{type:Number,required:true}, purchaseInKg:{type:Number,default:0}, salesOutKg:{type:Number,default:0},
 returnsInKg:{type:Number,default:0}, returnsOutKg:{type:Number,default:0}, adjustmentInKg:{type:Number,default:0},
 adjustmentOutKg:{type:Number,default:0}, expectedClosingStockKg:{type:Number,required:true},
 physicalClosingStockKg:{type:Number,default:null}, varianceKg:{type:Number,default:null},
 notes:{type:String,default:""}, preparedBy:{...objectId(),ref:"User"}, approvedBy:{...optionalObjectId(),ref:"User"},
 approvedAt:{type:Date,default:null}, sourceHash:{type:String,default:""}
},timestamps);
schema.index({businessDate:1,oilTypeId:1,storageLocationId:1},{unique:true});

export const DailyStock = model("DailyStock", schema);
