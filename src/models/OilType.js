import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 oilCode:{type:String,required:true,unique:true,trim:true,index:true},
 oilName:{type:String,required:true,trim:true,unique:true}, description:{type:String,default:""},
 unit:{type:String,enum:["KG"],default:"KG"}, isActive:{type:Boolean,default:true},
 lowStockThresholdKg:{type:Number,min:0,default:0}
}, timestamps);

export const OilType = model("OilType", schema);
