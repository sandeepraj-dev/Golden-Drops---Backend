import Customer from "../models/Customer.js";
import { AppError } from "../utils/AppError.js";

/**
 * Update editable customer fields.
 * customerCode is intentionally immutable here.
 */
export async function updateCustomer(customerId, input) {
  const allowedFields = ["name", "phone", "address", "email"];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(input, field)) {
      updates[field] = input[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided for update", 400);
  }

  const customer = await Customer.findOneAndUpdate(
    {
      _id: customerId,
      isActive: { $ne: false },
    },
    { $set: updates },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!customer) {
    throw new AppError("Customer not found or inactive", 404);
  }

  return customer;
}

/**
 * Soft-delete a customer to preserve transaction history.
 */
export async function deactivateCustomer(customerId) {
  const customer = await Customer.findOneAndUpdate(
    {
      _id: customerId,
      isActive: { $ne: false },
    },
    { $set: { isActive: false } },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!customer) {
    throw new AppError("Customer not found or already inactive", 404);
  }

  return customer;
}
