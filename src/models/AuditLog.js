import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 userId:{...optionalObjectId(),ref:"User",index:true}, action:{type:String,required:true,index:true},
 entityType:{type:String,required:true,index:true}, entityId:{type:Schema.Types.ObjectId,default:null,index:true},
 before:{type:Schema.Types.Mixed,default:null}, after:{type:Schema.Types.Mixed,default:null},
 reason:{type:String,default:""}, timestamp:{type:Date,default:Date.now,index:true},
 requestId:{type:String,default:""}
},{versionKey:false});
schema.index({entityType:1,entityId:1,timestamp:-1});

export const AuditLog = model("AuditLog", schema);
