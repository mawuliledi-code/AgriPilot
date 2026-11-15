
const getCropStageGuidance = (crop, growth) => {
  if (!crop || !growth) {
    return null;
  }

  const cropName = crop.name || "your crop";
  const pests = crop.commonPests || [];
  const diseases = crop.commonDiseases || [];

  const guidanceByStage = {
    planned: {
      priority: 2,
      urgency: "Soon",
      action: `Prepare the field and plan the planting of ${cropName}.`,
      message:
        "Prepare suitable planting space and make sure seeds and basic farm supplies are ready.",
      whyThisMatters:
        "Good preparation helps the crop establish successfully.",
      completionCheck:
        "Record whether the field is prepared and planting materials are ready.",
    },

    early_growth: {
      priority: 2,
      urgency: "Soon",
      action: `Inspect young ${cropName} plants and check soil moisture.`,
      message:
        "Check whether plants are establishing well. Look for wilting, damaged leaves, weeds, and poor growth.",
      whyThisMatters:
        "Problems during early growth can affect later crop development.",
      completionCheck:
        "Inspect several plants and record their condition and soil moisture.",
    },

    developing: {
      priority: 2,
      urgency: "Soon",
      action: `Monitor the growth and health of your ${cropName}.`,
      message:
        `Check for common pests such as ${pests.slice(0, 3).join(", ") || "visible pest damage"}. Also look for possible disease symptoms such as ${diseases.slice(0, 3).join(", ") || "unusual leaf changes"}.`,
      whyThisMatters:
        "Regular inspection helps identify problems before they become more serious.",
      completionCheck:
        "Inspect several plants, record any unusual symptoms, and check whether the crop needs attention.",
    },

    potentially_ready: {
      priority: 2,
      urgency: "Soon",
      action: `Inspect your ${cropName} and check whether it is ready for harvest.`,
      message:
        "The crop has reached its minimum expected growing period. This does not confirm maturity, so inspect it before harvesting.",
      whyThisMatters:
        "Checking maturity helps avoid harvesting too early.",
      completionCheck:
        "Inspect the crop and record whether it is mature enough to harvest.",
    },

    unknown: {
      priority: 3,
      urgency: "Routine",
      action: `Add or check the planting date for your ${cropName}.`,
      message:
        "A planting date helps AgriPilot estimate the crop's growth stage and provide more relevant guidance.",
      whyThisMatters:
        "Accurate planting information improves the timing of crop recommendations.",
      completionCheck:
        "Check that the planting date is recorded correctly.",
    },
  };

  const guidance = guidanceByStage[growth.stage];

  if (!guidance) {
    return null;
  }

  return {
    ...guidance,
    source: "crop_guidance",
    type: "crop_guidance",
    severity: "medium",
    crop: cropName,
    cropId: crop._id,
    growthStage: growth.stage,
    daysSincePlanting: growth.daysSincePlanting,
    pestsToWatch: pests,
    diseasesToWatch: diseases,
  };
};

module.exports = getCropStageGuidance;
