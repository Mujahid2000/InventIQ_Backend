import { Schema, model, type Types } from "mongoose";

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
}

export interface IOrder {
  user?: Types.ObjectId;
  customerName: string;
  items: IOrderItem[];
  totalPrice: number;
  status: OrderStatus;
  placedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
});

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, default: "Walk-in Customer" },
    items: [orderItemSchema],
    totalPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Order = model<IOrder>("Order", orderSchema);

export default Order;
