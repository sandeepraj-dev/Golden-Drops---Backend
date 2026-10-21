import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 oilTypeId:{...objectId(),ref:"OilType",index:true},
 priceType:{type:String,enum:["PURCHASE","SELL"],required:true,index:true},
 pricePerKg:{type:Number,required:true,min:0.01},
 effectiveFrom:{type:Date,required:true,index:true}, effectiveTo:{type:Date,default:null,index:true},
 isActive:{type:Boolean,default:true}, notes:{type:String,default:""},
 createdBy:{...objectId(),ref:"User"}
}, timestamps);
schema.index({oilTypeId:1,priceType:1,effectiveFrom:-1});

export const OilPrice = model("OilPrice", schema);
