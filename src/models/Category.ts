import { Schema, model } from "mongoose";

export interface ICategory {
  name: string;
  description?: string;
  iconColor: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    iconColor: { type: String, default: "#6366F1" },
  },
  { timestamps: true },
);

const Category = model<ICategory>("Category", categorySchema);

export default Category;
