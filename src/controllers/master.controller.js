import { asyncHandler } from "../utils/asyncHandler.js";
import { listMaster, createMaster, getMaster, updateMaster, deactivateMaster, listUsers } from "../services/master.service.js";
import { createUser } from "../services/auth.service.js";
import { User } from "../models/User.js";
import { notFound } from "../utils/apiError.js";

export const list = (kind) => asyncHandler(async(req,res)=>res.json({success:true,...await listMaster(kind,req.query)}));
export const create = (kind) => asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await createMaster(kind,req.body,req.user)}));
export const get = (kind) => asyncHandler(async(req,res)=>res.json({success:true,data:await getMaster(kind,req.params.id)}));
export const update = (kind) => asyncHandler(async(req,res)=>res.json({success:true,data:await updateMaster(kind,req.params.id,req.body,req.user)}));
export const deactivate = (kind) => asyncHandler(async(req,res)=>res.json({success:true,message:"Record deactivated",data:await deactivateMaster(kind,req.params.id,req.user)}));
export const usersList = asyncHandler(async(req,res)=>res.json({success:true,...await listUsers(req.query)}));
export const usersCreate = asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await createUser(req.body,req.user.role)}));
export const usersPatch = asyncHandler(async(req,res)=>{
 const user=await User.findById(req.params.id); if(!user) throw notFound("User not found");
 if(req.body.role==="ADMIN" && req.user.role!=="ADMIN") throw new Error("Only ADMIN can assign ADMIN role");
 if(req.body.name!==undefined) user.name=req.body.name;
 if(req.body.role!==undefined) user.role=req.body.role;
 if(req.body.isActive!==undefined) user.isActive=req.body.isActive;
 await user.save(); res.json({success:true,data:user.toSafeJSON()});
});
