import { Schema, model, type Types } from "mongoose";

export type RestockStatus = "pending" | "ordered" | "received";

export interface IRestockQueue {
  product: Types.ObjectId;
  requestedAt: Date;
  status: RestockStatus;
  note?: string;
}

const restockSchema = new Schema<IRestockQueue>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "ordered", "received"], default: "pending" },
    note: { type: String },
  },
  { timestamps: true },
);

const RestockQueue = model<IRestockQueue>("RestockQueue", restockSchema);

export default RestockQueue;
