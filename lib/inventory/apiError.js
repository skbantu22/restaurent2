import { response, catchError } from "@/lib/helperfunction";
import {
  InventoryError,
  NotFoundError,
  InsufficientStockError,
  DuplicateMovementError,
} from "@/lib/inventory/inventory.service";

/**
 * Maps inventory.service.js error classes to sensible HTTP responses.
 * Falls back to the existing generic catchError() for anything else
 * (Mongoose validation errors, duplicate key errors, etc.) so this can
 * be dropped into any inventory route's catch block.
 */
export function handleInventoryError(error) {
  if (error instanceof NotFoundError) {
    return response(false, 404, error.message);
  }

  if (error instanceof InsufficientStockError) {
    return response(false, 409, error.message);
  }

  if (error instanceof DuplicateMovementError) {
    // Not a real failure — the caller retried something already applied.
    return response(false, 409, error.message);
  }

  if (error instanceof InventoryError) {
    return response(false, 400, error.message);
  }

  return catchError(error);
}
