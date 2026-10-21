import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const item = new Schema({
 oilTypeId:{...objectId(),ref:"OilType"}, storageLocationId:{...objectId(),ref:"StorageLocation"},
 quantityKg:{type:Number,required:true,min:0.0001}, sellingPricePerKg:{type:Number,required:true,min:0},
 discount:{type:Number,default:0,min:0}, lineTotal:{type:Number,required:true,min:0},
 unitCostPerKg:{type:Number,default:0,min:0}, priceOverrideReason:{type:String,default:""}
},{_id:true});
const schema = new Schema({
 saleNumber:{type:String,required:true,unique:true,index:true}, customerId:{...optionalObjectId(),ref:"Customer",index:true},
 saleDate:{type:Date,required:true,index:true}, items:{type:[item],required:true,validate:v=>v.length>0},
 totalQuantityKg:{type:Number,required:true,min:0}, subtotal:{type:Number,required:true,min:0},
 additionalCharges:{type:Number,default:0,min:0}, discount:{type:Number,default:0,min:0},
 grandTotal:{type:Number,required:true,min:0}, paidAmount:{type:Number,default:0,min:0},
 outstandingAmount:{type:Number,required:true,min:0},
 paymentStatus:{type:String,enum:["UNPAID","PARTIALLY_PAID","PAID"],default:"UNPAID",index:true},
 notes:{type:String,default:""}, createdBy:{...objectId(),ref:"User"},
 status:{type:String,enum:["CONFIRMED","REVERSED"],default:"CONFIRMED",index:true}
},timestamps);
schema.index({customerId:1,saleDate:-1});

export const Sale = model("Sale", schema);
