import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 name: {type:String,required:true,trim:true,maxlength:120},
 username: {type:String,required:true,unique:true,trim:true,lowercase:true,index:true},
 email: {type:String,required:true,unique:true,trim:true,lowercase:true},
 passwordHash: {type:String,required:true,select:false},
 role: {type:String,enum:["ADMIN","MANAGER","STAFF","VIEWER"],default:"STAFF",index:true},
 isActive: {type:Boolean,default:true}
}, timestamps);
schema.methods.toSafeJSON = function(){ const o=this.toObject(); delete o.passwordHash; return o; };

export const User = model("User", schema);
