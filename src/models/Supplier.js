import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 supplierCode:{type:String,required:true,unique:true,trim:true,index:true},
 name:{type:String,required:true,trim:true,index:true}, phone:{type:String,default:""},
 address:{type:String,default:""}, openingBalance:{type:Number,default:0}, notes:{type:String,default:""},
 isActive:{type:Boolean,default:true}
}, timestamps);
schema.index({name:"text",phone:"text",supplierCode:"text",address:"text"});

export const Supplier = model("Supplier", schema);
