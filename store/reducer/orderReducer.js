import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const STORAGE_KEY = "guest_orders";

const getGuestIds = () => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveGuestIds = (ids) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

const isFinished = (status) => ["delivered", "cancelled"].includes(status);

export const fetchGuestOrders = createAsyncThunk(
  "orders/fetchGuestOrders",
  async (_, thunkAPI) => {
    try {
      const ids = getGuestIds();

      if (!ids.length) return [];

      const res = await fetch(`/api/orders/batch?ids=${ids.join(",")}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();

      return data.orders || [];
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  },
);

const orderSlice = createSlice({
  name: "orders",

  initialState: {
    orders: [],
    activeOrders: [],
    loading: false,
    error: null,
  },

  reducers: {
    addOrderToState(state, action) {
      const order = action.payload;

      const index = state.orders.findIndex((o) => o._id === order._id);

      if (index === -1) {
        state.orders.unshift(order);
      } else {
        state.orders[index] = order;
      }

      state.activeOrders = state.activeOrders.filter(
        (o) => o._id !== order._id,
      );

      if (!isFinished(order.orderStatus)) {
        state.activeOrders.unshift(order);
      }

      const ids = getGuestIds();

      if (!ids.includes(order._id)) {
        ids.unshift(order._id);
        saveGuestIds(ids);
      }
    },

    updateOrderStatus(state, action) {
      const order = action.payload;

      const index = state.orders.findIndex((o) => o._id === order._id);

      if (index !== -1) {
        state.orders[index] = order;
      } else {
        state.orders.unshift(order);
      }

      state.activeOrders = state.activeOrders.filter(
        (o) => o._id !== order._id,
      );

      if (!isFinished(order.orderStatus)) {
        state.activeOrders.unshift(order);
      } else {
        saveGuestIds(getGuestIds().filter((id) => id !== order._id));
      }
    },

    removeOrder(state, action) {
      const id = action.payload;

      state.orders = state.orders.filter((o) => o._id !== id);

      state.activeOrders = state.activeOrders.filter((o) => o._id !== id);

      saveGuestIds(getGuestIds().filter((x) => x !== id));
    },

    clearOrders(state) {
      state.orders = [];
      state.activeOrders = [];
      state.loading = false;
      state.error = null;

      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
  },

  extraReducers(builder) {
    builder
      .addCase(fetchGuestOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchGuestOrders.fulfilled, (state, action) => {
        state.loading = false;

        state.orders = action.payload;

        state.activeOrders = action.payload.filter(
          (o) => !isFinished(o.orderStatus),
        );
      })

      .addCase(fetchGuestOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
      });
  },
});

export const { addOrderToState, updateOrderStatus, removeOrder, clearOrders } =
  orderSlice.actions;

export default orderSlice.reducer;
