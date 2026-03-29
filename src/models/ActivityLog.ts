import { Schema, model, type Types } from "mongoose";

export interface IActivityLog {
  user?: Types.ObjectId;
  action: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  details?: Record<string, unknown>;
}

const activitySchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

const ActivityLog = model<IActivityLog>("ActivityLog", activitySchema);

export default ActivityLog;
