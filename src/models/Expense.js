import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const schema = new Schema({
 expenseNumber:{type:String,required:true,unique:true,index:true}, expenseDate:{type:Date,required:true,index:true},
 category:{type:String,required:true,trim:true}, description:{type:String,required:true},
 amount:{type:Number,required:true,min:0.01}, paymentMethod:{type:String,enum:["CASH","UPI","BANK_TRANSFER","CHEQUE","OTHER"],required:true},
 referenceNumber:{type:String,default:""}, notes:{type:String,default:""},
 createdBy:{...objectId(),ref:"User"}, status:{type:String,enum:["CONFIRMED","REVERSED"],default:"CONFIRMED"}
},timestamps);

export const Expense = model("Expense", schema);
