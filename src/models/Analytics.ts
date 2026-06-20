import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  shortCode: string;
  timestamp: Date;
  country: string;
  city: string;
  device: string;
  browser: string;
  ipAddress: string;
}

const AnalyticsSchema: Schema = new Schema(
  {
    shortCode: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    country: {
      type: String,
      default: 'Unknown',
    },
    city: {
      type: String,
      default: 'Unknown',
    },
    device: {
      type: String,
      default: 'Unknown',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    ipAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
AnalyticsSchema.index({ shortCode: 1, timestamp: -1 });
AnalyticsSchema.index({ timestamp: -1 });

const Analytics: Model<IAnalytics> =
  mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);

export default Analytics;
