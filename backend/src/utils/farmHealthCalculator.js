
function calculateFarmHealth(crops = []) {
  if (!Array.isArray(crops) || crops.length === 0) {
    return {
      score: 0,
      status: "No crop data",
      activeCropCount: 0,
      factors: [],
      recommendations: []
    };
  }

  // Exclude harvested crops
  const activeCrops = crops.filter((crop) =>
    ["planned", "growing", "ready"].includes(crop.status)
  );

  if (activeCrops.length === 0) {
    return {
      score: 100,
      status: "No active crops",
      activeCropCount: 0,
      factors: [],
      recommendations: []
    };
  }

  let score = 100;
  const factors = [];
  const recommendations = new Set();

  activeCrops.forEach((crop) => {
    const pests = crop.pests || [];
    const diseases = crop.diseases || [];

    if (pests.length > 0) {
      score -= 10;

      factors.push({
        crop: crop.name,
        issue: "Recorded pests",
        details: pests,
        impact: -10
      });

      recommendations.add(
        `Inspect ${crop.name} for recorded pests.`
      );
    }

    if (diseases.length > 0) {
      score -= 15;

      factors.push({
        crop: crop.name,
        issue: "Recorded diseases",
        details: diseases,
        impact: -15
      });

      recommendations.add(
        `Inspect ${crop.name} for recorded diseases.`
      );
    }
  });

  score = Math.max(0, Math.min(100, score));

  let status = "Healthy";

  if (score < 70) {
    status = "Needs attention";
  } else if (score < 85) {
    status = "Fair";
  }

  return {
    score,
    status,
    activeCropCount: activeCrops.length,
    factors,
    recommendations: [...recommendations]
  };
}

module.exports = calculateFarmHealth;
