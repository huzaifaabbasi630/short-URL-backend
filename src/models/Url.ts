import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUrl extends Document {
  originalUrl: string;
  shortCode: string;
  customBackhalf?: string;
  userId?: string;
  createdAt: Date;
  expiresAt?: Date;
  password?: string;
  totalClicks: number;
}

const UrlSchema: Schema = new Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customBackhalf: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    userId: {
      type: String,
      sparse: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    password: {
      type: String,
      default: null,
    },
    totalClicks: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
UrlSchema.index({ shortCode: 1 });
UrlSchema.index({ customBackhalf: 1 });
UrlSchema.index({ createdAt: -1 });

const Url: Model<IUrl> = mongoose.models.Url || mongoose.model<IUrl>('Url', UrlSchema);

export default Url;
