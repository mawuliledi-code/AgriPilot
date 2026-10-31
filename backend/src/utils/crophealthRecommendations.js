
const generateCropHealthRecommendations = (observation) => {
  const recommendations = [];

  const severity = observation.severity;
  const type = observation.observationType;
  const status = observation.status;
  const problem = (observation.name || "").toLowerCase();
  const symptoms = (observation.symptoms || "").toLowerCase();

  // 1. Advice based on severity
  if (severity === "high") {
    recommendations.push({
      priority: "urgent",
      action:
        "Inspect the affected crop promptly. Check how much of the crop is affected and seek advice from a qualified local agricultural specialist.",
    });
  } else if (severity === "medium") {
    recommendations.push({
      priority: "medium",
      action:
        "Inspect affected plants and check whether the problem is spreading to nearby plants.",
    });
  } else {
    recommendations.push({
      priority: "low",
      action:
        "Continue monitoring the crop and record any changes in symptoms.",
    });
  }

  // 2. Specific monitoring advice for known pests
  if (
    type === "pest" &&
    (problem.includes("aphid") || problem.includes("aphids"))
  ) {
    recommendations.push({
      priority: "medium",
      action:
        "Inspect new shoots and the undersides of leaves for aphid clusters, curled leaves, or sticky residue. Check nearby plants as well.",
    });
  } else if (
    type === "pest" &&
    (problem.includes("whitefly") || problem.includes("whiteflies"))
  ) {
    recommendations.push({
      priority: "medium",
      action:
        "Inspect the undersides of leaves for small white insects and check for yellowing leaves or sticky residue.",
    });
  } else if (
    type === "pest" &&
    (problem.includes("tomato fruit worm") ||
      problem.includes("tomato fruitworm"))
  ) {
    recommendations.push({
      priority: "medium",
      action:
        "Inspect tomato fruits and leaves for feeding holes, damaged fruit, and caterpillars. Remove severely damaged fruit appropriately.",
    });
  } else if (type === "pest") {
    recommendations.push({
      priority: "medium",
      action:
        "Inspect the undersides of leaves, stems, fruits, and nearby plants for the pest and signs of damage.",
    });
  }

  // 3. Disease monitoring advice
  if (type === "disease") {
    recommendations.push({
      priority: "medium",
      action:
        "Record which plant parts are affected, photograph the symptoms, and check whether the symptoms are spreading. Seek a reliable diagnosis before choosing treatment.",
    });

    if (
      problem.includes("blight") ||
      symptoms.includes("spots") ||
      symptoms.includes("lesions")
    ) {
      recommendations.push({
        priority: "medium",
        action:
          "Check leaves and stems for spreading spots or lesions. Avoid unnecessary leaf wetting and seek local advice to identify the cause.",
      });
    }
  }

  // 4. Advice for other observations
  if (type === "other") {
    recommendations.push({
      priority: "medium",
      action:
        "Inspect the crop carefully and record additional symptoms, affected plant parts, and any recent changes in growing conditions.",
    });
  }

  // 5. Advice based on treatment status
  if (status === "observed") {
    recommendations.push({
      priority: "medium",
      action:
        "No treatment is recorded yet. Assess the problem and confirm its likely cause before deciding on an appropriate response.",
    });
  } else if (status === "treatment_applied") {
    recommendations.push({
      priority: "medium",
      action:
        "Monitor the crop after treatment and record whether symptoms improve or worsen. Follow the product label and local agricultural guidance.",
    });
  } else if (status === "resolved") {
    recommendations.push({
      priority: "low",
      action:
        "Continue routine monitoring to check that the problem does not return.",
    });
  }

  return {
    observationId: observation._id,
    cropId: observation.crop,
    problem: observation.name,
    severity,
    status,
    recommendations,
    disclaimer:
      "These are general monitoring suggestions, not a confirmed diagnosis. Verify the cause and consult local agricultural guidance before applying treatment.",
  };
};

module.exports = generateCropHealthRecommendations;

