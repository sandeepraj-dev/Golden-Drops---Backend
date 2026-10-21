import { Schema, timestamps, model, objectId, optionalObjectId } from "./_base.js";

const allocation = new Schema({
 documentType:{type:String,enum:["PURCHASE","SALE"],required:true},
 documentId:{...objectId(),required:true}, amount:{type:Number,required:true,min:0.01}
},{_id:false});
const schema = new Schema({
 paymentNumber:{type:String,required:true,unique:true,index:true}, transactionDate:{type:Date,required:true,index:true},
 direction:{type:String,enum:["RECEIVED","PAID"],required:true,index:true},
 partyType:{type:String,enum:["CUSTOMER","SUPPLIER"],required:true,index:true},
 customerId:{...optionalObjectId(),ref:"Customer",index:true}, supplierId:{...optionalObjectId(),ref:"Supplier",index:true},
 transactionType:{type:String,enum:["PURCHASE_PAYMENT","SALE_RECEIPT","CUSTOMER_ADVANCE","SUPPLIER_ADVANCE","REFUND","OPENING_BALANCE_SETTLEMENT"],required:true},
 amount:{type:Number,required:true,min:0.01}, paymentMethod:{type:String,enum:["CASH","UPI","BANK_TRANSFER","CHEQUE","OTHER"],required:true},
 referenceNumber:{type:String,default:""}, allocations:{type:[allocation],default:[]},
 unallocatedAmount:{type:Number,required:true,min:0}, notes:{type:String,default:""},
 createdBy:{...objectId(),ref:"User"}, status:{type:String,enum:["CONFIRMED","REVERSED"],default:"CONFIRMED"}
},timestamps);
schema.index({customerId:1,transactionDate:-1}); schema.index({supplierId:1,transactionDate:-1});

export const Payment = model("Payment", schema);
