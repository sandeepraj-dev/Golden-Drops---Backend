import mongoose from "mongoose";
import {
  updateOilType,
  deactivateOilType,
} from "../services/oil-type.service.js";

export async function patchOilType(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid oil type ID",
        },
      });
    }

    const result = await updateOilType(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      data: result,
      message: "Oil type updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteOilType(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid oil type ID",
        },
      });
    }

    const result = await deactivateOilType(req.params.id);

    return res.status(200).json({
      success: true,
      data: result,
      message: "Oil type deactivated successfully",
    });
  } catch (error) {
    next(error);
  }
}
