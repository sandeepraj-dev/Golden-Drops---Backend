import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 customerCode:{type:String,required:true,unique:true,trim:true,index:true},
 name:{type:String,required:true,trim:true,index:true},
 phone:{type:String,trim:true,index:true,default:""}, alternatePhone:{type:String,trim:true,default:""},
 address:{type:String,default:""}, villageOrCity:{type:String,default:""}, notes:{type:String,default:""},
 openingBalance:{type:Number,default:0}, isActive:{type:Boolean,default:true}
}, timestamps);
schema.index({name:"text",phone:"text",customerCode:"text",address:"text"});

export const Customer = model("Customer", schema);
