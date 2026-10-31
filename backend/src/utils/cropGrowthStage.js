
const getCropGrowthStage = (crop, referenceDate = new Date()) => {
  if (!crop || !crop.plantingDate) {
    return {
      stage: "unknown",
      daysSincePlanting: null,
      message: "Planting date is missing.",
    };
  }

  const plantingDate = new Date(crop.plantingDate);
  const today = new Date(referenceDate);

  if (
    Number.isNaN(plantingDate.getTime()) ||
    Number.isNaN(today.getTime())
  ) {
    return {
      stage: "unknown",
      daysSincePlanting: null,
      message: "A valid date is required.",
    };
  }

  // Compare calendar dates without time-of-day differences
  plantingDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysSincePlanting = Math.floor(
    (today.getTime() - plantingDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysSincePlanting < 0) {
    return {
      stage: "planned",
      daysSincePlanting,
      message: "This crop has not been planted yet.",
    };
  }

  const minimumDays = crop.growingPeriod?.minimumDays;

  if (
    Number.isFinite(minimumDays) &&
    minimumDays > 0 &&
    daysSincePlanting >= minimumDays
  ) {
    return {
      stage: "potentially_ready",
      daysSincePlanting,
      message:
        "The crop has reached its minimum catalog growing period. Inspect it to confirm maturity before harvesting.",
    };
  }

  if (daysSincePlanting < 14) {
    return {
      stage: "early_growth",
      daysSincePlanting,
      message:
        "Check establishment, soil moisture, and early plant growth.",
    };
  }

  return {
    stage: "developing",
    daysSincePlanting,
    message:
      "Monitor crop development and maintain appropriate care.",
  };
};

module.exports = getCropGrowthStage;