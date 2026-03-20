/**
 * Stripe Plan Definitions
 *
 * Defines the subscription tiers and feature gates.
 * DO NOT integrate Stripe SDK or handle payment flows yet.
 * DO NOT handle credit card data (prohibited).
 *
 * This file is informational — used to render the
 * pricing page and feature comparisons.
 */

import { Subscription, SubscriptionPlan } from "./types";

export const PLANS: Record<SubscriptionPlan, Subscription> = {
  free: {
    plan: "free",
    features: [
      "Up to 5 plants",
      "Photo journal",
      "Basic weather",
      "Community tips",
    ],
    priceMonthly: 0,
    stripePriceId: "", // Not needed for free tier
  },
  grower: {
    plan: "grower",
    features: [
      "Unlimited plants",
      "AI garden advisor",
      "Garden memory (photo tracking over time)",
      "Weekend task list",
      "Plant identification",
      "Spaces map",
      "Growth charts & analytics",
      "Care reminders",
      "Export data",
    ],
    priceMonthly: 3.99,
    stripePriceId: "price_grower_monthly", // Placeholder
  },
  pro: {
    plan: "pro",
    features: [
      "Everything in Grower",
      "Video garden analysis",
      "Predictive garden imaging",
      "Priority support",
      "Garden centre recommendations",
      "Harvest predictions",
      "Multi-garden support",
      "Family sharing (up to 3)",
      "Data export & backup",
    ],
    priceMonthly: 7.99,
    stripePriceId: "price_pro_monthly", // Placeholder
  },
};

/**
 * Check if a feature is available on a given plan.
 */
export function hasFeature(plan: SubscriptionPlan, feature: string): boolean {
  return PLANS[plan].features.includes(feature);
}

/**
 * Get the plan limits for display.
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxPlants: number;
  maxPhotosPerMonth: number;
  maxSpaces: number;
  aiQueriesPerDay: number;
  plantIdPerMonth: number;
}> = {
  free: {
    maxPlants: 5,
    maxPhotosPerMonth: 20,
    maxSpaces: 1,
    aiQueriesPerDay: 3,
    plantIdPerMonth: 5,
  },
  grower: {
    maxPlants: Infinity,
    maxPhotosPerMonth: Infinity,
    maxSpaces: 10,
    aiQueriesPerDay: 50,
    plantIdPerMonth: 50,
  },
  pro: {
    maxPlants: Infinity,
    maxPhotosPerMonth: Infinity,
    maxSpaces: Infinity,
    aiQueriesPerDay: Infinity,
    plantIdPerMonth: Infinity,
  },
};

/**
 * Annual pricing (discount for yearly commitment)
 */
export const ANNUAL_DISCOUNT = 0.2; // 20% off

export function getAnnualPrice(plan: SubscriptionPlan): number {
  const monthly = PLANS[plan].priceMonthly;
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}
