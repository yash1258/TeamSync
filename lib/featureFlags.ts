const parseBoolean = (value: string | undefined, fallback: boolean) => {
    if (value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
    }
    return fallback;
};

const publicPlanningHub = parseBoolean(
    process.env.NEXT_PUBLIC_FEATURE_PLANNING_HUB,
    true
);

export const publicFeatureFlags = {
    planningHub: publicPlanningHub,
} as const;

export const featureFlags = {
    planningHub: parseBoolean(
        process.env.FEATURE_PLANNING_HUB,
        publicFeatureFlags.planningHub
    ),
} as const;
