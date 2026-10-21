import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 locationCode:{type:String,required:true,unique:true,trim:true},
 locationName:{type:String,required:true,trim:true}, description:{type:String,default:""},
 isActive:{type:Boolean,default:true}
}, timestamps);

export const StorageLocation = model("StorageLocation", schema);
