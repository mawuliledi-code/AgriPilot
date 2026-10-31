
const getCropGrowthStage = require("./cropGrowthStage");

const severityPriority = {
  high: 1,
  medium: 2,
  low: 3,
};

const sourcePriority = {
  crop_health: 1,
  crop_growth: 2,
  weather: 3,
  general: 4,
};

// Generate a stable ID for a weather recommendation.
// Prefer the event ID or timestamp supplied by the weather source.
const getWeatherEventId = (recommendation) => {
  if (recommendation.weatherEventId) {
    return String(recommendation.weatherEventId);
  }

  if (recommendation.eventId) {
    return String(recommendation.eventId);
  }

  const eventTime =
    recommendation.eventTime ||
    recommendation.forecastTime ||
    recommendation.validFrom ||
    recommendation.forecastTimestamp;

  const cropId =
    recommendation.cropId?._id ||
    recommendation.cropId ||
    recommendation.crop?._id ||
    recommendation.crop ||
    "all-crops";

  if (eventTime) {
    const parsedDate = new Date(eventTime);

    if (!Number.isNaN(parsedDate.getTime())) {
      return [
        recommendation.type,
        String(cropId),
        parsedDate.toISOString(),
      ].join(":");
    }
  }

  // Fallback only. A fallback cannot distinguish separate events.
  return [
    recommendation.type,
    String(cropId),
    "current-event",
  ].join(":");
};

const createCropActionPlan = (
  crops = [],
  observations = [],
  weatherRecommendations = [],
  completedRecords = []
) => {
  const actions = [];

  // 1. Index existing completion records.
  const completedByObservation = new Map();
  const completedByWeatherEvent = new Map();

  for (const record of completedRecords) {
    if (
      record.actionType === "health_follow_up" &&
      record.observationId
    ) {
      completedByObservation.set(
        record.observationId.toString(),
        record
      );
    }

    if (record.weatherEventId) {
      const key = [
        record.actionType,
        String(record.weatherEventId),
      ].join(":");

      const previous = completedByWeatherEvent.get(key);

      if (
        !previous ||
        new Date(record.completedAt || 0) >
          new Date(previous.completedAt || 0)
      ) {
        completedByWeatherEvent.set(key, record);
      }
    }
  }

  // Helper: apply completion details without changing stored records.
  const applyCompletionStatus = (action, completion) => {
    action.status = completion ? "completed" : "pending";

    if (completion) {
      action.completedAt = completion.completedAt;
      action.completionId = completion._id;
      action.outcome = completion.outcome || "";
      action.completionNotes = completion.notes || "";
    }


    return action;
  };

  // 2. Follow up on crop-health observations.
  const activeObservations = observations.filter(
    (observation) => observation.status !== "resolved"
  );

  for (const observation of activeObservations) {
    const severity = observation.severity || "low";
    let action = "Inspect the crop and record any changes.";

    if (observation.observationType === "pest") {
      action = `Inspect the crop for ${observation.name} and check whether the problem is spreading.`;
    } else if (observation.observationType === "disease") {
      action = `Inspect the crop for signs of ${observation.name}, record affected plant parts, and seek reliable local advice before choosing treatment.`;
    }

    if (observation.status === "treatment_applied") {
      action = `Check the crop for ${observation.name} and record whether symptoms improve or worsen after the recorded treatment.`;
    }

    const observationId = observation._id?.toString();
    const completion = observationId
      ? completedByObservation.get(observationId)
      : null;

    actions.push(
      applyCompletionStatus(
        {
          source: "crop_health",
          type: "health_follow_up",
          priority: severityPriority[severity] || 3,
          severity,
          crop: observation.crop?.name || "Unknown crop",
          cropId: observation.crop?._id || observation.crop || null,
          observationId: observation._id,
          problem: observation.name,
          observationStatus: observation.status,
          action,
        },
        completion
      )
    );
  }

  // 3. Check crop maturity.
  for (const crop of crops) {
    const growth = getCropGrowthStage(crop);

    if (growth.stage === "potentially_ready") {
      actions.push({
        source: "crop_growth",
        type: "harvest_check",
        priority: 2,
        severity: "medium",
        crop: crop.name,
        cropId: crop._id,
        status: "pending",
        action: "Inspect the crop and confirm maturity before harvesting.",
        daysSincePlanting: growth.daysSincePlanting,
      });
    }
  }

  // 4. Build weather actions and merge duplicate heat rules.
  // Heat recommendations in the same response describe the same
  // current heat condition, even when their fallback IDs differ.
  const weatherActions = new Map();

  for (const recommendation of weatherRecommendations) {
    const isHeatRecommendation =
      recommendation.type === "tomato_heat_care" ||
      recommendation.type === "heat_risk";

    const weatherEventId = getWeatherEventId(recommendation);

    const key = isHeatRecommendation
      ? "heat_care:current-weather"
      : `${recommendation.type}:${weatherEventId}`;

    const existing = weatherActions.get(key);

    if (!existing) {
      weatherActions.set(key, {
        ...recommendation,
        weatherEventId,
        type: isHeatRecommendation
          ? "tomato_heat_care"
          : recommendation.type,
        _isTomatoHeatCare:
          recommendation.type === "tomato_heat_care",
      });
      continue;
    }

    const existingPriority =
      severityPriority[existing.severity] || 3;
    const newPriority =
      severityPriority[recommendation.severity] || 3;

    // Preserve the more severe recommendation. Keep the
    // tomato-specific action text when it is available.
    const useNewRecommendation =
      newPriority < existingPriority ||
      (
        recommendation.type === "tomato_heat_care" &&
        !existing._isTomatoHeatCare
      );

    const preferred = useNewRecommendation
      ? recommendation
      : existing;

    weatherActions.set(key, {
      ...preferred,
      weatherEventId:
        recommendation.weatherEventId ||
        existing.weatherEventId ||
        weatherEventId,
      type: isHeatRecommendation
        ? "tomato_heat_care"
        : recommendation.type,
      severity:
        newPriority < existingPriority
          ? recommendation.severity
          : existing.severity,
      _isTomatoHeatCare:
        existing._isTomatoHeatCare ||
        recommendation.type === "tomato_heat_care",
    });
  }

  // 5. Match weather actions to completion records.
  for (const recommendation of weatherActions.values()) {
    const weatherEventId = recommendation.weatherEventId;

    const supportedTypes =
      recommendation.type === "tomato_heat_care"
        ? ["tomato_heat_care", "heat_risk"]
        : [recommendation.type];

    let completion = null;

    for (const type of supportedTypes) {
      const key = [type, weatherEventId].join(":");

      if (completedByWeatherEvent.has(key)) {
        completion = completedByWeatherEvent.get(key);
        break;
      }
    }

    const {
      _isTomatoHeatCare,
      ...cleanRecommendation
    } = recommendation;

    actions.push(
      applyCompletionStatus(
        {
          source: "weather",
          type: cleanRecommendation.type,
          weatherEventId,
          priority:
            severityPriority[cleanRecommendation.severity] || 3,
          severity: cleanRecommendation.severity || "low",
          crop: cleanRecommendation.crop || null,
          cropId: cleanRecommendation.cropId || null,
          action: cleanRecommendation.action,
          message: cleanRecommendation.message,
        },
        completion
      )
    );
  }

  // 6. Add urgency and completion guidance.
  for (const action of actions) {
    if (action.priority === 1) {
      action.urgency = "Urgent";
      action.urgencyReason =
        "This action relates to a high-severity observation or warning and should be checked promptly.";
    } else if (action.priority === 2) {
      action.urgency = "Soon";

      if (action.source === "crop_health") {
        action.urgencyReason =
          "A crop health issue needs follow-up to check whether it is improving or getting worse.";
      } else if (action.type === "rain_forecast") {
        action.urgencyReason =
          "Rain may affect watering decisions, so check soil moisture before irrigating.";
      } else if (action.type === "harvest_check") {
        action.urgencyReason =
          "The crop may have reached its expected growing period, so inspect it to confirm maturity.";
      } else {
        action.urgencyReason =
          "Checking this condition soon may help prevent crop stress or losses.";
      }
    } else {
      action.urgency = "Routine";
      action.urgencyReason =
        "Continue monitoring and reassess if the condition worsens.";
    }

    if (action.source === "crop_health") {
      action.whyThisMatters =
        "Monitoring the affected crop can help identify whether the problem is improving or needs further attention.";
      action.completionCheck =
        "Record the latest symptoms and compare them with the previous observation.";
    } else if (action.type === "rain_forecast") {
      action.whyThisMatters =
        "Checking soil moisture before watering can help avoid unnecessary irrigation.";
      action.completionCheck =
        "Check the soil moisture and record whether irrigation is needed.";
    } else if (
      action.type === "tomato_heat_care" ||
      action.type === "heat_risk"
    ) {
      action.whyThisMatters =
        "Early checks can help identify heat stress and reduce avoidable crop water stress.";
      action.completionCheck =
        "Inspect leaves for wilting and check the soil moisture.";
    } else if (action.type === "harvest_check") {
      action.whyThisMatters =
        "Confirming maturity helps avoid harvesting too early.";
      action.completionCheck =
        "Inspect the crop and record whether it is mature enough to harvest.";
    } else {
      action.whyThisMatters =
        "Following up helps the farmer detect changing conditions and decide whether further action is needed.";
      action.completionCheck =
        "Inspect the relevant crop or condition and record the result.";
    }
  }

  // 7. Add a default action if there are no recommendations.
  if (actions.length === 0) {
    actions.push({
      source: "general",
      type: "routine_monitoring",
      priority: 3,
      severity: "low",
      status: "pending",
      urgency: "Routine",
      urgencyReason:
        "No specific issues were detected by the current rules. Continue regular monitoring.",
      action:
        "Inspect crops regularly and review weather conditions before watering or harvesting.",
      whyThisMatters:
        "Routine monitoring can help identify problems before they become more serious.",
      completionCheck:
        "Complete a crop inspection and record the results.",
    });
  }

  // 8. Sort pending actions before completed actions.
  actions.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "pending" ? -1 : 1;
    }

    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    const sourceDifference =
      (sourcePriority[a.source] || 4) -
      (sourcePriority[b.source] || 4);

    if (sourceDifference !== 0) {
      return sourceDifference;
    }

    return String(a.crop || "").localeCompare(
      String(b.crop || "")
    );
  });

  // 9. Number actions in recommended order.
  actions.forEach((action, index) => {
    action.recommendedOrder = index + 1;
  });

  const completedCount = actions.filter(
    (action) => action.status === "completed"
  ).length;

  return {
    totalActions: actions.length,
    pendingActions: actions.length - completedCount,
    completedActions: completedCount,
    actions,
    disclaimer:
      "These are rule-based decision-support suggestions, not a confirmed diagnosis or a guarantee of crop outcomes. Verify conditions in the field and follow reliable local agricultural guidance.",
  };
};

module.exports = createCropActionPlan;