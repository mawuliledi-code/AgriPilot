import { useEffect, useState } from "react";
import {
  login,
  getActionPlan,
  completeAction,
  getActionHistory,
  getMyCrops,
  getFarmWeather,
  createCrop,
  updateCrop,
  getCropMonitoring,
} from "./api";
import "./App.css";

const FARM_ID = "6aba6aa5376f67439b22a0cf";

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

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionPlan, setActionPlan] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Dashboard page navigation
const [activeSection, setActiveSection] = useState("overview");

  const [actionHistory, setActionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [completingAction, setCompletingAction] = useState(null);

  // Crop management
  const [crops, setCrops] = useState([]);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState("");

  // Crop monitoring
  const [cropMonitoring, setCropMonitoring] = useState({});
  const [monitoringLoadingId, setMonitoringLoadingId] = useState(null);
  const [monitoringErrors, setMonitoringErrors] = useState({});

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
  async function loadActionPlan(token) {
    setPlanLoading(true);
    setError("");

    try {
      const data = await getActionPlan(FARM_ID, token);
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
  async function loadActionHistory(token) {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const data = await getActionHistory(FARM_ID, token);

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
  async function loadFarmWeather(token) {
    setWeatherLoading(true);
    setWeatherError("");

    try {
      const data = await getFarmWeather(FARM_ID, token);
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
        const data = await getActionPlan(FARM_ID, token);

        if (!active) return;
        setActionPlan(data);

        await Promise.all([
          loadActionHistory(token),
          loadCrops(token),
          loadFarmWeather(token),
        ]);
      } catch (err) {
        if (!active) return;

        sessionStorage.removeItem("agripilotToken");
        setActionPlan(null);
        setError(err.message || "Please log in again.");
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

      // Replace the previous monitoring result with the latest response.
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

      sessionStorage.setItem("agripilotToken", data.token);

      await loadActionPlan(data.token);

      await Promise.all([
        loadActionHistory(data.token),
        loadCrops(data.token),
        loadFarmWeather(data.token),
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
        farm: FARM_ID,
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

    try {
      setSavingCropChanges(true);
      setEditCropError("");
      setEditCropSuccess("");

      await updateCrop(token, cropId, {
        plantingDate: editPlantingDate,
        expectedHarvestDate: editHarvestDate,
        status: editCropStatus,
        notes: editCropNotes.trim(),
      });

      await loadCrops(token);

      // Remove old monitoring data so the user must fetch it again.
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

      await completeAction(FARM_ID, token, completionData);
      await loadActionPlan(token);
      await loadActionHistory(token);
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
    setPassword("");
    setError("");
    setHistoryError("");
    setCropError("");
    setCropFormError("");
    setCropFormSuccess("");
    setShowCropForm(false);
    setEditingCropId(null);
    setEditCropError("");
    setEditCropSuccess("");
  }

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

  if (actionPlan) {
    const actions = actionPlan.actions || [];

    return (
      <main className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon">🌱</span>
            <span>AgriPilot</span>
          </div>

          <p className="sidebar-label">WORKSPACE</p>

          <nav className="sidebar-nav">
            <a href="#overview" className="nav-link active">
              <span>▦</span> Overview
            </a>

            <a href="#crop-management" className="nav-link">
              <span>🌾</span> Crop Management
            </a>

            <a href="#recommended-actions" className="nav-link">
              <span>✓</span> Recommended Actions
            </a>

            <a href="#action-history" className="nav-link">
              <span>↻</span> Action History
            </a>
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-footer-icon">🌾</span>
            <div>
              <strong>Smart farming</strong>
              <p>Better decisions, less waste.</p>
            </div>
          </div>
        </aside>

        <div className="dashboard" id="overview">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">AGRIPILOT</p>
              <h1>Your Farm Dashboard</h1>
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

          <section className="stats-grid">
            <article className="stat-card">
              <span>Total actions</span>
              <strong>{actionPlan.totalActions ?? actions.length}</strong>
            </article>

            <article className="stat-card">
              <span>Pending actions</span>
              <strong>{actionPlan.pendingActions ?? 0}</strong>
            </article>

            <article className="stat-card">
              <span>Completed actions</span>
              <strong>{actionPlan.completedActions ?? 0}</strong>
            </article>
          </section>

          {/* What Needs Attention */}
          <section className="attention-panel">
            <div className="attention-heading">
              <div>
                <p className="eyebrow">FARM PRIORITIES</p>
                <h2>What Needs Attention?</h2>
                <p>Review the next actions recommended for your farm.</p>
              </div>

              <span className="attention-count">
                {actions.filter((action) => action.status === "pending").length}
                {" "}pending
              </span>
            </div>

            {actions.filter((action) => action.status === "pending").length ===
            0 ? (
              <p className="attention-empty">
                All current recommended actions have been completed.
              </p>
            ) : (
              <div className="attention-list">
                {actions
                  .filter((action) => action.status === "pending")
                  .slice(0, 3)
                  .map((action, index) => (
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
                <p className="eyebrow">FARM OVERVIEW</p>
                <h2>Your Crops at a Glance</h2>
                <p>
                  A quick overview of your farm's current crop plan.
                </p>
              </div>

              <span className="farm-location-badge">
                🌍 {actionPlan.farm?.location?.city || "Your farm"}
              </span>
            </div>

            <div className="crop-stats-grid">
              <article className="crop-stat-card">
                <span>Total crops</span>
                <strong>{crops.length}</strong>
                <p>Registered in your farm</p>
              </article>

              <article className="crop-stat-card planned">
                <span>Planned</span>
                <strong>
                  {crops.filter(
                    (crop) => getDashboardCropStatus(crop) === "planned"
                  ).length}
                </strong>
                <p>Awaiting or scheduled for planting</p>
              </article>

              <article className="crop-stat-card growing">
                <span>Growing</span>
                <strong>
                  {crops.filter(
                    (crop) => getDashboardCropStatus(crop) === "growing"
                  ).length}
                </strong>
                <p>Recorded as growing</p>
              </article>

              <article className="crop-stat-card ready">
                <span>Ready for harvest</span>
                <strong>
                  {crops.filter(
                    (crop) => getDashboardCropStatus(crop) === "ready"
                  ).length}
                </strong>
                <p>Marked ready for harvest</p>
              </article>
            </div>
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
              <p className="crop-success-message">{cropFormSuccess}</p>
            )}

            {cropFormError && (
              <p className="crop-error-message">{cropFormError}</p>
            )}

            {showCropForm && (
              <form className="add-crop-form" onSubmit={handleCreateCrop}>
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
                  onChange={(event) => setPlantingDate(event.target.value)}
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
                  onChange={(event) => setNewCropStatus(event.target.value)}
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
                    const token = sessionStorage.getItem("agripilotToken");
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
                          {new Date(crop.plantingDate).toLocaleDateString()}
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
                          !crop._id || monitoringLoadingId === crop._id
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
                          <h4>Crop Monitoring</h4>

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
                              aria-valuenow={monitoring.progressPercentage}
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
                            {(monitoring.harvestTiming || "unknown").replace(
                              /_/g,
                              " "
                            )}
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
                                          recommendation.priority || "normal"
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
                            Calendar-based estimates only. Inspect the actual
                            crop before deciding whether it is ready for
                            harvest.
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
                  const token = sessionStorage.getItem("agripilotToken");
                  if (token) loadCrops(token);
                }}
                disabled={cropLoading}
              >
                Refresh crops
              </button>
            )}
          </section>

          {/* Recommended Actions */}
          <section className="actions-section" id="recommended-actions">
            <h2>Recommended Actions</h2>

            {actions.length === 0 ? (
              <p>No actions are currently available.</p>
            ) : (
              actions.map((action, index) => {
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
              const token = sessionStorage.getItem("agripilotToken");
              if (token) loadActionPlan(token);
            }}
            disabled={planLoading}
          >
            {planLoading ? "Refreshing..." : "Refresh action plan"}
          </button>

          {/* Farm Weather Dashboard */}
          <section
            className="actions-section weather-section"
            id="farm-weather"
          >
            <h2>Farm Weather</h2>
            <p className="history-subtitle">
              Live weather conditions and the 7-day forecast for your farm.
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
                    Wind: {farmWeather.weather.current.wind_speed_10m} km/h
                  </p>
                  <p>
                    Rainfall: {farmWeather.weather.current.precipitation} mm
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
                        {farmWeather.weather.daily.temperature_2m_max[index]}°C
                        /
                        {" "}
                        {farmWeather.weather.daily.temperature_2m_min[index]}°C
                      </p>

                      <p>
                        Rain:{" "}
                        {farmWeather.weather.daily.precipitation_sum[index]} mm
                      </p>

                      <p>
                        Rain chance:{" "}
                        {
                          farmWeather.weather.daily
                            .precipitation_probability_max[index]
                        }
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
                const token = sessionStorage.getItem("agripilotToken");
                if (token) loadActionHistory(token);
              }}
              disabled={historyLoading}
            >
              {historyLoading ? "Refreshing history..." : "Refresh history"}
            </button>
          </section>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

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
