
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

// Prevent duplicate simultaneous weather requests.
const pendingWeatherRequests = new Map();

// ===== Shared Response Handling =====

async function readResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        `${fallbackMessage} (HTTP ${response.status}).`
    );
  }

  return data;
}

// ===== Authentication =====

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await readResponse(response, "Login failed");

  if (!data.token) {
    throw new Error("Login response did not contain a token.");
  }

  return data;
}


// ===== Farm Management =====

// Get all farms belonging to the logged-in farmer.
export async function getMyFarms(token) {
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}/farms/my-farms`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  return readResponse(response, "Could not load your farms");
}

// ===== Action Planner =====

export async function getActionPlan(farmId, token) {
  if (!farmId || !token) {
    throw new Error("A valid farm ID and login session are required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/action-planner/${encodeURIComponent(farmId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return readResponse(response, "Could not load action plan");
}

// ===== Action Completion =====

export async function completeAction(farmId, token, completionData) {
  if (!farmId || !token) {
    throw new Error("A valid farm ID and login session are required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/action-completions/${encodeURIComponent(farmId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(completionData),
    }
  );

  return readResponse(response, "Could not record action completion");
}

// ===== Action History =====

export async function getActionHistory(farmId, token) {
  if (!farmId || !token) {
    throw new Error("A valid farm ID and login session are required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/action-completions/${encodeURIComponent(farmId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  return readResponse(response, "Could not load action history");
}

// ===== Crop Management =====

// Get all crops belonging to the logged-in farmer.
export async function getMyCrops(token) {
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}/crops/my-crops`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  return readResponse(response, "Could not load your crops");
}


export function getFarmWeather(farmId, token) {
  if (!token) {
    return Promise.reject(
      new Error("Your session has expired. Please log in again.")
    );
  }

  if (!farmId) {
    return Promise.reject(
      new Error("Farm ID is required to load weather.")
    );
  }

  // Give each farm and login session its own request key.
  const requestKey = `${farmId}:${token}`;

  // Reuse an existing request if one is already running.
  if (pendingWeatherRequests.has(requestKey)) {
    console.log("Weather request already running. Reusing it.");
    return pendingWeatherRequests.get(requestKey);
  }

  const request = (async () => {
    const response = await fetch(
      `${API_BASE_URL}/weather/${encodeURIComponent(farmId)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    return readResponse(response, "Could not load farm weather");
  })();

  pendingWeatherRequests.set(requestKey, request);

  // Remove the request after it succeeds or fails.
  request.finally(() => {
    if (pendingWeatherRequests.get(requestKey) === request) {
      pendingWeatherRequests.delete(requestKey);
    }
  }).catch(() => {});

  return request;
}

// Register a new crop.
export async function createCrop(token, cropData) {
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}/crops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(cropData),
  });

  return readResponse(response, "Could not create crop");
}

// Update an existing crop.
export async function updateCrop(token, cropId, cropData) {
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!cropId) {
    throw new Error("A valid crop ID is required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/crops/${encodeURIComponent(cropId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(cropData),
    }
  );

  return readResponse(response, "Could not update crop");
}

// Delete an existing crop.
export async function deleteCrop(token, cropId) {
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!cropId) {
    throw new Error("A valid crop ID is required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/crops/${encodeURIComponent(cropId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (response.status === 204) {
    return null;
  }

  return readResponse(response, "Could not delete crop");
}

// ===== Crop Monitoring =====

// Get fresh monitoring information for one crop.
export async function getCropMonitoring(token, cropId) {
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!cropId) {
    throw new Error("A valid crop ID is required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/crops/${encodeURIComponent(cropId)}/monitoring`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }
  );

  const data = await readResponse(
    response,
    "Could not load crop monitoring"
  );

  if (!data || !data.monitoring) {
    throw new Error(
      "The server response did not contain monitoring data."
    );
  }

  return data;
}
