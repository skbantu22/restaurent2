"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { addOrderToState } from "@/store/reducer/orderReducer";

export default function OrderSuccessClient({ order }) {
  const dispatch = useDispatch();

  const addedRef = useRef(false);

  useEffect(() => {
    if (!order?._id) return;

    console.log("Dispatch Order:", order);

    dispatch(addOrderToState(order));
  }, [dispatch, order]);

  useEffect(() => {
    if (!order?._id || addedRef.current) return;

    addedRef.current = true;

    dispatch(addOrderToState(order));
  }, [dispatch, order]);

  return null;
}
