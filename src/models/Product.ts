import { Schema, model, type Types } from "mongoose";

export type ProductStatus = "In Stock" | "Out of Stock";

export interface IProduct {
  name: string;
  description?: string;
  category: Types.ObjectId;
  price: number;
  stockQuantity: number;
  minStockThreshold: number;
  status: ProductStatus;
  active: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    price: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    minStockThreshold: { type: Number, default: 0 },
    status: { type: String, enum: ["In Stock", "Out of Stock"], default: "In Stock" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Product = model<IProduct>("Product", productSchema);

export default Product;
