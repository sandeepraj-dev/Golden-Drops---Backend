import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 movementNumber:{type:String,required:true,unique:true,index:true}, movementDate:{type:Date,required:true,index:true},
 oilTypeId:{...objectId(),ref:"OilType",index:true}, storageLocationId:{...objectId(),ref:"StorageLocation",index:true},
 movementType:{type:String,enum:["OPENING","PURCHASE","SALE","RETURN_IN","RETURN_OUT","ADJUSTMENT_IN","ADJUSTMENT_OUT","TRANSFER"],required:true,index:true},
 quantityInKg:{type:Number,default:0,min:0}, quantityOutKg:{type:Number,default:0,min:0},
 referenceType:{type:String,default:""}, referenceId:{type:Schema.Types.ObjectId,default:null,index:true},
 unitCostPerKg:{type:Number,default:0,min:0}, notes:{type:String,default:""},
 createdBy:{...objectId(),ref:"User"}, reversalOf:{type:Schema.Types.ObjectId,ref:"StockLedger",default:null}
},timestamps);
schema.index({oilTypeId:1,storageLocationId:1,movementDate:1});

export const StockLedger = model("StockLedger", schema);
