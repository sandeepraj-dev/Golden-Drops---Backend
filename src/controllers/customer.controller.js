import mongoose from "mongoose";
import {
  updateCustomer,
  deactivateCustomer,
} from "../services/customer.service.js";

export async function patchCustomer(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid customer ID",
        },
      });
    }

    const customer = await updateCustomer(id, req.body);

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid customer ID",
        },
      });
    }

    const customer = await deactivateCustomer(id);

    return res.status(200).json({
      success: true,
      data: customer,
      message: "Customer deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
}
