// store/reducer/cartReducer.js

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  count: 0,
  products: [],
};

const cartSlice = createSlice({
  name: "cartStore",
  initialState,

  reducers: {
    // ---------------- ADD INTO CART ----------------

    addIntoCart: (state, action) => {
      const payload = action.payload;
      const qty = Number(payload.quantity || 1);

      const index = state.products.findIndex(
        (product) => String(product.productId) === String(payload.productId),
      );

      if (index >= 0) {
        state.products[index].quantity += qty;
      } else {
        state.products.push({
          ...payload,
          quantity: qty,
        });
      }

      state.count += qty;
    },

    // ---------------- INCREASE QUANTITY ----------------

    increaseQuantity: (state, action) => {
      const { productId } = action.payload;

      const index = state.products.findIndex(
        (product) => String(product.productId) === String(productId),
      );

      if (index >= 0) {
        state.products[index].quantity += 1;
        state.count += 1;
      }
    },

    // ---------------- DECREASE QUANTITY ----------------

    decreaseQuantity: (state, action) => {
      const { productId } = action.payload;

      const index = state.products.findIndex(
        (product) => String(product.productId) === String(productId),
      );

      if (index >= 0) {
        if (state.products[index].quantity > 1) {
          state.products[index].quantity -= 1;
          state.count -= 1;
        } else {
          state.count -= 1;
          state.products.splice(index, 1);
        }
      }
    },

    // ---------------- REMOVE PRODUCT ----------------

    removeFromCart: (state, action) => {
      const { productId } = action.payload;

      const index = state.products.findIndex(
        (product) => String(product.productId) === String(productId),
      );

      if (index >= 0) {
        state.count -= state.products[index].quantity;
        state.products.splice(index, 1);
      }
    },

    // ---------------- CLEAR CART ----------------

    clearCart: (state) => {
      state.products = [];
      state.count = 0;
    },

    // ---------------- SET CART ----------------

    setCart: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [];

      state.products = items;

      state.count = items.reduce(
        (total, item) => total + Number(item.quantity || 1),
        0,
      );
    },
  },
});

export const {
  addIntoCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart,
  setCart,
} = cartSlice.actions;

export default cartSlice.reducer;
