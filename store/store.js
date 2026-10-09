"use client";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./reducer/authReducer";
import cartReducer from "./reducer/cartReducer";
import wishlistSlice from "./reducer/favReducer";
import orderReducer from "./reducer/orderReducer"; // ১. নতুন অর্ডার রিডিউসার ইমপোর্ট
const rootReducer = combineReducers({
  authStore: authReducer,
  cartStore: cartReducer,
  orderStore: orderReducer, // ২. এখানে যুক্ত করা হলো
  wishlistStore: wishlistSlice,
});

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
