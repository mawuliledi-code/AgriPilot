
import { useEffect, useState } from "react";
import {
  login,
  getMyFarms,
  getActionPlan,
  completeAction,
  getActionHistory,
  getMyCrops,
  getFarmWeather,
  createCrop,
  deleteCrop,
  updateCrop,
  getCropMonitoring,
} from "./api";
import "./App.css";

function getDashboardCropStatus(crop) {
  const status = (crop.status || "planned").toLowerCase();

  if (crop.plantingDate) {
    const plantingDate = new Date(crop.plantingDate);
    const today = new Date();

    plantingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (
      plantingDate > today &&
      ["growing", "ready", "harvested"].includes(status)
    ) {
      return "planned";
    }
  }

  return status;
}

function getDaysUntilHarvest(harvestDate) {
  if (!harvestDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const harvest = new Date(`${String(harvestDate).slice(0, 10)}T00:00:00`);

  return Math.ceil(
    (harvest.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function calculateFarmHealth(crops) {
  if (!crops || crops.length === 0) {
    return null;
  }

  let score = 100;

  const activeCrops = crops.filter(
    (crop) => getDashboardCropStatus(crop) !== "harvested"
  );

  const cropsWithIssues = activeCrops.filter(
    (crop) =>
      (crop.pests?.length || 0) > 0 ||
      (crop.diseases?.length || 0) > 0
  );

  const overdueCrops = activeCrops.filter((crop) => {
    const daysLeft = getDaysUntilHarvest(crop.expectedHarvestDate);
    return daysLeft !== null && daysLeft < 0;
  });

  score -= cropsWithIssues.length * 15;
  score -= overdueCrops.length * 10;

  return Math.max(0, Math.min(100, score));
}

// Convert comma-separated text into a clean array.
function convertToArray(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionPlan, setActionPlan] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [farmId, setFarmId] = useState("");

  // Dashboard page navigation
  const [activeSection, setActiveSection] = useState("overview");
  const [actionFilter, setActionFilter] = useState("all");

  // Action history
  const [actionHistory, setActionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Recommended actions
  const [planLoading, setPlanLoading] = useState(false);
  const [completingAction, setCompletingAction] = useState(null);

  // Crop management
  const [crops, setCrops] = useState([]);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState("");


  // Generate crop health alerts for the dashboard
  const cropHealthAlerts = crops
    .filter((crop) => crop.status !== "harvested")
    .flatMap((crop) => {
      const alerts = [];

      if (Array.isArray(crop.pests) && crop.pests.length > 0) {
        alerts.push({
          id: `${crop._id}-pests`,
          cropId: crop._id,
          cropName: crop.name,
          issue: "Recorded pests",
          details: crop.pests
        });
      }

      if (Array.isArray(crop.diseases) && crop.diseases.length > 0) {
        alerts.push({
          id: `${crop._id}-diseases`,
          cropId: crop._id,
          cropName: crop.name,
          issue: "Recorded diseases",
          details: crop.diseases
        });
      }

      return alerts;
    });


  // Crop monitoring
  const [cropMonitoring, setCropMonitoring] = useState({});
  const [monitoringLoadingId, setMonitoringLoadingId] = useState(null);
  const [monitoringErrors, setMonitoringErrors] = useState({});

  // Farm Health Summary calculations
  const farmHealthScore = calculateFarmHealth(crops);

  const healthyCrops = crops.filter(
    (crop) =>
      ["growing", "ready"].includes(
        getDashboardCropStatus(crop)
      ) &&
      (!crop.pests || crop.pests.length === 0) &&
      (!crop.diseases || crop.diseases.length === 0)
  );

  const cropsNeedingAttention = crops.filter(
    (crop) =>
      getDashboardCropStatus(crop) !== "harvested" &&
      ((crop.pests && crop.pests.length > 0) ||
        (crop.diseases && crop.diseases.length > 0))
  );

  const harvestedCrops = crops.filter(
    (crop) => getDashboardCropStatus(crop) === "harvested"
  );

  const totalMonitoredCrops = Object.keys(cropMonitoring).length;

  // Weather dashboard
  const [farmWeather, setFarmWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  // Edit crop
  const [editingCropId, setEditingCropId] = useState(null);
  const [editPlantingDate, setEditPlantingDate] = useState("");
  const [editHarvestDate, setEditHarvestDate] = useState("");
  const [editCropStatus, setEditCropStatus] = useState("planned");
  const [editCropNotes, setEditCropNotes] = useState("");

  // NEW: Pest and disease edit fields
  const [editCropPests, setEditCropPests] = useState("");
  const [editCropDiseases, setEditCropDiseases] = useState("");

  const [savingCropChanges, setSavingCropChanges] = useState(false);
  const [editCropError, setEditCropError] = useState("");
  const [editCropSuccess, setEditCropSuccess] = useState("");

  // Add crop
  const [showCropForm, setShowCropForm] = useState(false);
  const [cropName, setCropName] = useState("Maize");
  const [plantingDate, setPlantingDate] = useState("2026-10-24");
  const [expectedHarvestDate, setExpectedHarvestDate] =
    useState("2027-02-24");
  const [newCropStatus, setNewCropStatus] = useState("planned");
  const [cropNotes, setCropNotes] = useState("");
  const [savingCrop, setSavingCrop] = useState(false);
  const [cropFormError, setCropFormError] = useState("");
  const [cropFormSuccess, setCropFormSuccess] = useState("");

  // Load the action plan
  async function loadActionPlan(token, selectedFarmId = farmId) {
    if (!selectedFarmId) {
      setError("No farm found. Please add a farm first.");
      return;
    }

    setPlanLoading(true);
    setError("");

    try {
      const data = await getActionPlan(selectedFarmId, token);
      setActionPlan(data);
      return data;
    } catch (err) {
      setError(err.message || "Could not load your action plan.");
      throw err;
    } finally {
      setPlanLoading(false);
    }
  }

  // Load action history
  async function loadActionHistory(token, selectedFarmId = farmId) {
    if (!selectedFarmId) return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const data = await getActionHistory(selectedFarmId, token);

      const records = Array.isArray(data)
        ? data
        : data.completions || data.history || data.data || [];

      setActionHistory(records);
    } catch (err) {
      setHistoryError(err.message || "Could not load action history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  // Load crops from the backend
  async function loadCrops(token) {
    setCropLoading(true);
    setCropError("");

    try {
      const data = await getMyCrops(token);

      const cropRecords = Array.isArray(data)
        ? data
        : data.crops || data.data || [];

      setCrops(cropRecords);
      return cropRecords;
    } catch (err) {
      setCropError(err.message || "Could not load your crops.");
      console.error("Error loading crops:", err);
      throw err;
    } finally {
      setCropLoading(false);
    }
  }

  // Load weather for the farm
  async function loadFarmWeather(token, selectedFarmId = farmId) {
    if (!selectedFarmId) return;

    setWeatherLoading(true);
    setWeatherError("");

    try {
      const data = await getFarmWeather(selectedFarmId, token);
      setFarmWeather(data);
      return data;
    } catch (err) {
      setWeatherError(err.message || "Could not load farm weather.");
      console.error("Error loading farm weather:", err);
    } finally {
      setWeatherLoading(false);
    }
  }

  // Restore an existing login session
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = sessionStorage.getItem("agripilotToken");

      if (!token) {
        if (active) setCheckingSession(false);
        return;
      }

      try {
        const farmData = await getMyFarms(token);

        if (!active) return;

        const farms = farmData.farms || [];

        if (farms.length === 0) {
          setFarmId("");
          setActionPlan(null);
          setError("No farm found. Please add a farm first.");
          return;
        }

        const selectedFarmId = farms[0]._id;
        setFarmId(selectedFarmId);

        const plan = await getActionPlan(selectedFarmId, token);

        if (!active) return;

        setActionPlan(plan);

        await Promise.all([
          loadActionHistory(token, selectedFarmId),
          loadCrops(token),
          loadFarmWeather(token, selectedFarmId),
        ]);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Could not restore your session.");
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Remove the initial HTML loader after React has rendered
  useEffect(() => {
    if (!checkingSession) {
      document.getElementById("initial-loader")?.remove();
    }
  }, [checkingSession]);

  // Fetch fresh monitoring data every time the user clicks the button
  async function handleViewMonitoring(crop) {
    const token = sessionStorage.getItem("agripilotToken");
    const cropId = crop?._id;

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    if (!cropId) {
      setError("This crop has no valid ID.");
      return;
    }

    if (monitoringLoadingId === cropId) return;

    setMonitoringLoadingId(cropId);
    setError("");

    setMonitoringErrors((previous) => ({
      ...previous,
      [cropId]: "",
    }));

    try {
      const result = await getCropMonitoring(token, cropId);

      if (!result?.monitoring) {
        throw new Error(
          "The server response did not contain monitoring data."
        );
      }

      setCropMonitoring((previous) => ({
        ...previous,
        [cropId]: result.monitoring,
      }));
    } catch (err) {
      setMonitoringErrors((previous) => ({
        ...previous,
        [cropId]:
          err.message || "Could not refresh crop monitoring.",
      }));
    } finally {
      setMonitoringLoadingId((current) =>
        current === cropId ? null : current
      );
    }
  }

  // Close the monitoring panel without deleting stored information
  function handleCloseMonitoring(cropId) {
    setCropMonitoring((previous) => {
      const updated = { ...previous };
      delete updated[cropId];
      return updated;
    });

    setMonitoringErrors((previous) => {
      const updated = { ...previous };
      delete updated[cropId];
      return updated;
    });
  }

  // Sign in
  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(email, password);

      if (!data?.token) {
        throw new Error("Login succeeded without a valid token.");
      }

      const token = data.token;
      sessionStorage.setItem("agripilotToken", token);

      const farmData = await getMyFarms(token);
      const farms = farmData.farms || [];

      if (farms.length === 0) {
        setFarmId("");
        throw new Error("No farm found. Please add a farm first.");
      }

      const selectedFarmId = farms[0]._id;
      setFarmId(selectedFarmId);

      const plan = await getActionPlan(selectedFarmId, token);
      setActionPlan(plan);

      await Promise.all([
        loadActionHistory(token, selectedFarmId),
        loadCrops(token),
        loadFarmWeather(token, selectedFarmId),
      ]);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
      setCheckingSession(false);
    }
  }

  // Add a new crop
  async function handleCreateCrop(event) {
    event.preventDefault();

    const token = sessionStorage.getItem("agripilotToken");

    if (!token) {
      setCropFormError("Please log in again before adding a crop.");
      return;
    }

    if (!farmId) {
      setCropFormError("No farm selected. Please try again.");
      return;
    }

    if (!plantingDate || !expectedHarvestDate) {
      setCropFormError("Please enter both dates.");
      return;
    }

    if (expectedHarvestDate < plantingDate) {
      setCropFormError(
        "The expected harvest date cannot be before the planting date."
      );
      return;
    }

    try {
      setSavingCrop(true);
      setCropFormError("");
      setCropFormSuccess("");

      const cropData = {
        name: cropName,
        plantingDate,
        expectedHarvestDate,
        status: newCropStatus,
        notes: cropNotes.trim(),
        farm: farmId,
      };

      await createCrop(token, cropData);
      await loadCrops(token);

      setCropFormSuccess(`${cropName} was added successfully.`);
      setShowCropForm(false);

      setCropName("Maize");
      setPlantingDate("");
      setExpectedHarvestDate("");
      setNewCropStatus("planned");
      setCropNotes("");
    } catch (err) {
      setCropFormError(err.message || "Could not add the crop.");
    } finally {
      setSavingCrop(false);
    }
  }

  // Open the edit form with the crop's current details
  function handleEditCrop(crop) {
    setEditingCropId(crop._id);

    setEditPlantingDate(
      crop.plantingDate
        ? new Date(crop.plantingDate).toISOString().slice(0, 10)
        : ""
    );

    setEditHarvestDate(
      crop.expectedHarvestDate
        ? new Date(crop.expectedHarvestDate).toISOString().slice(0, 10)
        : ""
    );

    setEditCropStatus(crop.status || "planned");
    setEditCropNotes(crop.notes || "");

    // NEW: Load existing pests into the edit form
    setEditCropPests(
      Array.isArray(crop.pests) ? crop.pests.join(", ") : ""
    );

    // NEW: Load existing diseases into the edit form
    setEditCropDiseases(
      Array.isArray(crop.diseases) ? crop.diseases.join(", ") : ""
    );

    setEditCropError("");
    setEditCropSuccess("");
  }

  // Update an existing crop
  async function handleUpdateCrop(event) {
    event.preventDefault();

    const token = sessionStorage.getItem("agripilotToken");

    if (!token) {
      setEditCropError("Your session has expired. Please log in again.");
      return;
    }

    if (!editingCropId) {
      setEditCropError("This crop has no valid ID.");
      return;
    }

    if (!editPlantingDate || !editHarvestDate) {
      setEditCropError("Please enter both dates.");
      return;
    }

    if (editHarvestDate < editPlantingDate) {
      setEditCropError(
        "Expected harvest date cannot be before the planting date."
      );
      return;
    }

    const cropId = editingCropId;

    // NEW: Convert pests and diseases into arrays
    const pestsArray = convertToArray(editCropPests);
    const diseasesArray = convertToArray(editCropDiseases);

    try {
      setSavingCropChanges(true);
      setEditCropError("");
      setEditCropSuccess("");

      await updateCrop(token, cropId, {
        plantingDate: editPlantingDate,
        expectedHarvestDate: editHarvestDate,
        status: editCropStatus,
        notes: editCropNotes.trim(),

        // NEW: Send both arrays to the backend
        pests: pestsArray,
        diseases: diseasesArray,
      });

      await loadCrops(token);

      setCropMonitoring((previous) => {
        const updated = { ...previous };
        delete updated[cropId];
        return updated;
      });

      setMonitoringErrors((previous) => {
        const updated = { ...previous };
        delete updated[cropId];
        return updated;
      });

      setEditCropSuccess("Crop updated successfully!");
      setEditingCropId(null);
    } catch (err) {
      setEditCropError(err.message || "Could not update crop.");
    } finally {
      setSavingCropChanges(false);
    }
  }

  // Delete an existing crop
  async function handleDeleteCrop(crop) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${crop.name || "this crop"}?`
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("agripilotToken");

    if (!token) {
      setCropError("Your session has expired. Please log in again.");
      return;
    }

    try {
      setCropLoading(true);
      setCropError("");

      await deleteCrop(token, crop._id);
      await loadCrops(token);

      setCropMonitoring((previous) => {
        const updated = { ...previous };
        delete updated[crop._id];
        return updated;
      });

      setMonitoringErrors((previous) => {
        const updated = { ...previous };
        delete updated[crop._id];
        return updated;
      });
    } catch (err) {
      setCropError(err.message || "Could not delete crop.");
    } finally {
      setCropLoading(false);
    }
  }

  // Complete a recommended action
  async function handleCompleteAction(action) {
    const token = sessionStorage.getItem("agripilotToken");

    if (!token) {
      setError("Please log in again to complete this action.");
      return;
    }

    const outcome = window.prompt(
      "What actually happened when you carried out this action?"
    );

    if (outcome === null || !outcome.trim()) return;

    const notes = window.prompt("Additional notes (optional):");
    if (notes === null) return;

    if (!action.type || !action.action) {
      setError("This action is missing its type or description.");
      return;
    }

    const completionData = {
      actionType: action.type,
      actionDescription: action.action,
      outcome: outcome.trim(),
      notes: notes.trim(),
    };

    if (action.cropId) completionData.cropId = action.cropId;
    if (action.observationId) {
      completionData.observationId = action.observationId;
    }
    if (action.weatherEventId) {
      completionData.weatherEventId = action.weatherEventId;
    }

    const actionKey =
      action.observationId || action.weatherEventId || action.type;

    try {
      setCompletingAction(actionKey);
      setError("");

      if (!farmId) {
        setError("No farm selected. Please try again.");
        return;
      }

      await completeAction(farmId, token, completionData);
      await loadActionPlan(token, farmId);
      await loadActionHistory(token, farmId);
    } catch (err) {
      setError(err.message || "Could not complete this action.");
    } finally {
      setCompletingAction(null);
    }
  }

  // Log out
  function handleLogout() {
    sessionStorage.removeItem("agripilotToken");

    setActionPlan(null);
    setActionHistory([]);
    setCrops([]);
    setCropMonitoring({});
    setMonitoringErrors({});
    setMonitoringLoadingId(null);
    setFarmWeather(null);
    setWeatherError("");
    setPassword("");
    setError("");
    setHistoryError("");
    setCropError("");
    setCropFormError("");
    setCropFormSuccess("");
    setShowCropForm(false);
    setEditingCropId(null);

    // NEW: Clear edit form fields
    setEditCropPests("");
    setEditCropDiseases("");
    setEditCropNotes("");
    setEditPlantingDate("");
    setEditHarvestDate("");
    setEditCropStatus("planned");

    setEditCropError("");
    setEditCropSuccess("");
    setActiveSection("overview");
  }

  // Loading screen
  if (checkingSession) {
    return (
      <main className="login-page">
        <section className="login-card">
          <p className="eyebrow">AGRIPILOT</p>
          <h1>Loading your farm dashboard...</h1>
          <p className="login-subtitle">
            Checking your session, please wait.
          </p>
        </section>
      </main>
    );
  }

  // Main dashboard
  if (actionPlan) {
    const actions = actionPlan.actions || [];

    const pendingActions = actions.filter(
      (action) => action.status === "pending"
    );

    const filteredActions = actions.filter((action) => {
      if (actionFilter === "all") return true;
      return action.status === actionFilter;
    });

    return (
      <main className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon">🌱</span>
            <span>AgriPilot</span>
          </div>

          <p className="sidebar-label">WORKSPACE</p>

          {/* Sidebar navigation */}
          <nav className="sidebar-nav">
            <a
              href="#overview"
              className={`nav-link ${
                activeSection === "overview" ? "active" : ""
              }`}
              onClick={(event) => {
                event.preventDefault();
                setActiveSection("overview");
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              <span>▦</span> Overview
            </a>

            <a
              href="#crop-management"
              className="nav-link"
              onClick={() => setActiveSection("overview")}
            >
              <span>🌾</span> Crop Management
            </a>

            <a
              href="#crop-health-alerts"
              className="nav-link"
              onClick={() => setActiveSection("overview")}
            >
              <span>⚠️</span> Crop Health Alerts
              {cropHealthAlerts.length > 0 && (
                <span className="alert-count">
                  {cropHealthAlerts.length}
                </span>
              )}
            </a>

            <a
              href="#recommended-actions"
              className="nav-link"
              onClick={() => setActiveSection("overview")}
            >
              <span>✓</span> Recommended Actions
            </a>

            <a
              href="#action-history"
              className="nav-link"
              onClick={() => setActiveSection("overview")}
            >
              <span>↻</span> Action History
            </a>

            <a
              href="#farm-weather"
              className={`nav-link ${
                activeSection === "weather" ? "active" : ""
              }`}
              onClick={(event) => {
                event.preventDefault();
                setActiveSection("weather");
              }}
            >
              <span>☀️</span> Farm Weather
            </a>
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-footer-icon">🌾</span>
            <div>
              <strong>Smart farming</strong>
              <p>Better farming decisions, less food waste.</p>
            </div>
          </div>
        </aside>

        <div className="dashboard" id="overview">
          {/* Shared dashboard header */}
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">AGRIPILOT</p>
              <h1>
                {activeSection === "weather"
                  ? "Farm Weather"
                  : "Your Farm Dashboard"}
              </h1>
              <p>
                {actionPlan.farm?.name || "Your Farm"} ·{" "}
                {actionPlan.farm?.location?.city || "Farm location"}
              </p>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </header>

          {activeSection === "weather" ? (
            /* Separate Farm Weather page */
            <section
              className="actions-section weather-section"
              id="farm-weather"
            >
              <h2>Farm Weather</h2>

              <p className="history-subtitle">
                Current weather conditions and the 7-day forecast for your farm.
              </p>

              {weatherLoading ? (
                <p>Loading farm weather...</p>
              ) : weatherError ? (
                <p className="error-message" role="alert">
                  {weatherError}
                </p>
              ) : farmWeather?.weather ? (
                <>
                  <div className="weather-current">
                    <h3>Current Conditions</h3>

                    <p className="weather-temperature">
                      {farmWeather.weather.current.temperature_2m}°C
                    </p>

                    <p>
                      Humidity:{" "}
                      {farmWeather.weather.current.relative_humidity_2m}%
                    </p>

                    <p>
                      Wind:{" "}
                      {farmWeather.weather.current.wind_speed_10m} km/h
                    </p>

                    <p>
                      Rainfall:{" "}
                      {farmWeather.weather.current.precipitation} mm
                    </p>
                  </div>

                  <h3>7-Day Forecast</h3>

                  <div className="weather-forecast">
                    {farmWeather.weather.daily.time.map((date, index) => (
                      <article className="weather-day" key={date}>
                        <strong>
                          {new Date(`${date}T12:00:00`).toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </strong>

                        <p>
                          {farmWeather.weather.daily.temperature_2m_max[index]}
                          °C /{" "}
                          {farmWeather.weather.daily.temperature_2m_min[index]}
                          °C
                        </p>

                        <p>
                          Rain:{" "}
                          {farmWeather.weather.daily.precipitation_sum[index]}{" "}
                          mm
                        </p>

                        <p>
                          Rain chance:{" "}
                          {farmWeather.weather.daily
                            .precipitation_probability_max[index]}
                          %
                        </p>
                      </article>
                    ))}
                  </div>

                  <h3>Farming Recommendations</h3>

                  {farmWeather.recommendations?.length > 0 ? (
                    farmWeather.recommendations.map(
                      (recommendation, index) => (
                        <article className="action-card" key={index}>
                          <p>
                            {typeof recommendation === "string"
                              ? recommendation
                              : recommendation.message ||
                                recommendation.description ||
                                JSON.stringify(recommendation)}
                          </p>
                        </article>
                      )
                    )
                  ) : (
                    <p>No specific weather recommendations right now.</p>
                  )}
                </>
              ) : (
                <p>Weather information is not available yet.</p>
              )}

              <button
                type="button"
                className="refresh-button"
                onClick={() => {
                  const token = sessionStorage.getItem("agripilotToken");
                  if (token) loadFarmWeather(token);
                }}
                disabled={weatherLoading}
              >
                {weatherLoading ? "Refreshing weather..." : "Refresh weather"}
              </button>
            </section>
          ) : (
            /* Normal dashboard page */
            <>
              {/* FARM HEALTH SCORE */}
              <section className="farm-health-score-card">
                <div className="farm-health-score-content">
                  <p className="eyebrow">FARM PERFORMANCE</p>
                  <h2>Farm Health Score</h2>
                  <p>
                    An overview of your farm's current crop health.
                  </p>

                  <div className="farm-health-score-track">
                    <div
                      className={`farm-health-score-fill ${
                        farmHealthScore < 50
                          ? "low"
                          : farmHealthScore < 75
                            ? "medium"
                            : ""
                      }`}
                      style={{
                        width: `${farmHealthScore ?? 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="farm-health-score-value">
                  {farmHealthScore === null ? "--" : farmHealthScore}
                  <span> / 100</span>
                </div>
              </section>

              {/* Dashboard statistics */}
              <section className="stats-grid">
                <article className="stat-card">
                  <span>Total crops</span>
                  <strong>{crops.length}</strong>
                </article>

                <article className="stat-card">
                  <span>Growing crops</span>
                  <strong>
                    {
                      crops.filter(
                        (crop) =>
                          getDashboardCropStatus(crop) === "growing"
                      ).length
                    }
                  </strong>
                </article>

                <article className="stat-card">
                  <span>Ready for harvest</span>
                  <strong>
                    {
                      crops.filter(
                        (crop) =>
                          getDashboardCropStatus(crop) === "ready"
                      ).length
                    }
                  </strong>
                </article>

                <article className="stat-card">
                  <span>Pending actions</span>
                  <strong>{actionPlan.pendingActions ?? 0}</strong>
                </article>
              </section>

              {/* Farm Health Summary */}
              <section className="farm-health-section">
                <div className="farm-health-heading">
                  <div>
                    <p className="eyebrow">FARM INTELLIGENCE</p>
                    <h2>Farm Health Summary</h2>
                    <p>A quick look at the health of your crops.</p>
                  </div>
                </div>

                <div className="farm-health-grid">
                  <article className="farm-health-card healthy">
                    <span>Healthy Crops</span>
                    <strong>{healthyCrops.length}</strong>
                    <p>No recorded pests or diseases</p>
                  </article>

                  <article className="farm-health-card attention">
                    <span>Needs Attention</span>
                    <strong>{cropsNeedingAttention.length}</strong>
                    <p>Crops with recorded issues</p>
                  </article>

                  <article className="farm-health-card monitored">
                    <span>Monitoring Results</span>
                    <strong>{totalMonitoredCrops}</strong>
                    <p>Crops checked during this session</p>
                  </article>

                  <article className="farm-health-card total">
                    <span>Harvested Crops</span>
                    <strong>{harvestedCrops.length}</strong>
                    <p>Crops already harvested</p>
                  </article>
                </div>

                {cropsNeedingAttention.length > 0 && (
                  <div className="crops-attention-list">
                    <h3>Crops Requiring Attention</h3>

                    {cropsNeedingAttention.map((crop) => (
                      <div className="crop-attention-item" key={crop._id}>
                        <strong>{crop.name}</strong>

                        <span>
                          {crop.pests?.length || 0} recorded pest(s) ·{" "}
                          {crop.diseases?.length || 0} recorded disease(s)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* What Needs Attention */}
              <section className="attention-panel">
                <div className="attention-heading">
                  <div>
                    <p className="eyebrow">FARM PRIORITIES</p>
                    <h2>What Needs Attention?</h2>
                    <p>
                      Review the next actions recommended for your farm.
                    </p>
                  </div>

                  <span className="attention-count">
                    {pendingActions.length} pending
                  </span>
                </div>

                {pendingActions.length === 0 ? (
                  <p className="attention-empty">
                    All current recommended actions have been completed.
                  </p>
                ) : (
                  <div className="attention-list">
                    {pendingActions.slice(0, 3).map((action, index) => (
                      <article
                        className="attention-item"
                        key={
                          action.weatherEventId ||
                          action.observationId ||
                          action.type ||
                          index
                        }
                      >
                        <div className="attention-item-icon">!</div>

                        <div className="attention-item-content">
                          <h3>{action.action || "Farm action"}</h3>

                          <p>
                            {action.message ||
                              action.urgencyReason ||
                              action.whyThisMatters ||
                              "Review this recommendation and take the appropriate action."}
                          </p>

                          {action.crop && (
                            <span className="attention-crop">
                              Crop: {action.crop}
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <a className="attention-link" href="#recommended-actions">
                  View all recommended actions →
                </a>
              </section>

              {/* Farm Overview */}
              <section className="farm-overview">
                <div className="farm-overview-heading">
                  <div>
                    <p className="eyebrow">CROP PLANNING</p>
                    <h2>Your Crops Progress</h2>
                    <p>
                      Track crops planned for planting and crops already harvested.
                    </p>
                  </div>

                  <span className="farm-location-badge">
                    🌍 {actionPlan.farm?.location?.city || "Your farm"}
                  </span>
                </div>

                <div className="crop-stats-grid">
                  <article className="crop-stat-card planned">
                    <span>Planned crops</span>
                    <strong>
                      {
                        crops.filter(
                          (crop) =>
                            getDashboardCropStatus(crop) === "planned"
                        ).length
                      }
                    </strong>
                    <p>Crops awaiting planting</p>
                  </article>

                  <article className="crop-stat-card">
                    <span>Harvested crops</span>
                    <strong>{harvestedCrops.length}</strong>
                    <p>Crops already harvested</p>
                  </article>
                </div>
              </section>

              {/* Upcoming Harvests */}
              <section className="harvest-section">
                <div className="harvest-heading">
                  <div>
                    <p className="eyebrow">HARVEST PLANNING</p>
                    <h2>Upcoming Harvests</h2>
                    <p>
                      Keep track of crops approaching their expected harvest dates.
                    </p>
                  </div>
                </div>

                {crops.filter(
                  (crop) =>
                    crop.expectedHarvestDate &&
                    getDashboardCropStatus(crop) !== "harvested"
                ).length === 0 ? (
                  <p className="harvest-empty">
                    No upcoming harvest dates recorded yet.
                  </p>
                ) : (
                  <div className="harvest-list">
                    {[...crops]
                      .filter(
                        (crop) =>
                          crop.expectedHarvestDate &&
                          getDashboardCropStatus(crop) !== "harvested"
                      )
                      .sort(
                        (a, b) =>
                          new Date(a.expectedHarvestDate) -
                          new Date(b.expectedHarvestDate)
                      )
                      .slice(0, 5)
                      .map((crop) => {
                        const daysLeft = getDaysUntilHarvest(
                          crop.expectedHarvestDate
                        );

                        const harvestStatus =
                          daysLeft < 0
                            ? "overdue"
                            : daysLeft <= 7
                              ? "soon"
                              : daysLeft <= 14
                                ? "approaching"
                                : "normal";

                        return (
                          <article className="harvest-item" key={crop._id}>
                            <div className="harvest-crop-icon">🌾</div>

                            <div className="harvest-item-details">
                              <h3>{crop.name}</h3>
                              <p>
                                Expected harvest:{" "}
                                {new Date(
                                  `${crop.expectedHarvestDate.slice(0, 10)}T00:00:00`
                                ).toLocaleDateString("en-GB")}
                              </p>
                            </div>

                            <span
                              className={`harvest-countdown ${harvestStatus}`}
                            >
                              {daysLeft < 0
                                ? `${Math.abs(daysLeft)} days overdue`
                                : daysLeft === 0
                                  ? "Expected today"
                                  : daysLeft <= 7
                                    ? `${daysLeft} days left`
                                    : daysLeft <= 14
                                      ? "Approaching harvest"
                                      : `${daysLeft} days left`}
                            </span>
                          </article>
                        );
                      })}
                  </div>
                )}
              </section>

              {/* Crop Management */}
              <section className="actions-section" id="crop-management">
                <h2>Crop Management</h2>

                <p className="history-subtitle">
                  Monitor your crops, planting dates and expected harvests.
                </p>

                <div className="crop-management-controls">
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={() => {
                      setShowCropForm((current) => !current);
                      setCropFormError("");
                      setCropFormSuccess("");
                    }}
                  >
                    {showCropForm ? "Cancel" : "+ Add Crop"}
                  </button>
                </div>

                {cropFormSuccess && (
                  <p className="crop-success-message">
                    {cropFormSuccess}
                  </p>
                )}

                {cropFormError && (
                  <p className="crop-error-message">{cropFormError}</p>
                )}

                {showCropForm && (
                  <form
                    className="add-crop-form"
                    onSubmit={handleCreateCrop}
                  >
                    <h3>Add a New Crop</h3>

                    <label htmlFor="cropName">Crop name</label>

                    <select
                      id="cropName"
                      value={cropName}
                      onChange={(event) => setCropName(event.target.value)}
                      required
                    >
                      <option value="Tomatoes">Tomatoes</option>
                      <option value="Maize">Maize</option>
                      <option value="Carrots">Carrots</option>
                      <option value="Cabbage">Cabbage</option>
                      <option value="Onions">Onions</option>
                      <option value="Pepper">Pepper</option>
                      <option value="Beans">Beans</option>
                      <option value="Spring Onion">Spring Onion</option>
                    </select>

                    <label htmlFor="plantingDate">Planting date</label>

                    <input
                      id="plantingDate"
                      type="date"
                      value={plantingDate}
                      onChange={(event) =>
                        setPlantingDate(event.target.value)
                      }
                      required
                    />

                    <label htmlFor="expectedHarvestDate">
                      Expected harvest date
                    </label>

                    <input
                      id="expectedHarvestDate"
                      type="date"
                      value={expectedHarvestDate}
                      onChange={(event) =>
                        setExpectedHarvestDate(event.target.value)
                      }
                      required
                    />

                    <label htmlFor="newCropStatus">Status</label>

                    <select
                      id="newCropStatus"
                      value={newCropStatus}
                      onChange={(event) =>
                        setNewCropStatus(event.target.value)
                      }
                      required
                    >
                      <option value="planned">Planned</option>
                      <option value="growing">Growing</option>
                      <option value="ready">Ready</option>
                      <option value="harvested">Harvested</option>
                    </select>

                    <label htmlFor="cropNotes">Notes (optional)</label>

                    <textarea
                      id="cropNotes"
                      value={cropNotes}
                      onChange={(event) => setCropNotes(event.target.value)}
                      placeholder="Enter any information about this crop"
                      rows={3}
                    />

                    <button type="submit" disabled={savingCrop}>
                      {savingCrop ? "Saving Crop..." : "Save Crop"}
                    </button>
                  </form>
                )}

                {cropLoading ? (
                  <p>Loading your crops...</p>
                ) : cropError ? (
                  <>
                    <p className="error-message">{cropError}</p>

                    <button
                      type="button"
                      className="refresh-button"
                      onClick={() => {
                        const token =
                          sessionStorage.getItem("agripilotToken");
                        if (token) loadCrops(token);
                      }}
                      disabled={cropLoading}
                    >
                      Try again
                    </button>
                  </>
                ) : crops.length === 0 ? (
                  <p>No crops found. Your saved crops will appear here.</p>
                ) : (
                  <div className="crop-grid">
                    {crops.map((crop, index) => {
                      const monitoring = cropMonitoring[crop._id];

                      return (
                        <article
                          className="action-card crop-card"
                          key={crop._id || index}
                        >
                          <div className="action-card-header">
                            <div>
                              <span className="action-category">Crop</span>
                              <h3>{crop.name || "Unnamed crop"}</h3>
                            </div>

                            <span
                              className={`action-status ${
                                crop.status || "unknown"
                              }`}
                            >
                              {crop.status || "Unknown"}
                            </span>
                          </div>

                          {crop.type && (
                            <p className="action-detail">
                              <strong>Type:</strong> {crop.type}
                            </p>
                          )}

                          {crop.plantingDate && (
                            <p className="action-detail">
                              <strong>Planting date:</strong>{" "}
                              {new Date(
                                crop.plantingDate
                              ).toLocaleDateString()}
                            </p>
                          )}

                          {crop.expectedHarvestDate && (
                            <p className="action-detail">
                              <strong>Expected harvest:</strong>{" "}
                              {new Date(
                                crop.expectedHarvestDate
                              ).toLocaleDateString()}
                            </p>
                          )}

                          {crop.notes && (
                            <div className="action-info">
                              <strong>Notes</strong>
                              <p>{crop.notes}</p>
                            </div>
                          )}

                          {/* Crop Monitoring */}
                          <button
                            type="button"
                            className="refresh-button"
                            onClick={() => handleViewMonitoring(crop)}
                            disabled={
                              !crop._id ||
                              monitoringLoadingId === crop._id
                            }
                          >
                            {monitoringLoadingId === crop._id
                              ? "Refreshing monitoring..."
                              : monitoring
                                ? "Refresh Monitoring"
                                : "View Monitoring"}
                          </button>

                          {monitoringErrors[crop._id] && (
                            <p className="error-message" role="alert">
                              {monitoringErrors[crop._id]}
                            </p>
                          )}

                          {monitoring && (
                            <div className="crop-monitoring-panel">
                              {/* NEW: Monitoring heading and close button */}
                              <div className="monitoring-panel-header">
                                <h4>Crop Monitoring</h4>

                                <button
                                  type="button"
                                  className="refresh-button"
                                  onClick={() =>
                                    handleCloseMonitoring(crop._id)
                                  }
                                >
                                  Close Monitoring
                                </button>
                              </div>

                              <p>
                                <strong>Status:</strong>{" "}
                                {monitoring.status || "Unavailable"}
                              </p>

                              <p>
                                <strong>Estimated progress:</strong>{" "}
                                {monitoring.progressPercentage == null
                                  ? "Unavailable"
                                  : `${monitoring.progressPercentage}%`}
                              </p>

                              {monitoring.progressPercentage != null && (
                                <div
                                  className="monitoring-progress-track"
                                  role="progressbar"
                                  aria-label={`${crop.name} estimated growing progress`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={
                                    monitoring.progressPercentage
                                  }
                                >
                                  <div
                                    className="monitoring-progress-fill"
                                    style={{
                                      width: `${monitoring.progressPercentage}%`,
                                    }}
                                  />
                                </div>
                              )}

                              <p>
                                <strong>Days elapsed:</strong>{" "}
                                {monitoring.elapsedDays ?? "Unavailable"}
                              </p>

                              <p>
                                <strong>Days until harvest:</strong>{" "}
                                {monitoring.daysUntilHarvest == null
                                  ? "No harvest date available"
                                  : monitoring.daysUntilHarvest < 0
                                    ? `${Math.abs(
                                        monitoring.daysUntilHarvest
                                      )} days overdue`
                                    : monitoring.daysUntilHarvest === 0
                                      ? "Expected today"
                                      : monitoring.daysUntilHarvest}
                              </p>

                              <p>
                                <strong>Harvest timing:</strong>{" "}
                                {(
                                  monitoring.harvestTiming || "unknown"
                                ).replace(/_/g, " ")}
                              </p>

                              {monitoring.pests?.length > 0 && (
                                <div className="action-info">
                                  <strong>Recorded pests</strong>
                                  <p>{monitoring.pests.join(", ")}</p>
                                </div>
                              )}

                              {monitoring.diseases?.length > 0 && (
                                <div className="action-info">
                                  <strong>Recorded diseases</strong>
                                  <p>{monitoring.diseases.join(", ")}</p>
                                </div>
                              )}

                              {monitoring.recommendedActions?.length > 0 && (
                                <div className="action-info">
                                  <strong>Recommended next actions</strong>

                                  {monitoring.recommendedActions.map(
                                    (recommendation, recommendationIndex) => (
                                      <div
                                        key={`${recommendation.action}-${recommendationIndex}`}
                                      >
                                        <p>
                                          <strong>
                                            {(
                                              recommendation.priority ||
                                              "normal"
                                            ).toUpperCase()}
                                            :
                                          </strong>{" "}
                                          {recommendation.action}
                                        </p>
                                        <p>{recommendation.reason}</p>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              <p className="monitoring-disclaimer">
                                Calendar-based estimates only. Inspect the
                                actual crop before deciding whether it is
                                ready for harvest.
                              </p>
                            </div>
                          )}

                          {/* Edit Crop */}
                          <button
                            className="refresh-button"
                            type="button"
                            onClick={() => handleEditCrop(crop)}
                            disabled={!crop._id}
                          >
                            {editingCropId === crop._id
                              ? "Editing Crop"
                              : "Edit Crop"}
                          </button>

                          <button
                            type="button"
                            className="refresh-button"
                            onClick={() => handleDeleteCrop(crop)}
                            disabled={!crop._id || cropLoading}
                          >
                            Delete Crop
                          </button>

                          {editingCropId === crop._id && (
                            <form
                              className="crop-edit-form"
                              onSubmit={handleUpdateCrop}
                            >
                              <h4>Edit {crop.name || "Crop"}</h4>

                              <label>
                                Planting date
                                <input
                                  type="date"
                                  value={editPlantingDate}
                                  onChange={(event) =>
                                    setEditPlantingDate(event.target.value)
                                  }
                                  required
                                />
                              </label>

                              <label>
                                Expected harvest date
                                <input
                                  type="date"
                                  value={editHarvestDate}
                                  onChange={(event) =>
                                    setEditHarvestDate(event.target.value)
                                  }
                                  required
                                />
                              </label>

                              <label>
                                Crop status
                                <select
                                  value={editCropStatus}
                                  onChange={(event) =>
                                    setEditCropStatus(event.target.value)
                                  }
                                >
                                  <option value="planned">Planned</option>
                                  <option value="growing">Growing</option>
                                  <option value="ready">Ready</option>
                                  <option value="harvested">Harvested</option>
                                </select>
                              </label>

                              {/* NEW: Pest input */}
                              <label>
                                Pests (optional)
                                <input
                                  type="text"
                                  value={editCropPests}
                                  onChange={(event) =>
                                    setEditCropPests(event.target.value)
                                  }
                                  placeholder="Example: Aphids, Caterpillars"
                                />
                                <small>
                                  Separate multiple pests with commas.
                                </small>
                              </label>

                              {/* NEW: Disease input */}
                              <label>
                                Diseases (optional)
                                <input
                                  type="text"
                                  value={editCropDiseases}
                                  onChange={(event) =>
                                    setEditCropDiseases(event.target.value)
                                  }
                                  placeholder="Example: Leaf spot, Blight"
                                />
                                <small>
                                  Separate multiple diseases with commas.
                                </small>
                              </label>

                              <label>
                                Notes
                                <textarea
                                  value={editCropNotes}
                                  onChange={(event) =>
                                    setEditCropNotes(event.target.value)
                                  }
                                  rows={3}
                                  placeholder="Enter crop notes"
                                />
                              </label>

                              {editCropError && (
                                <p className="error-message" role="alert">
                                  {editCropError}
                                </p>
                              )}

                              {editCropSuccess && (
                                <p className="success-message">
                                  {editCropSuccess}
                                </p>
                              )}

                              <button
                                type="submit"
                                className="refresh-button"
                                disabled={savingCropChanges}
                              >
                                {savingCropChanges
                                  ? "Saving..."
                                  : "Save Changes"}
                              </button>

                              <button
                                type="button"
                                className="refresh-button"
                                disabled={savingCropChanges}
                                onClick={() => {
                                  setEditingCropId(null);
                                  setEditCropError("");
                                  setEditCropSuccess("");
                                  setEditCropPests("");
                                  setEditCropDiseases("");
                                }}
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                {!cropLoading && !cropError && crops.length > 0 && (
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={() => {
                      const token =
                        sessionStorage.getItem("agripilotToken");
                      if (token) loadCrops(token);
                    }}
                    disabled={cropLoading}
                  >
                    Refresh crops
                  </button>
                )}
              </section>

              {/* Crop Health Alerts */}
              <section className="crop-health-alerts" id="crop-health-alerts">
                <h2>Crop Health Alerts</h2>

                {cropHealthAlerts.length === 0 ? (
                  <p>No crop health issues have been recorded.</p>
                ) : (
                  <div className="crop-alert-list">
                    {cropHealthAlerts.map((alert) => (
                      <article className="crop-alert-card" key={alert.id}>
                        <div className="crop-alert-header">
                          <h3>{alert.cropName}</h3>
                          <span className="crop-alert-label">
                            {alert.issue}
                          </span>
                        </div>

                        <p>
                          <strong>Recorded issue:</strong>{" "}
                          {alert.details.join(", ")}
                        </p>

                        <p className="crop-alert-note">
                          Please inspect this crop and review the recorded issue.
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {/* Recommended Actions */}
              <section
                className="actions-section"
                id="recommended-actions"
              >
                <h2>Recommended Actions</h2>

                <div className="action-filters">
                  <button
                    type="button"
                    className={
                      actionFilter === "all"
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() => setActionFilter("all")}
                  >
                    All ({actions.length})
                  </button>

                  <button
                    type="button"
                    className={
                      actionFilter === "pending"
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() => setActionFilter("pending")}
                  >
                    Pending (
                    {
                      actions.filter(
                        (action) => action.status === "pending"
                      ).length
                    }
                    )
                  </button>

                  <button
                    type="button"
                    className={
                      actionFilter === "completed"
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() => setActionFilter("completed")}
                  >
                    Completed (
                    {
                      actions.filter(
                        (action) => action.status === "completed"
                      ).length
                    }
                    )
                  </button>
                </div>

                {filteredActions.length === 0 ? (
                  <p>
                    {actionFilter === "all"
                      ? "No actions are currently available."
                      : `No ${actionFilter} actions found.`}
                  </p>
                ) : (
                  filteredActions.map((action, index) => {
                    const actionKey =
                      action.observationId ||
                      action.weatherEventId ||
                      action.type;

                    return (
                      <article
                        className="action-card"
                        key={
                          action.completionId ||
                          action.weatherEventId ||
                          action.observationId ||
                          index
                        }
                      >
                        <div className="action-card-header">
                          <div>
                            <span className="action-category">
                              {action.source === "weather"
                                ? "Weather"
                                : action.source === "crop_health"
                                  ? "Crop Health"
                                  : "Farm Recommendation"}
                            </span>

                            <h3>{action.action || "Farm action"}</h3>
                          </div>

                          <span
                            className={`action-status ${
                              action.status || "unknown"
                            }`}
                          >
                            {action.status || "Unknown"}
                          </span>
                        </div>

                        {action.crop && (
                          <p className="action-detail">
                            <strong>Crop:</strong> {action.crop}
                          </p>
                        )}

                        {action.problem && (
                          <p className="action-detail">
                            <strong>Issue:</strong> {action.problem}
                          </p>
                        )}

                        {action.observationStatus && (
                          <p className="action-detail">
                            <strong>Observation status:</strong>{" "}
                            {action.observationStatus.replace(/_/g, " ")}
                          </p>
                        )}

                        {(action.message || action.urgencyReason) && (
                          <p className="action-message">
                            {action.message || action.urgencyReason}
                          </p>
                        )}

                        <div className="action-meta">
                          <span>Priority: {action.priority ?? "N/A"}</span>
                          <span>
                            Urgency: {action.urgency || "Not specified"}
                          </span>
                          {action.severity && (
                            <span>Severity: {action.severity}</span>
                          )}
                        </div>

                        {action.whyThisMatters && (
                          <div className="action-info">
                            <strong>Why this matters</strong>
                            <p>{action.whyThisMatters}</p>
                          </div>
                        )}

                        {action.completionCheck && (
                          <div className="action-info">
                            <strong>What to check</strong>
                            <p>{action.completionCheck}</p>
                          </div>
                        )}

                        {action.outcome && (
                          <div className="action-info">
                            <strong>Recorded outcome</strong>
                            <p>{action.outcome}</p>
                          </div>
                        )}

                        {action.completionNotes && (
                          <div className="action-info">
                            <strong>Completion notes</strong>
                            <p>{action.completionNotes}</p>
                          </div>
                        )}

                        {action.completedAt && (
                          <p className="action-detail">
                            <strong>Completed:</strong>{" "}
                            {new Date(action.completedAt).toLocaleString()}
                          </p>
                        )}

                        {action.status === "pending" && (
                          <button
                            type="button"
                            className="complete-action-button"
                            onClick={() => handleCompleteAction(action)}
                            disabled={completingAction === actionKey}
                          >
                            {completingAction === actionKey
                              ? "Saving..."
                              : "Mark as Completed"}
                          </button>
                        )}
                      </article>
                    );
                  })
                )}

                {actionPlan.disclaimer && (
                  <p className="dashboard-disclaimer">
                    {actionPlan.disclaimer}
                  </p>
                )}
              </section>

              <button
                type="button"
                className="refresh-button"
                onClick={() => {
                  const token =
                    sessionStorage.getItem("agripilotToken");
                  if (token) loadActionPlan(token);
                }}
                disabled={planLoading}
              >
                {planLoading ? "Refreshing..." : "Refresh action plan"}
              </button>

              {/* Action History */}
              <section
                className="actions-section history-section"
                id="action-history"
              >
                <h2>Action History</h2>

                <p className="history-subtitle">
                  Review the actions you have completed on your farm.
                </p>

                {historyLoading ? (
                  <p>Loading action history...</p>
                ) : historyError ? (
                  <p className="error-message">{historyError}</p>
                ) : actionHistory.length === 0 ? (
                  <p>No completed actions recorded yet.</p>
                ) : (
                  actionHistory.map((record, index) => (
                    <article
                      className="action-card history-card"
                      key={record._id || index}
                    >
                      <div className="action-card-header">
                        <div>
                          <span className="action-category">
                            {record.actionType || "Farm action"}
                          </span>

                          <h3>
                            {record.actionDescription || "Completed action"}
                          </h3>
                        </div>

                        <span className="action-status completed">
                          Completed
                        </span>
                      </div>

                      {record.outcome && (
                        <div className="action-info">
                          <strong>Outcome</strong>
                          <p>{record.outcome}</p>
                        </div>
                      )}

                      {record.notes && (
                        <div className="action-info">
                          <strong>Notes</strong>
                          <p>{record.notes}</p>
                        </div>
                      )}

                      {(record.completedAt || record.createdAt) && (
                        <p className="action-detail">
                          <strong>Date:</strong>{" "}
                          {new Date(
                            record.completedAt || record.createdAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </article>
                  ))
                )}

                <button
                  type="button"
                  className="refresh-button"
                  onClick={() => {
                    const token =
                      sessionStorage.getItem("agripilotToken");
                    if (token) loadActionHistory(token);
                  }}
                  disabled={historyLoading}
                >
                  {historyLoading
                    ? "Refreshing history..."
                    : "Refresh history"}
                </button>
              </section>

              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    );
  }

  // Login page
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">AGRIPILOT</p>

        <h1>Welcome to AgriPilot</h1>

        <p className="login-subtitle">
          Sign in to manage your farm and view recommended actions.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;
