const firebaseConfig = {
  apiKey: "AIzaSyAA3yL45ceKruilF3LVJm6RSQn0pI4s63c",
  authDomain: "greenhouse-33a35.firebaseapp.com",
  databaseURL: "https://greenhouse-33a35-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "greenhouse-33a35",
  storageBucket: "greenhouse-33a35.firebasestorage.app",
  messagingSenderId: "690010851620",
  appId: "1:690010851620:web:48c1b82ad59e32cb08cbb1",
  measurementId: "G-R5JWTL976E"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const auth = firebase.auth();

// 2. GET THE HTML ELEMENTS
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const errorMsg = document.getElementById('error-msg');

// 3. WATCH FOR LOGIN CHANGES (Hides/Shows the dashboard)
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is logged in: Hide login, show dashboard
    loginScreen.classList.add('hidden');
    appContent.classList.remove('hidden');
  } else {
    // User is logged out: Show login, hide dashboard
    //loginScreen.classList.remove('hidden');
    //appContent.classList.add('hidden');
  }
});

// 4. LOGIN BUTTON LOGIC
loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  errorMsg.innerText = ""; // Clear old errors

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Logged in successfully!");
    })
    .catch((error) => {
      errorMsg.innerText = "Wrong email or password. Try again."; 
    });
});

// 5. LOGOUT BUTTON LOGIC
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      console.log("Logged out successfully!");
      emailInput.value = "";
      passwordInput.value = "";
      window.location.reload(); // Refresh the page to reset everything
    }).catch((error) => {
      console.error("Logout error:", error);
    });
  });
}

//DATABASE REFERENCES
const tempRef = database.ref("sensors/temperature");
const humidityRef = database.ref("sensors/humidity");
const lightRef = database.ref("sensors/light");
const soil1Ref = database.ref("sensors/soil1");
const soil2Ref = database.ref("sensors/soil2");
const soil3Ref = database.ref("sensors/soil3");
const nitrogenRef = database.ref("sensors/nitrogen");
const phosphorusRef = database.ref("sensors/phosphorus");
const potassiumRef = database.ref("sensors/potassium");



// CONTROLS COMMAND REFERENCES
const fanCmdRef = database.ref("commands/vent_fan/enabled");
const pumpCmdRef = database.ref("commands/water_pump/enabled");
const lightCmdRef = database.ref("commands/grow_light/enabled");
const mistCmdRef = database.ref("commands/mist_maker/enabled");
const modeRef = database.ref("mode");

// SOLENOID ZONE REFERENCES
const solenoidZone1Ref = database.ref("commands/solenoid/zone1");
const solenoidZone2Ref = database.ref("commands/solenoid/zone2");
const solenoidZone3Ref = database.ref("commands/solenoid/zone3");

// CONFIG DRAFT REFERENCES
const selectedCropRef = database.ref("/selected_crop");
const presetsRef = database.ref("/crop_presets");
const configRef = database.ref("/config");
const configDraftRef = database.ref("/config_draft");
const growRef = database.ref("/grow");

// Grab the HTML elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

let lastHeartbeat = 0;
let isSyncing = { pump: false, fan: false, light: false, mist: false };

// Grab the HTML element from your new sensor card
const nextWateringDisplay = document.getElementById('next-watering-display');

// Listen to the watering schedule in Firebase
const scheduleRef = firebase.database().ref('/config/watering/times');

scheduleRef.on('value', (snapshot) => {
  const times = snapshot.val();
  
  // If there is no schedule in Firebase yet
  if (!times || times.length === 0) {
    nextWateringDisplay.textContent = "No schedule set";
    return;
  }

  // Clean up the data and sort it from morning to night
  let validTimes = times.filter(t => t != null);
  validTimes.sort((a, b) => {
    if (a.hour === b.hour) return a.min - b.min;
    return a.hour - b.hour;
  });

  // Get the current time right now
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  let nextTime = null;

  // Search for the next scheduled time TODAY
  for (let i = 0; i < validTimes.length; i++) {
    const { hour, min } = validTimes[i];
    
    // If the scheduled time is later than right now
    if (hour > currentHour || (hour === currentHour && min > currentMin)) {
      nextTime = { hour, min, day: "Today" };
      break; 
    }
  }

  // If no times are left today, the next watering is the FIRST time TOMORROW
  if (!nextTime && validTimes.length > 0) {
    nextTime = { hour: validTimes[0].hour, min: validTimes[0].min, day: "Tomorrow" };
  }

  // Fetch today's watering log to show status per schedule
  const todayKeyWL = new Date().getFullYear() + '-' +
    String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
    String(new Date().getDate()).padStart(2, '0');
  firebase.database().ref('tracking/daily/' + todayKeyWL + '/watering_log').once('value', logSnap => {
    const wateringLog = logSnap.val() || {};
    let rowsHTML = '';
    validTimes.forEach(t => {
      let h = t.hour;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const m = String(t.min).padStart(2, '0');
      const label = h + ':' + m + ' ' + ampm;
      const logKey = String(t.hour).padStart(2,'0') + ':' + String(t.min).padStart(2,'0');
      const logStatus = wateringLog[logKey];
      let statusBadge = '';
      if (logStatus === 'Watered') {
        statusBadge = '<span style="color:#3498db;font-weight:bold;margin-left:8px;">💧 Watered</span>';
      } else if (logStatus === 'Skipped') {
        statusBadge = '<span style="color:#e74c3c;font-weight:bold;margin-left:8px;">⏭️ Skipped</span>';
      } else if (logStatus === 'Manual') {
        statusBadge = '<span style="color:#f39c12;font-weight:bold;margin-left:8px;">👋 Manual</span>';
      } else {
        statusBadge = '<span style="color:#aaa;margin-left:8px;">⏳ Pending</span>';
      }
      rowsHTML += '<div style="padding:6px 0;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;">'
        + '<span style="font-weight:600;min-width:90px;">' + label + '</span>'
        + statusBadge + '</div>';
    });
    nextWateringDisplay.innerHTML = rowsHTML || 'No schedule set';
  });
});

//HELPER FUNCTIONS
function safeNumber(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

// HELPER: Update card color based on value limits
function updateHealthStatus(elementId, value, minHealth, maxHealth) {
  const card = document.getElementById(elementId);
  if (!card) return;

  // Clear existing status
  card.classList.remove('status-good', 'status-warning', 'status-danger');

  if (value < minHealth || value > maxHealth) {
    card.classList.add('status-danger'); // Critical: Too cold/hot or too dry/wet
  } else if (value < (minHealth + 3) || value > (maxHealth - 3)) {
    card.classList.add('status-warning'); // Warning: Getting close to the edge
  } else {
    card.classList.add('status-good'); // Healthy
  }
}

// ====================//
//   NAVIGATION & UI   //
// ====================//
document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab all the navigation links and pages
  const navItems = document.querySelectorAll(".nav-item");
  const pages = {
    dashboardPage: document.getElementById("dashboardPage"),
    controlsPage: document.getElementById("controlsPage"),
    setupPage: document.getElementById("setupPage"),
    trackingPage: document.getElementById("trackingPage")
  };
  // 2. The function that switches the pages
  function showPage(targetKey) {
    // Hide all pages first
    Object.values(pages).forEach(page => {
      if (page) page.classList.add("hidden");
    });
    
    // Unhide the page we want
    if (pages[targetKey]) {
      pages[targetKey].classList.remove("hidden");
    }

    // Move the green "active" highlight on the menu
    navItems.forEach(item => {
      item.classList.remove("active");
      if (item.dataset.target === targetKey) {
        item.classList.add("active");
      }
    });
  }

  // 3. Listen for clicks on the top navigation tabs
  navItems.forEach(item => {
    item.addEventListener("click", (event) => {
      event.preventDefault(); // Stops the page from reloading
      showPage(item.dataset.target); // Runs the function above
    });
  });

  // 4. Make the "Quick Setup" button on the Dashboard work
  const cropButton = document.getElementById("cropButton");
  if (cropButton) {
    cropButton.addEventListener("click", () => {
      showPage("setupPage");
    });
  }
  //====================== //
  // SENSOR DATA UPDATES   //
  // ======================//

  // Temperature
  tempRef.on("value", snap => {
    lastHeartbeat = Date.now();
    const val = safeNumber(snap.val());
    const el = document.getElementById("tempDisplay");
    if (el) el.innerText = val.toFixed(1) + " \xb0C";
    updateHealthStatus("climateCard", val, 18, 32);
    
  });

  // Humidity
  humidityRef.on("value", snap => {
    lastHeartbeat = Date.now();
    const el = document.getElementById("humidityDisplay");
    if (el) el.innerText = safeNumber(snap.val()).toFixed(1) + " %";
  });


  const cropOptimalRanges = {
    tomato:  { tempMin: 21, tempMax: 24, humidMin: 65, humidMax: 85, soilMin: 60, soilMax: 80 },
    lettuce: { tempMin: 15, tempMax: 25, humidMin: 60, humidMax: 80, soilMin: 60, soilMax: 80 },
    spinach: { tempMin: 25, tempMax: 30, humidMin: 70, humidMax: 90, soilMin: 75, soilMax: 100 } // kangkong
};

// 2. The health function
function refreshZoneHealth(cardId, value, cropKey) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const ranges = cropOptimalRanges[cropKey];
  
  // If no range found, just keep it neutral
  if (!ranges) {
    card.classList.remove('status-good', 'status-warning', 'status-danger');
    return;
  }

  card.classList.remove('status-good', 'status-warning', 'status-danger');

  // Soil logic based on the specific crop's soilMin
  if (value < (ranges.soilMin - 10)) {
    card.classList.add('status-danger');   // Red
  } else if (value < ranges.soilMin) {
    card.classList.add('status-warning');  // Yellow
  } else {
    card.classList.add('status-good');     // Green
  }
}

// 2. UPDATED: Soil Listeners passing specific crop keys
// Zone 1: Kangkong (Key: 'spinach')
soil1Ref.on("value", snap => {
  lastHeartbeat = Date.now();
  const val = Math.round(safeNumber(snap.val()));
  const el = document.getElementById("soilDisplay1");
  if (el) el.innerText = val + " %";
  refreshZoneHealth("soilCard1", val, "spinach"); 
});

// Zone 2: Lettuce (Key: 'lettuce')
soil2Ref.on("value", snap => {
  lastHeartbeat = Date.now();
  const val = Math.round(safeNumber(snap.val()));
  const el = document.getElementById("soilDisplay2");
  if (el) el.innerText = val + " %";
  refreshZoneHealth("soilCard2", val, "lettuce");
});

// Zone 3: Tomato (Key: 'tomato')
soil3Ref.on("value", snap => {
  lastHeartbeat = Date.now();
  const val = Math.round(safeNumber(snap.val()));
  const el = document.getElementById("soilDisplay3");
  if (el) el.innerText = val + " %";
  refreshZoneHealth("soilCard3", val, "tomato");
});

  // Light
  lightRef.on("value", snap => {
    lastHeartbeat = Date.now();
    const el = document.getElementById("lightDisplay");
    const badge = document.getElementById("lightCategoryBadge");
    const luxValue = Math.round(safeNumber(snap.val()));

    if (el) el.innerText = luxValue.toLocaleString() + " Lux";

    // Update live category badge
    if (badge) {
      let label, bg, color;
      if (luxValue <= 100) {
        label = "🌑 Dark";          bg = "#2d3436"; color = "#ffffff";
      } else if (luxValue <= 2000) {
        label = "🌥️ Low Light";    bg = "#dfe6e9"; color = "#636e72";
      } else if (luxValue <= 10000) {
        label = "⛅ Medium Light";  bg = "#ffeaa7"; color = "#856404";
      } else {
        label = "☀️ High Light";   bg = "#fdcb6e"; color = "#7d4e00";
      }
      badge.textContent = label;
      badge.style.background = bg;
      badge.style.color = color;
    }
  });
  // Nitrogen
    nitrogenRef.on("value", snap => {
    const el = document.getElementById("nitrogenDisplay");
    if (el) el.innerText = Math.round(safeNumber(snap.val())) + " mg/kg";
    });
  // Phosphorus
    phosphorusRef.on("value", snap => {
    const el = document.getElementById("phosphorusDisplay");
    if (el) el.innerText = Math.round(safeNumber(snap.val())) + " mg/kg";
    });
  // Potassium
    potassiumRef.on("value", snap => {
    const el = document.getElementById("potassiumDisplay");
    if (el) el.innerText = Math.round(safeNumber(snap.val())) + " mg/kg";
    });  

  // Helper: Format NPK ideal range display based on crop
  function updateNPKIdealRanges(crop) {
    const npkData = cropNPKRanges[crop];
    if (!npkData) {
      document.getElementById("nitrogenIdeal").innerHTML = "";
      document.getElementById("phosphorusIdeal").innerHTML = "";
      document.getElementById("potassiumIdeal").innerHTML = "";
      return;
    }

    // NITROGEN
    let nText = "";
    if (crop === "tomato") {
      nText = `<strong>Ideal:</strong> 🌱 Veg ${npkData.nitrogen.veg} mg/kg | 🍅 Fruit ${npkData.nitrogen.fruit} mg/kg`;
    } else {
      nText = `<strong>Ideal:</strong> ${npkData.nitrogen.min}–${npkData.nitrogen.max} mg/kg`;
      if (npkData.nitrogen.note) nText += ` (${npkData.nitrogen.note})`;
    }
    const nEl = document.getElementById("nitrogenIdeal");
    if (nEl) nEl.innerHTML = nText;

    // PHOSPHORUS
    let pText = "";
    if (crop === "tomato") {
      const vegP = npkData.phosphorus.veg;
      const fruitP = npkData.phosphorus.fruit;
      const fruitPRange = typeof fruitP === "object" ? `${fruitP.min}–${fruitP.max}` : fruitP;
      pText = `<strong>Ideal:</strong> 🌱 Veg ${vegP} mg/kg | 🍅 Fruit ${fruitPRange} mg/kg`;
    } else {
      pText = `<strong>Ideal:</strong> ${npkData.phosphorus.min}–${npkData.phosphorus.max} mg/kg`;
    }
    const pEl = document.getElementById("phosphorusIdeal");
    if (pEl) pEl.innerHTML = pText;

    // POTASSIUM
    let kText = "";
    if (crop === "tomato") {
      const vegK = npkData.potassium.veg;
      const fruitK = npkData.potassium.fruit;
      const fruitKRange = typeof fruitK === "object" ? `${fruitK.min}–${fruitK.max}` : fruitK;
      kText = `<strong>Ideal:</strong> 🌱 Veg ${vegK} mg/kg | 🍅 Fruit ${fruitKRange} mg/kg`;
    } else {
      kText = `<strong>Ideal:</strong> ${npkData.potassium.min}–${npkData.potassium.max} mg/kg`;
      if (npkData.potassium.note) kText += ` (${npkData.potassium.note})`;
    }
    const kEl = document.getElementById("potassiumIdeal");
    if (kEl) kEl.innerHTML = kText;
  }

// ==========================================
  //      DASHBOARD GROW STATUS & NPK SYNC
  // ==========================================
  growRef.on("value", async (snap) => {
    const growData = snap.val();
    
    // 1. SELECTORS FOR NPK (Needed for both cases)
    const nIdeal = document.getElementById("nitrogenIdeal");
    const pIdeal = document.getElementById("phosphorusIdeal");
    const kIdeal = document.getElementById("potassiumIdeal");

    if (growData && growData.active) {
      // --- CASE A: SYSTEM IS GROWING ---
      
      // Get the crop name
      const cropSnap = await selectedCropRef.get();
      const cropName = cropSnap.val() || "Unknown Crop";
      
      // Update Title and Progress Row
      if (activeCropTitle) activeCropTitle.textContent = "Currently Growing: " + cropName.toUpperCase();
      if (progressCrop) progressCrop.textContent = cropName.toUpperCase();

      // Update NPK Ideal Ranges
      updateNPKIdealRanges(cropName);

      // Change button to Red "View Setup"
      if (cropButton) {
        cropButton.textContent = "View Setup";
        cropButton.style.backgroundColor = "var(--danger)"; 
        cropButton.style.color = "white";
        cropButton.style.borderColor = "var(--danger)";
      }

      // Calculate Progress Bar
      const startMs = growData.start_ts || Date.now();
      const durationDays = growData.duration_days || 30;
      const elapsedMs = Math.max(0, Date.now() - startMs);
      const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
      const percent = Math.min(Math.round((elapsedDays / durationDays) * 100), 100);
      
      if (progressDay) progressDay.textContent = `Day ${elapsedDays} of ${durationDays}`;
      if (growProgressBar) growProgressBar.style.width = percent + "%";

    } else {
      // --- CASE B: SYSTEM IS STOPPED ---
      
      // Reset Titles and Progress
      if (activeCropTitle) activeCropTitle.textContent = "No Active Crop";
      if (progressCrop) progressCrop.textContent = "-";
      if (progressDay) progressDay.textContent = "-";
      if (growProgressBar) growProgressBar.style.width = "0%";

      // Clear NPK Ideal Ranges
      if (nIdeal) nIdeal.innerHTML = "";
      if (pIdeal) pIdeal.innerHTML = "";
      if (kIdeal) kIdeal.innerHTML = "";

      // Reset button back to original "Quick Setup" style
      if (cropButton) {
        cropButton.textContent = "Quick Setup";
        cropButton.style.backgroundColor = ""; 
        cropButton.style.color = "";           
        cropButton.style.borderColor = "";     
      }
    }
  });


    

// ===================================//
  //           MANUAL CONTROLS          //
  // ===================================//
  
  // 1. Get UI Elements
  const btnAuto = document.getElementById("btn-mode-auto");
  const btnManual = document.getElementById("btn-mode-manual");
  const manualControlsSection = document.getElementById("manual-controls-section");

  const fanBtn = document.getElementById("fanBtn");
  const pumpBtn = document.getElementById("pumpBtn");
  const lightBtn = document.getElementById("lightBtn");
  const mistBtn = document.getElementById("mistBtn");

  // Zone checkboxes
  const zoneCheck1 = document.getElementById("zoneCheck1");
  const zoneCheck2 = document.getElementById("zoneCheck2");
  const zoneCheck3 = document.getElementById("zoneCheck3");

  let currentMode = "manual"; // Default mode
  let fanState = false;
  let pumpState = false;
  let lightState = false;
  let mistState = false;

    // --- 2. MODE SWITCH LOGIC ---
    // Listen for clicks on the new buttons
    if (btnAuto) {
      btnAuto.addEventListener("click", () => {
        modeRef.set("auto");
        // Turn off manual actuators when switching to auto to be safe
        if (fanCmdRef) fanCmdRef.set(false);
        if (pumpCmdRef) pumpCmdRef.set(false);
        if (lightCmdRef) lightCmdRef.set(false);
        if (mistCmdRef) mistCmdRef.set(false);
        if (solenoidZone1Ref) solenoidZone1Ref.set(false);
        if (solenoidZone2Ref) solenoidZone2Ref.set(false);
        if (solenoidZone3Ref) solenoidZone3Ref.set(false);
      });
    }

    if (btnManual) {
      btnManual.addEventListener("click", () => {
        modeRef.set("manual");
      });
    }

    // Sync UI when Firebase mode changes
    modeRef.on("value", snap => {
      currentMode = snap.val() === "auto" ? "auto" : "manual";
      
      if (currentMode === "auto") {
        // Highlight AUTO button Green
        if (btnAuto) {
          btnAuto.style.backgroundColor = "#2ecc71";
          btnAuto.style.color = "white";
          btnAuto.style.borderColor = "#27ae60";
        }
        if (btnManual) {
          btnManual.style.backgroundColor = "#f8f9fa";
          btnManual.style.color = "#333";
          btnManual.style.borderColor = "#ccc";
        }
        // Dim and lock manual controls
        if (manualControlsSection) {
          manualControlsSection.style.opacity = "0.4";
          manualControlsSection.style.pointerEvents = "none";
        }
      } else {
        // Highlight MANUAL button Orange
        if (btnAuto) {
          btnAuto.style.backgroundColor = "#f8f9fa";
          btnAuto.style.color = "#333";
          btnAuto.style.borderColor = "#ccc";
        }
        if (btnManual) {
          btnManual.style.backgroundColor = "#f39c12"; 
          btnManual.style.color = "white";
          btnManual.style.borderColor = "#e67e22";
        }
        // Wake up manual controls
        if (manualControlsSection) {
          manualControlsSection.style.opacity = "1";
          manualControlsSection.style.pointerEvents = "auto";
        }
      }
    });

    // --- 3. ACTUATOR UI & CLICKS ---
    // Helper to change button text and color
    function updateBtnUI(btn, label, state) {
      if (!btn) return;

      btn.textContent = `${label}: ${state ? "ON" : "OFF"}`;
      if (state) {
        btn.classList.add("on");
        btn.classList.remove("off", "syncing");
      } else {
        btn.classList.add("off");
        btn.classList.remove("on");
      }
    }

    // Update button states based on database values
    fanCmdRef.on("value", snap => {
      fanState = !!snap.val();
      updateBtnUI(fanBtn, "Vent Fan", fanState);
    });
    pumpCmdRef.on("value", snap => {
      pumpState = !!snap.val();
      updateBtnUI(pumpBtn, "Water Pump", pumpState);
    });
    lightCmdRef.on("value", snap => {
      lightState = !!snap.val();
      updateBtnUI(lightBtn, "Grow Light", lightState);
    });
    mistCmdRef.on("value", snap => {
      mistState = !!snap.val();
      updateBtnUI(mistBtn, "Mist Maker", mistState);
    });

    // Send commands to Firebase when buttons are clicked
    if (fanBtn) {
      fanBtn.addEventListener("click", () => {
        if (currentMode === "manual") fanCmdRef.set(!fanState);
      });
    }
    if (pumpBtn) {
      pumpBtn.addEventListener("click", () => {
        if (currentMode === "manual") {
          const turningOn = !pumpState;
          // Write zone selections to Firebase before turning pump on
          if (turningOn) {
            solenoidZone1Ref.set(zoneCheck1 ? zoneCheck1.checked : true);
            solenoidZone2Ref.set(zoneCheck2 ? zoneCheck2.checked : true);
            solenoidZone3Ref.set(zoneCheck3 ? zoneCheck3.checked : true);
          } else {
            // Close all valves when turning off
            solenoidZone1Ref.set(false);
            solenoidZone2Ref.set(false);
            solenoidZone3Ref.set(false);
          }
          pumpCmdRef.set(turningOn);
        }
      });
    }
    if (lightBtn) {
      lightBtn.addEventListener("click", () => {
        if (currentMode === "manual") lightCmdRef.set(!lightState);
      });
    }
    if (mistBtn) {
      mistBtn.addEventListener("click", () => {
        if (currentMode === "manual") mistCmdRef.set(!mistState);
      });
    }

    // ==========================================
  //       LIVE ACTUATOR STATUS LISTENERS
  // ==========================================
  const statusFan = document.getElementById("statusFan");
  const statusPump = document.getElementById("statusPump");
  const statusLight = document.getElementById("statusLight");

  // Create references to the TRUE hardware states
  const fanStateRef = database.ref("sensors/fan_state");
  const pumpStateRef = database.ref("sensors/pump_state");
  const lightStateRef = database.ref("sensors/light_state");
  const mistStateRef = database.ref("sensors/mist_state");
  const solenoid1StateRef = database.ref("sensors/solenoid1");
  const solenoid2StateRef = database.ref("sensors/solenoid2");
  const solenoid3StateRef = database.ref("sensors/solenoid3");

  // Helper function to update the little text below the buttons
  function updateSubStatus(element, isOn) {
    if (!element) return;
    if (isOn) {
      element.innerHTML = "Live: 🟢 ON";
      element.style.color = "#2ecc71";
      element.style.fontWeight = "bold";
    } else {
      element.innerHTML = "Live: 🔴 OFF";
      element.style.color = "#888";
      element.style.fontWeight = "normal";
    }
  }

  // Helper for small solenoid status badges
  function updateSolenoidBadge(elementId, isOn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = isOn ? "🟢 ON" : "🔴 OFF";
    el.style.color = isOn ? "#2ecc71" : "#888";
    el.style.fontWeight = isOn ? "bold" : "normal";
  }

  // Listen to Firebase and update instantly
  fanStateRef.on("value", snap => updateSubStatus(statusFan, snap.val()));
  pumpStateRef.on("value", snap => updateSubStatus(statusPump, snap.val()));
  lightStateRef.on("value", snap => updateSubStatus(statusLight, snap.val()));
  mistStateRef.on("value", snap => updateSubStatus(document.getElementById("statusMist"), snap.val()));
  solenoid1StateRef.on("value", snap => updateSolenoidBadge("statusSolenoid1", snap.val()));
  solenoid2StateRef.on("value", snap => updateSolenoidBadge("statusSolenoid2", snap.val()));
  solenoid3StateRef.on("value", snap => updateSolenoidBadge("statusSolenoid3", snap.val()));
    // SETUP PAGE - QUICK PRESET SELECTION
    const cropSelect = document.getElementById("cropSelect");
    const applyCropBtn = document.getElementById("applyCropBtn");
    const cropLoadedHint = document.getElementById("cropLoadedHint");

    // 1. Listen to Firebase: Keep the dropdown synced with the database
    selectedCropRef.on("value", snap => {
        const crop = snap.val();
        // If Firebase has a crop saved, make the dropdown match it
        if (cropSelect && typeof crop === "string") {
        cropSelect.value = crop;
        }
    });

    // 2. When the user clicks "Apply Preset", save their choice to Firebase
    if (applyCropBtn && cropSelect) {
        applyCropBtn.addEventListener("click", async() => {
        const cropName = cropSelect.value;

        // Stop if no crop is selected
        if (cropName === "none") {
            if (cropLoadedHint) cropLoadedHint.textContent = "Please select a crop first.";
            return;
        }

        try {
            // which crop selected
            await selectedCropRef.set(cropName);

            // get default config for that crop
            const snap = await presetsRef.child(cropName).get();
            if (snap.exists()) {
                const preset = snap.val();
                await configDraftRef.set(preset);
                if (cropLoadedHint) {
                    cropLoadedHint.textContent = `${cropName.toUpperCase()} defaults loaded ✔`;
                    cropLoadedHint.style.color = "var(--primary-green)";
                }
            } else {
                if (cropLoadedHint) {
                    cropLoadedHint.textContent = `No presets found for ${cropName}`;
                    cropLoadedHint.style.color = "var(--error-red)";
                }
            }
        } catch (error) {
            console.error("Error loading crop preset:", error);
    }
    });

    
  // ==========================================
  //      WATERING SCHEDULE UI LOGIC
  // ==========================================
  const wateringTimesList = document.getElementById("wateringTimesList");
  const addWaterTimeBtn = document.getElementById("addWaterTimeBtn");
  let currentSchedule = []; // This will hold objects like { hour: 6, min: 0 }

  // Translator 1: Object to String (For the HTML input box)
  function toTimeString(t) {
    if (!t) return "00:00";
    const h = String(t.hour || 0).padStart(2, '0');
    const m = String(t.min || 0).padStart(2, '0');
    return `${h}:${m}`;
  }

  // Translator 2: String to Object (For saving back to Firebase)
  function fromTimeString(str) {
    if (!str) return { hour: 0, min: 0 };
    const parts = str.split(":");
    return { hour: Number(parts[0]), min: Number(parts[1]) };
  }

  // Function to draw the time boxes on the screen
  function renderSchedule() {
    if (!wateringTimesList) return;
    wateringTimesList.innerHTML = ""; // Clear the list first
    
    // Sort times so they stay in chronological order
    currentSchedule.sort((a, b) => (a.hour * 60 + a.min) - (b.hour * 60 + b.min));

    currentSchedule.forEach((t, index) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "10px";
      row.style.marginBottom = "8px";

      // Create the Time input
      const timeInput = document.createElement("input");
      timeInput.type = "time";
      timeInput.className = "styled-input";
      timeInput.style.margin = "0";
      timeInput.value = toTimeString(t); // Use translator here!
      
      // Update the list when user changes the time
      timeInput.addEventListener("change", (e) => {
        currentSchedule[index] = fromTimeString(e.target.value); // Use translator here!
        renderSchedule(); // Re-sort and redraw
      });

      // Create the Remove (X) button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.className = "danger-btn";
      removeBtn.style.width = "auto";
      removeBtn.style.padding = "0 15px";
      
      // Delete the time slot if X is clicked
      removeBtn.addEventListener("click", () => {
        currentSchedule.splice(index, 1);
        renderSchedule();
      });

      row.appendChild(timeInput);
      row.appendChild(removeBtn);
      wateringTimesList.appendChild(row);
    });
  }

  // Add a new time slot when the "+ Add time" button is clicked
  if (addWaterTimeBtn) {
    addWaterTimeBtn.addEventListener("click", () => {
      let next = { hour: 6, min: 0 };
      
      // Make the new time 1 hour after the last one
      if (currentSchedule.length > 0) {
        const last = currentSchedule[currentSchedule.length - 1];
        next = { hour: Math.min(last.hour + 1, 23), min: last.min };
      }
      
      currentSchedule.push(next);
      renderSchedule();
    });
  }

  // ==========================================
    //      SYNC FIREBASE TO INPUT BOXES
    // ==========================================

    configDraftRef.on("value", snap => {
    const data = snap.val();
    if (!data) return; // Stop if there is no data

    // 1. Fan Settings
    if (data.fan) {
      const tempBox = document.getElementById("draftTargetTemp");
      const hysBox = document.getElementById("draftFanHys");
      const humBox = document.getElementById("draftHumidityTh");
      const humHysBox = document.getElementById("draftHumidityHys");
      
      if (tempBox) tempBox.value = data.fan.target_temp ?? "";
      if (hysBox) hysBox.value = data.fan.hysteresis ?? "";
      if (humBox) humBox.value = data.fan.target_humidity ?? "";
      if (humHysBox) humHysBox.value = data.fan.humidity_hysteresis ?? "";
    }

    // 2. Light Settings
    if (data.grow_light) {
      const lightThBox = document.getElementById("draftLightTh");
      const hoursBox = document.getElementById("draftLightHours");
      
      if (lightThBox) lightThBox.value = data.grow_light.light_threshold ?? "";
      if (hoursBox) hoursBox.value = data.grow_light.required_hours ?? "";
    }

    // 3. Watering Settings
    // 3. Watering Settings
    if (data.watering) {
      const waterThBox = document.getElementById("draftWaterTh");
      const pumpSecBox = document.getElementById("draftPumpSec");
      
      if (waterThBox) waterThBox.value = data.watering.target_soil_moisture ?? "";
      if (pumpSecBox) pumpSecBox.value = data.watering.duration_sec ?? "";

      // Firebase Quirk Fix: Force the schedule to always be an Array
      let rawSchedule = data.watering.times;
      if (!rawSchedule) {
        currentSchedule = [];
      } else if (Array.isArray(rawSchedule)) {
        currentSchedule = rawSchedule; // It is already a normal array
      } else if (typeof rawSchedule === "object") {
        currentSchedule = Object.values(rawSchedule); // Convert Firebase object to array
      } else {
        currentSchedule = [];
      }
      
      renderSchedule(); // Draw the boxes!
    }

    // 4. Mist Maker uses the same humidity settings as the fan (target_humidity + humidity_hysteresis)
  });

  // ==========================================
  //      SAVE CUSTOM SETTINGS BUTTON
  // ==========================================
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const draftSavedHint = document.getElementById("draftSavedHint");

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", async () => {
      // Collect all the numbers directly from the boxes on the screen
      const updatedDraft = {
        fan: {
          enabled: true,
          target_temp: Number(document.getElementById("draftTargetTemp").value),
          hysteresis: Number(document.getElementById("draftFanHys").value),
          target_humidity: Number(document.getElementById("draftHumidityTh").value),
          humidity_hysteresis: Number(document.getElementById("draftHumidityHys").value) || 3
        },
        grow_light: {
          enabled: true,
          light_threshold: Number(document.getElementById("draftLightTh").value),
          required_hours: Number(document.getElementById("draftLightHours").value)
        },
        watering: {
          enabled: true,
          target_soil_moisture: Number(document.getElementById("draftWaterTh").value),
          duration_sec: Number(document.getElementById("draftPumpSec").value),
          times: currentSchedule
        }
      };

      // Push the custom numbers to the Firebase Draft folder
      await configDraftRef.set(updatedDraft);
      
      if (draftSavedHint) {
        draftSavedHint.textContent = "Custom Settings Saved ✔";
        draftSavedHint.style.color = "var(--primary-green)";
      }
    });
  }

  // ==========================================
  //   PRE-GROW CHECKLIST & START GROWING
  // ==========================================
  const startGrowBtn = document.getElementById("startGrowBtn");
  const cbSeeds = document.getElementById("cbSeeds");
  const cbSoil = document.getElementById("cbSoil");
  const cbTank = document.getElementById("cbTank");
  const durationDaysInput = document.getElementById("durationDays");

  if (startGrowBtn && cbSeeds && cbSoil && cbTank) {
    
    // --- 1. Checklist Logic ---
    function validateChecklist() {
      // Check if ALL three specific boxes are ticked
      const allChecked = cbSeeds.checked && cbSoil.checked && cbTank.checked;

      // Lock or unlock the button based on that result
      startGrowBtn.disabled = !allChecked;
      startGrowBtn.style.opacity = allChecked ? "1" : "0.5";
      startGrowBtn.style.cursor = allChecked ? "pointer" : "not-allowed";
    }

    // Listen for clicks on these exact three boxes
    cbSeeds.addEventListener("change", validateChecklist);
    cbSoil.addEventListener("change", validateChecklist);
    cbTank.addEventListener("change", validateChecklist);

    // Run once at the start to ensure the button starts locked
    validateChecklist(); 

    // --- 2. Start Growing Click Logic ---
    startGrowBtn.addEventListener("click", async () => {
      try {
        // Grab the finalized settings from the draft folder
        const draftSnap = await configDraftRef.get();
        if (!draftSnap.exists()) {
          alert("No draft settings found. Please load a crop preset first.");
          return;
        }
        
        const finalConfig = draftSnap.val();

        // Copy the draft settings to the official active config folder
        await configRef.set(finalConfig);

        // Get the duration from your input box (default to 30 if empty)
        const days = Number(durationDaysInput.value) || 30;

        // Mark the grow cycle as active, save the start time, and save the duration
        await growRef.update({
          active: true,
          start_ts: Date.now(),
          duration_days: days
        });

        // Switch the system to AUTO mode
        await modeRef.set("auto");

        // Update the mode button to show AUTO
        const modeSwitch = document.getElementById("modeSwitch");
        if (modeSwitch) {
          modeSwitch.textContent = "AUTO";
          modeSwitch.setAttribute("data-mode", "auto");
        }

        // Reset the checkboxes for the next time you plant
        cbSeeds.checked = false;
        cbSoil.checked = false;
        cbTank.checked = false;
        validateChecklist(); // Re-lock the button

        alert("Grow cycle started! The system is now in AUTO mode.");
        
        // Send the user back to the Dashboard
        showPage("dashboardPage"); 

      } catch (error) {
        console.error("Error starting grow cycle:", error);
        alert("There was an error starting the system.");
      }
    });
  }

  // ==========================================
  //   GROW STATUS: LOCK UI & STOP GROWING
  // ==========================================
  const stopGrowBtn = document.getElementById("stopGrowBtn");
  // Grab literally every input, dropdown, and button on the setup page
  const allSetupElements = document.querySelectorAll("#setupPage input, #setupPage select, #setupPage button");

  // 1. Listen to Firebase to see if the greenhouse is actively growing
  growRef.on("value", snap => {
    const growData = snap.val();
    const isGrowing = growData && growData.active === true;

    // Loop through everything on the Setup page
    allSetupElements.forEach(el => {
      if (el.id === "stopGrowBtn") {
        // Show the Stop button ONLY if we are growing
        el.style.display = isGrowing ? "inline-block" : "none";
        el.disabled = false; 
      } else if (el.id === "startGrowBtn") {
        // Hide the Start button if we are growing
        el.style.display = isGrowing ? "none" : "inline-block";
      } else {
        // Lock or unlock everything else based on the growing status
        el.disabled = isGrowing;
        el.style.opacity = isGrowing ? "0.5" : "1";
        el.style.cursor = isGrowing ? "not-allowed" : "default";
      }
    });
  });

  // 2. The Stop Growing Button Logic
  if (stopGrowBtn) {
    stopGrowBtn.addEventListener("click", async () => {
      // Ask for confirmation just in case they misclicked
      const confirmStop = confirm("Are you sure you want to stop the current grow cycle?");
      if (!confirmStop) return;

      try {
        // 1. Turn off the active grow status in Firebase
        await growRef.update({ active: false });
        
        // 2. Switch the system back to manual mode
        await modeRef.set("manual");

        // Update the mode button back to MANUAL
        const modeSwitch = document.getElementById("modeSwitch");
        if (modeSwitch) {
          modeSwitch.textContent = "MANUAL";
          modeSwitch.setAttribute("data-mode", "manual");
        }

        // 3. Wipe the draft and selected crop to reset the page
        await selectedCropRef.set("none");
        await configDraftRef.set(null); 
        await configRef.set(null); // Optional: Also clear the active config if you want a full reset

        // 4. Manually clear the target labels on the screen immediately
        ["targetTemp", "targetHumidity", "targetSoil", "targetSoil2", "targetSoil3", "targetLight", "nitrogenIdeal", "phosphorusIdeal", "potassiumIdeal"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = "";
        });
        
        // 5. WIPE THE SETUP PAGE MESSAGES & INPUTS
        if (cropLoadedHint) cropLoadedHint.textContent = "";
        if (draftSavedHint) draftSavedHint.textContent = "";

        // Clear the numbers in the environment boxes
        const inputIDs = [
          "draftTargetTemp", "draftFanHys", "draftHumidityTh",
          "draftLightTh", "draftLightHours", "draftWaterTh", "draftPumpSec"
        ];
        inputIDs.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });

        // Also reset the crop dropdown on the screen manually just in case
        const cropSelect = document.getElementById("cropSelect");
        if (cropSelect) cropSelect.value = "none";

        alert("Grow cycle stopped. Setup page reset to defaults.");
        showPage("dashboardPage"); // Send them back to the Dashboard
      } catch (error) {
        console.error("Error stopping grow cycle:", error);
      }
    });
  }

  // ==========================================
  //      DASHBOARD GROW STATUS DISPLAY
  // ==========================================
  const activeCropTitle = document.getElementById("activeCropTitle");
  const activeCropSub = document.getElementById("activeCropSub");
  const cropButton = document.getElementById("cropButton");
  const growProgressBar = document.getElementById("growProgressBar");
  const progressDay = document.getElementById("progressDay");
  const progressCrop = document.getElementById("progressCrop");

  growRef.on("value", async (snap) => {
    const growData = snap.val();
    
    if (growData && growData.active) {
      // 1. Get the crop name from Firebase
      const cropSnap = await selectedCropRef.get();
      const cropName = cropSnap.val() || "Unknown Crop";
      
      // 2. Update Header Text
      if (activeCropTitle) activeCropTitle.textContent = "Currently Growing: " + cropName.toUpperCase();
      //if (activeCropSub) activeCropSub.textContent = "Your greenhouse is in AUTO mode.";
      if (progressCrop) progressCrop.textContent = cropName.toUpperCase();

      //Hide setup button when growing
      if (cropButton) {
        cropButton.textContent = "View Setup";
        cropButton.style.backgroundColor = "var(--danger)"; // Uses your red color variable
        cropButton.style.color = "white";
        cropButton.style.borderColor = "var(--danger)";
      }

      // 3. Calculate Progress
      const startMs = growData.start_ts || Date.now();
      const durationDays = growData.duration_days || 30;
      const elapsedMs = Math.max(0, Date.now() - startMs);
      const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
      
      const percent = Math.min(Math.round((elapsedDays / durationDays) * 100), 100);
      
      if (progressDay) progressDay.textContent = `Day ${elapsedDays} of ${durationDays}`;
      if (growProgressBar) growProgressBar.style.width = percent + "%";
    }
  });

  // ===================================//
  //   MODE SYNC & SENSOR TARGETS       //
  // ===================================//
  
  // 1. Sync the Mode Button (Auto/Manual)
  modeRef.on("value", snap => {
    currentMode = snap.val() === "auto" ? "auto" : "manual";
    if (modeSwitchBtn) {
      modeSwitchBtn.textContent = currentMode.toUpperCase();
      modeSwitchBtn.dataset.mode = currentMode;
      
      // Visual feedback: Green for Auto, Gray/Original for Manual
      if (currentMode === "auto") {
        modeSwitchBtn.style.backgroundColor = "var(--primary-green)";
        modeSwitchBtn.style.color = "white";
      } else {
        modeSwitchBtn.style.backgroundColor = ""; // Goes back to CSS default
        modeSwitchBtn.style.color = "";
      }
    }

    // Lock manual buttons when in Auto mode
    const isDisabled = currentMode !== "manual";
    [fanBtn, pumpBtn, lightBtn, mistBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = isDisabled;
      btn.style.opacity = isDisabled ? "0.5" : "1";
      btn.style.cursor = isDisabled ? "not-allowed" : "pointer";
    });

    // Also lock/unlock zone checkboxes
    [zoneCheck1, zoneCheck2, zoneCheck3].forEach(cb => {
      if (!cb) return;
      cb.disabled = isDisabled;
    });
  });

  // ==========================================
  //   CROP OPTIMAL RANGES (display only)
  //   ESP32 still uses single threshold values
  // ==========================================
  const cropOptimalRanges = {
    tomato:  { tempMin: 21, tempMax: 24, humidMin: 65, humidMax: 85, soilMin: 60, soilMax: 80 },
    lettuce: { tempMin: 15, tempMax: 25, humidMin: 60, humidMax: 80, soilMin: 60, soilMax: 80 },
    spinach: { tempMin: 25, tempMax: 30, humidMin: 70, humidMax: 90, soilMin: 75, soilMax: 100 } // kangkong
  };

  // ==========================================
  //   CROP NPK IDEAL PARAMETERS
  // ==========================================
const cropNPKRanges = {
  spinach: { // Alias for Kangkong in your system
    nitrogen:   "150–200 mg/kg (Lush Foliage)",
    phosphorus: "40–70 mg/kg",
    potassium:  "200–250 mg/kg (Stem Strength)"
  },
  kangkong: { // Also adding kangkong just in case
    nitrogen:   "150–200 mg/kg (Lush Foliage)",
    phosphorus: "40–70 mg/kg",
    potassium:  "200–250 mg/kg (Stem Strength)"
  },
  lettuce: {
    nitrogen:   "150–166 mg/kg",
    phosphorus: "40–50 mg/kg",
    potassium:  "200–210 mg/kg"
  },
  tomato: {
    nitrogen:   "🌱 Veg: 150 | 🍅 Fruit: 200 mg/kg",
    phosphorus: "🌱 Veg: 50 | 🍅 Fruit: 50–60 mg/kg",
    potassium:  "🌱 Veg: 250 | 🍅 Fruit: 350–400 mg/kg"
  }
};

  function getOptimalLabel(min, max, unit) {
    return `<span style="color: #888; font-size: 0.8rem; margin-left: 5px;">(Optimal: ${min}\u2013${max}${unit})</span>`;
  }

  function getLightCategory(lux) {
    if (lux <= 100)   return "Dark";
    if (lux <= 2000)  return "Low Light";
    if (lux <= 10000) return "Medium Light";
    return "High Light";
  }

  // 2. Sync Dashboard Optimal Ranges & Handle Fixed Zone Highlighting
  configRef.on("value", snap => {
    const config = snap.val();
    // These are the IDs that get wiped if no grow cycle is active
    const wipeIDs = [
      "targetTemp", "targetHumidity", "targetSoil", "targetSoil2", "targetSoil3", "targetLight",
      "tipTempThreshold","tipHumidThreshold","tipSoil1Threshold","tipSoil2Threshold","tipSoil3Threshold","tipLuxThreshold",
      "nitrogenIdeal", "phosphorusIdeal", "potassiumIdeal"
    ];

    if (!config) {
      wipeIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
      });
      // Also remove focus/badges if config is wiped
      ["soilCard1", "soilCard2", "soilCard3"].forEach(id => document.getElementById(id)?.classList.remove('card-active-focus'));
      ["badge-kangkong", "badge-lettuce", "badge-tomato"].forEach(id => document.getElementById(id)?.classList.add('hidden'));
      return;
    }

    const style = 'style="color: #888; font-size: 0.8rem; margin-left: 5px;"';

    selectedCropRef.get().then(cropSnap => {
      const activeCrop = (cropSnap.val() || "").toLowerCase();
      const ranges = cropOptimalRanges[activeCrop] || null;
      
      // ==========================================
      //   1. NPK IDEAL LABELS (Active Crop Only)
      // ==========================================
      const npkKey = (activeCrop === "kangkong") ? "spinach" : activeCrop;
      const npkData = cropNPKRanges[npkKey];
      if (npkData) {
        document.getElementById("nitrogenIdeal").innerHTML = `<strong>Ideal:</strong> ${npkData.nitrogen}`;
        document.getElementById("phosphorusIdeal").innerHTML = `<strong>Ideal:</strong> ${npkData.phosphorus}`;
        document.getElementById("potassiumIdeal").innerHTML = `<strong>Ideal:</strong> ${npkData.potassium}`;
      }

      // ==========================================
      //   2. CLIMATE (Temp & Humidity)
      // ==========================================
      if (config.fan) {
        const t = document.getElementById("targetTemp");
        const h = document.getElementById("targetHumidity");
        if (t) t.innerHTML = ranges
          ? getOptimalLabel(ranges.tempMin, ranges.tempMax, "\u00b0C")
          : `<span ${style}>(Trigger: ${config.fan.target_temp}\u00b0C)</span>`;
        if (h) h.innerHTML = ranges
          ? getOptimalLabel(ranges.humidMin, ranges.humidMax, "%")
          : `<span ${style}>(Optimal Range)</span>`;

        const tipTemp = document.getElementById("tipTempThreshold");
        if (tipTemp) {
          const rangeText = ranges ? `Optimal range is <strong>${ranges.tempMin}\u2013${ranges.tempMax}\u00b0C</strong>. ` : "";
          tipTemp.innerHTML = `${rangeText}In Auto mode, the <strong>Vent Fan</strong> turns ON when temperature exceeds <strong>${config.fan.target_temp}\u00b0C</strong>.<br>`;
        }
        const tipHumid = document.getElementById("tipHumidThreshold");
        if (tipHumid) {
          const rangeText = ranges ? `Optimal range is <strong>${ranges.humidMin}\u2013${ranges.humidMax}%</strong>. ` : "";
          tipHumid.innerHTML = `${rangeText}In Auto mode, the <strong>Mist Maker</strong> turns ON when humidity drops below <strong>${config.fan.target_humidity}%</strong>.<br>`;
        }
      }

      // ==========================================
      //   3. FIXED SOIL ZONES (1=Kang, 2=Lett, 3=Tom)
      // ==========================================
      function updateZoneLogic(zoneNum, cropName, targetId, cardId, badgeId, tipId) {
        const targetEl = document.getElementById(targetId);
        const cardEl = document.getElementById(cardId);
        const badgeEl = document.getElementById(badgeId);
        const tipEl = document.getElementById(tipId);

        // Internal key mapping (spinach is kangkong in your system)
        const rangeKey = (cropName === "kangkong") ? "spinach" : cropName;
        const biologicalRange = cropOptimalRanges[rangeKey];

        // A. Set Biological Label (Always show its own range)
        if (targetEl && biologicalRange) {
          targetEl.innerHTML = `<span ${style}>(${biologicalRange.soilMin}\u2013${biologicalRange.soilMax}%)</span>`;
        }

        // B. Set Tooltip (Show current dynamic trigger from Config)
        if (tipEl && config.watering) {
          const trigger = config.watering.target_soil_moisture;
          tipEl.innerHTML = (biologicalRange ? `Optimal range is <strong>${biologicalRange.soilMin}\u2013${biologicalRange.soilMax}%</strong>. ` : "")
            + `In Auto mode, this zone's valve opens at the scheduled time if moisture drops below <strong>${trigger}%</strong>.<br>`;
        }

        // C. Highlighting Logic (Is this the active crop from Setup?)
        if (activeCrop === cropName || (activeCrop === "spinach" && cropName === "kangkong")) {
          cardEl?.classList.add('card-active-focus');
          badgeEl?.classList.remove('hidden');
        } else {
          cardEl?.classList.remove('card-active-focus');
          badgeEl?.classList.add('hidden');
        }
      }

      // Execute Zone Logic
      updateZoneLogic(1, "kangkong", "targetSoil",  "soilCard1", "badge-kangkong", "tipSoil1Threshold");
      updateZoneLogic(2, "lettuce",  "targetSoil2", "soilCard2", "badge-lettuce",  "tipSoil2Threshold");
      updateZoneLogic(3, "tomato",   "targetSoil3", "soilCard3", "badge-tomato",   "tipSoil3Threshold");

      // ==========================================
      //   4. LIGHTING
      // ==========================================
      if (config.grow_light) {
        const l = document.getElementById("targetLight");
        const lightDisplayEl = document.getElementById("lightDisplay");
        let cleanLux = 0;
        if (lightDisplayEl && lightDisplayEl.innerText) {
          cleanLux = parseFloat(lightDisplayEl.innerText.replace(/,/g, ""));
        }
        const lightStatus = getLightCategory(cleanLux);
        if (l) l.innerHTML = `<span ${style}>(${lightStatus})</span>`;

        const tipLux = document.getElementById("tipLuxThreshold");
        if (tipLux) tipLux.innerHTML = `In Auto mode, <strong>Grow Lights</strong> turn ON when lux drops below <strong>${config.grow_light.light_threshold} lux</strong> and the daily light goal hasn't been met.<br>`;
      }
    });
  });

  // ==========================================
  //      TODAY'S USAGE TRACKING
  // ==========================================
  const pumpCountDisplay = document.getElementById("pumpCountDisplay");
  const lightHoursDisplay = document.getElementById("lightHoursDisplay");
  const sunlightHoursDisplay = document.getElementById("sunlightHoursDisplay");

  // 1. Figure out exactly what today's date is in YYYY-MM-DD format (UTC to match Arduino RTC which is UTC+8)
  // NOTE: Arduino uses getRTC time (GMT+8), so we should use UTC and convert
  // For now, use browser local time. If you travel, verify your system timezone is correct!
  function getTodayDateKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    // WARNING: This uses browser LOCAL time. Must match Arduino's timezone (GMT+8 in the code)
    // If you travel, this will show wrong date!
    return `${year}-${month}-${day}`;
  }

  // 2. Point directly to today's tracking folder
  const todayKey = getTodayDateKey();
  const todayTrackingRef = firebase.database().ref("tracking/daily/" + todayKey);

  // 3. Listen for updates from the ESP32
  todayTrackingRef.on("value", (snap) => {
    const data = snap.val();
    
    if (data) {
      const lightMins = data.light_minutes || 0;
      const sunlightMins = data.sunlight_minutes || 0;
      //const waterCount = data.water_count || 0;
      const waterCount = data.watering_log ? Object.values(data.watering_log).filter(status => status === "Watered" || status === "Manual").length : 0;      const lightHrs = Math.floor(lightMins / 60);
      const lightRemainderMins = lightMins % 60;

      const sunHrs = Math.floor(sunlightMins / 60);
      const sunRemainderMins = sunlightMins % 60;
      
      if (pumpCountDisplay) pumpCountDisplay.textContent = waterCount + " times";
      if (data.watering_log) {
        const logTimes = Object.keys(data.watering_log);
        if (logTimes.length > 0) {
          logTimes.sort();
          const latestTime = logTimes[logTimes.length - 1];

          // Convert 24h to 12h format (optional but user-friendly)
        let [hh, mm] = latestTime.split(':');
        let hour = parseInt(hh);
        let ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;

        document.getElementById("lastWateredTime").textContent = `Last: ${hour}:${mm} ${ampm}`;
        }
      }
      if (lightHoursDisplay) lightHoursDisplay.textContent = `${lightHrs} hrs ${lightRemainderMins} mins`;
      if (sunlightHoursDisplay) sunlightHoursDisplay.textContent = `${sunHrs} hrs ${sunRemainderMins} mins`;
      
    } else {
      // If it's exactly midnight and the ESP32 hasn't sent data yet
      if (pumpCountDisplay) pumpCountDisplay.textContent = "0 times (waiting...)";
      if (lightHoursDisplay) lightHoursDisplay.textContent = "0 hrs 0 mins (waiting...)";
      if (sunlightHoursDisplay) sunlightHoursDisplay.textContent = "0 hrs 0 mins (waiting...)";
    }
  }, (error) => {
    // Handle Firebase read errors
    console.error("Tracking data read error:", error);
    if (pumpCountDisplay) pumpCountDisplay.textContent = "⚠️ Unable to load";
    if (lightHoursDisplay) lightHoursDisplay.textContent = "⚠️ Firebase error";
    if (sunlightHoursDisplay) sunlightHoursDisplay.textContent = "⚠️ Firebase error";
  });

// ==========================================
//      SYSTEM ALERTS & ACTIVITY LOG
// ==========================================
const systemToast = document.getElementById("systemToast");
const toastMessage = document.getElementById("toastMessage");
const notificationList = document.getElementById("notificationList");
const noActivityMsg = document.getElementById("noActivity");
let toastTimeout;

// We use 'null' so it knows exactly when the page first loads
let lastStates = { fan: null, pump: null, light: null, mist: null };

// 1. System Mode Listener
let systemMode = "manual";
modeRef.on("value", snap => {
    let rawMode = snap.val();
    // Force it to lowercase just in case Firebase says "Auto" or "AUTO"
    if (rawMode) {
        systemMode = String(rawMode).toLowerCase();
    }
});

function triggerAlert(message, color) {
    // A. TOAST POPUP (Keep as is)
    if (systemToast && toastMessage) {
        toastMessage.textContent = message;
        systemToast.style.borderLeftColor = color;
        systemToast.classList.remove("hidden");
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { systemToast.classList.add("hidden"); }, 5000);
    }

    // B. DROPDOWN LOG
    const list = document.getElementById("notificationList");
    const noAct = document.getElementById("noActivity");
    if (list) {
        if (noAct) noAct.style.display = "none";

        // Show the red unread dot on the bell if dropdown is currently closed
        if (notifDropdown.classList.contains("hidden")) {
            notifBadge.classList.remove("hidden");
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const logEntry = document.createElement("div");
        logEntry.className = "log-entry-item";
        logEntry.innerHTML = `
            <span class="log-time">${timeStr}</span>
            <span class="log-msg">${message}</span>
            <div class="log-dot" style="background: ${color};"></div>
        `;

        list.prepend(logEntry);

        // Keep it clean: Limit to 20 entries
        if (list.children.length > 20) {
            list.removeChild(list.lastElementChild);
        }
    }
}

// 3. LISTENERS

// FAN
fanCmdRef.on("value", (snap) => {
    const current = !!snap.val();
    if (lastStates.fan !== null && current !== lastStates.fan) {
        if (current) {
            const msg = (systemMode === "auto") ? "⚠️ Temp High. Fan ON." : "👋 Manual Command: Fan ON.";
            triggerAlert(msg, (systemMode === "auto") ? "#e74c3c" : "#7f8c8d");
        } else {
            triggerAlert("✅ Temp Stable. Fan OFF.", "#2ecc71");
        }
    }
    lastStates.fan = current;
});

// PUMP
pumpCmdRef.on("value", (snap) => {
    const current = !!snap.val();
    if (lastStates.pump !== null && current !== lastStates.pump) {
        if (current) {
            const msg = (systemMode === "auto") ? "💧 Soil Dry. Pump ON." : "👋 Manual Command: Pump ON.";
            triggerAlert(msg, (systemMode === "auto") ? "#3498db" : "#7f8c8d");
        } else {
            triggerAlert("✅ Watering finished. Pump OFF.", "#2ecc71");
        }
    }
    lastStates.pump = current;
});

// LIGHT
lightCmdRef.on("value", (snap) => {
    const current = !!snap.val();
    if (lastStates.light !== null && current !== lastStates.light) {
        if (current) {
            const msg = (systemMode === "auto") ? "🌙 Low Light. Grow lights ON." : "👋 Manual Command: Lights ON.";
            triggerAlert(msg, (systemMode === "auto") ? "#f39c12" : "#7f8c8d");
        } else {
            triggerAlert("☀️ Light sufficient. Lights OFF.", "#2ecc71");
        }
    }
    lastStates.light = current;
});

// MIST MAKER
mistCmdRef.on("value", (snap) => {
    const current = !!snap.val();
    if (lastStates.mist !== null && current !== lastStates.mist) {
        if (current) {
            const msg = (systemMode === "auto") ? "💧 Low Humidity. Mist Maker ON." : "👋 Manual Command: Mist Maker ON.";
            triggerAlert(msg, (systemMode === "auto") ? "#3498db" : "#7f8c8d");
        } else {
            triggerAlert("✅ Humidity reached. Mist Maker OFF.", "#2ecc71");
        }
    }
    lastStates.mist = current;
});

  // ===================================//
  //       DAILY TRACKING HISTORY       //
  // ===================================//
  const trackingList = document.getElementById('trackingList');
  const dailyRef = firebase.database().ref('tracking/daily');

  dailyRef.on('value', (snapshot) => {
    const data = snapshot.val();
    
    if (!data) {
      trackingList.innerHTML = '<p>No daily tracking data found.</p>';
      return;
    }

    // 1. Updated Table Headers
    let tableHTML = `
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f4f4f4; border-bottom: 2px solid #ddd; text-align: left;">
            <th style="padding: 10px;">Date</th>
            <th style="padding: 10px;">Sunlight</th>
            <th style="padding: 10px;">Grow Light</th>
            <th style="padding: 10px;">Watering Details</th>
          </tr>
        </thead>
        <tbody>
    `;

    const dates = Object.keys(data).sort().reverse();

    dates.forEach(date => {
      if (date === "2000-00-00") return;

      const entry = data[date];

      // Calculate Light Hours and Mins
      const sunTotal = entry.sunlight_minutes || 0;
      const sunH = Math.floor(sunTotal / 60);
      const sunM = sunTotal % 60;

      const artTotal = entry.light_minutes || 0;
      const artH = Math.floor(artTotal / 60);
      const artM = artTotal % 60;

      // Get the total count (defaults to 0 if not found)
// --- NEW FIX: Count both "Watered" and "Manual" actions ---
      let waterCount = 0;
      if (entry.watering_log) {
        // We added the OR check right here:
        waterCount = Object.values(entry.watering_log).filter(status => status === "Watered" || status === "Manual").length;
      } else if (entry.water_count !== undefined) {
        waterCount = entry.water_count; // Fallback for very old data
      }      
      // --- NEW TABLE WATERING LOGIC ---
      let wateringDetails = "";
      
      if (entry.watering_log) {
        // NEW DATA: Make it a clickable toggle that shows the count on the outside
        let timelineHTML = "";
        for (const [time, action] of Object.entries(entry.watering_log)) {

          // --- NEW: Convert 24-hour time to AM/PM ---
          let [hourString, minuteString] = time.split(':');
          let hour = parseInt(hourString);
          let ampm = hour >= 12 ? 'PM' : 'AM';
          hour = hour % 12;
          hour = hour ? hour : 12; // the hour '0' should be '12'
          let displayTime = `${hour}:${minuteString} ${ampm}`;
          // Color code actions
          let color = "#888"; 
          if (action === "Watered") color = "#3498db"; // Blue
          if (action === "Skipped") color = "#e74c3c"; // Red
          if (action === "Manual") color = "#f39c12";  // Orange
          
          timelineHTML += `<div style="margin-bottom: 3px; font-size: 0.9em;"><b>${displayTime}</b> <span style="color: ${color};">${action}</span></div>`;        
}
        
        // The <details> tag creates a clickable drop-down automatically
        wateringDetails = `
          <details style="cursor: pointer;">
            <summary style="font-weight: bold; color: #2c3e50; outline: none;">Watered ${waterCount} times</summary>
            <div style="margin-top: 5px; padding-left: 10px; border-left: 2px solid #ccc;">
              ${timelineHTML}
            </div>
          </details>
        `;
      } else if (entry.water_count !== undefined) {
        // OLD LEGACY DATA: Just show the plain text because there is no timeline to expand
        wateringDetails = `<span style="color: #666;">Watered ${waterCount} times</span>`;
      } else {
        // NO DATA YET
        wateringDetails = `<span style="color: #888;">No schedule run yet</span>`;
      }

      // Build the row with some slight color coding for readability
      tableHTML += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; font-weight: bold;">${date}</td>
          <td style="padding: 10px;">${sunH}h ${sunM}m</td>
          <td style="padding: 10px;">${artH}h ${artM}m</td>
          <td style="padding: 10px;">${wateringDetails}</td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    trackingList.innerHTML = tableHTML;
  });
}});

// ===================================//
//      CHAPTER 4: HISTORY GRAPH      //
// ===================================//

const ctx = document.getElementById('thesisChart');
const datePicker = document.getElementById('graphDatePicker');
let myChart = null; 

// --- ADD THIS HELPER FUNCTION HERE ---
function formatToStandardTime(timeStr) {
  if (!timeStr) return "";
  let [hour, min] = timeStr.split(':');
  let h = parseInt(hour);
  let ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // if hour is 0, change to 12
  return h + " " + ampm;
}
// -------------------------------------

if (ctx && datePicker) {
  const today = new Date();
  const localDate = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
  
  datePicker.value = localDate;

  function loadGraph(dateKey) {
    const historyRef = firebase.database().ref('history/' + dateKey);
    
    historyRef.once('value', snapshot => {
      const data = snapshot.val();

      if (!data) {
        if (myChart) myChart.destroy();
        return;
      }

      const timeLabels = [];
      const tempData = [];
      const humidData = [];
      const soil1Data = [];
      const soil2Data = [];
      const soil3Data = [];
      const luxData = [];

      const hours = Object.keys(data).sort();

      hours.forEach(hour => {
        // --- CHANGE THIS LINE TO USE THE HELPER ---
        timeLabels.push(formatToStandardTime(hour)); 
        // ------------------------------------------
        
        tempData.push(data[hour].temp || 0);
        humidData.push(data[hour].humid || 0);
        soil1Data.push(data[hour].soil1 || 0);
        soil2Data.push(data[hour].soil2 || 0);
        soil3Data.push(data[hour].soil3 || 0);
        luxData.push(data[hour].lux || 0);
      });

      if (myChart) {
        myChart.destroy();
      }

      myChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            { label: 'Temp (°C)', data: tempData, borderColor: '#e74c3c', backgroundColor: '#e74c3c', tension: 0.3, yAxisID: 'y' },
            { label: 'Humidity (%)', data: humidData, borderColor: '#3498db', backgroundColor: '#3498db', tension: 0.3, yAxisID: 'y' },
            { label: 'Soil Zone 1 (%)', data: soil1Data, borderColor: '#8b7355', backgroundColor: '#8b7355', tension: 0.3, yAxisID: 'y' },
            { label: 'Soil Zone 2 (%)', data: soil2Data, borderColor: '#a0826d', backgroundColor: '#a0826d', tension: 0.3, yAxisID: 'y' },
            { label: 'Soil Zone 3 (%)', data: soil3Data, borderColor: '#c9b8a8', backgroundColor: '#c9b8a8', tension: 0.3, yAxisID: 'y' },
            { label: 'Lux', data: luxData, borderColor: '#f1c40f', backgroundColor: '#f1c40f', tension: 0.3, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            // --- ADDED THIS SECTION TO MAKE LABELS CLEANER ---
            x: {
              ticks: {
                autoSkip: true,
                maxTicksLimit: 12, // Shows labels like 12AM, 2AM, 4AM etc so it's not crowded
                maxRotation: 0
              }
            },
            // ------------------------------------------------
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Climate & Soil' },
              suggestedMin: 0,
              suggestedMax: 100
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'Light (Lux)' },
              grid: { drawOnChartArea: false }, 
              suggestedMin: 0
            }
          }
        }
      });
    });
  }

  loadGraph(localDate);

  datePicker.addEventListener('change', (e) => {
    loadGraph(e.target.value);
  });
}

// ==========================================
//      MASTER SYSTEM CONNECTIVITY LOGIC
// ==========================================

// 1. Monitor if the Browser itself has internet
let browserIsConnected = false;
firebase.database().ref('.info/connected').on('value', (snap) => {
    browserIsConnected = (snap.val() === true);
});

// 2. The Unified Checker (Updates the Top Nav Status)
setInterval(() => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const lastSeenEl = document.getElementById("last-seen-text");
  
  // Calculate seconds since the last sensor update from ESP32
  const secondsSinceLastData = lastHeartbeat === 0 ? 999999 : Math.floor((Date.now() - lastHeartbeat) / 1000);

  if (!browserIsConnected) {
    // RED: Your laptop/computer has no internet
    statusDot.textContent = '🔴';
    statusText.textContent = 'Dashboard Offline';
    statusText.style.color = '#e74c3c'; // Red
    lastSeenEl.innerText = "Check your WiFi connection";
    statusDot.classList.remove("pulse-green");
  } 
  else if (secondsSinceLastData > 60) {
    // RED: You have internet, but the Greenhouse Hardware is OFF or disconnected
    statusDot.textContent = '🔴';
    statusText.textContent = 'Hardware Offline';
    statusText.style.color = '#e74c3c'; // Red
    
    if (secondsSinceLastData > 3600) {
        lastSeenEl.innerText = "Hardware: OFFLINE (> 1 hour)";
    } else {
        const mins = Math.floor(secondsSinceLastData / 60);
        lastSeenEl.innerText = `Hardware: Last seen ${mins}m ago`;
    }
    statusDot.classList.remove("pulse-green");
  } 
  else {
    // GREEN: Everything is working perfectly
    statusDot.textContent = '🟢';
    statusText.textContent = 'System Online';
    statusText.style.color = '#2ecc71'; // Green
    lastSeenEl.innerText = "Hardware: Online (Just now)";
    statusDot.classList.add("pulse-green");
  }
}, 5000); // Check every 5 seconds for a faster response

// ==========================================
//      CHAPTER 4: MASTER CSV EXPORT (ALL DATA)
// ==========================================
const downloadBtn = document.getElementById("downloadCsvBtn");

if (downloadBtn) {
  downloadBtn.addEventListener("click", async () => {
    
    // 1. Get ALL History and ALL Daily Tracking from Firebase
    // Notice we removed the specific date, so it grabs the whole folder
    const historyRef = firebase.database().ref('history');
    const trackingRef = firebase.database().ref('tracking/daily');

    const [histSnap, trackSnap] = await Promise.all([
      historyRef.once('value'),
      trackingRef.once('value')
    ]);

    const allHistData = histSnap.val() || {};
    const allTrackData = trackSnap.val() || {};

    // Gather every single date from both folders and sort them from oldest to newest
    const allDates = new Set([...Object.keys(allHistData), ...Object.keys(allTrackData)]);
    const sortedDates = Array.from(allDates).sort();

    if (sortedDates.length === 0) {
      alert("No data found in the database.");
      return;
    }

    let csvContent = `GREENHOUSE COMPLETE MASTER REPORT\n`;
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    // 2. Loop through every single date and build the sections
    sortedDates.forEach(date => {
      const histData = allHistData[date];
      const trackData = allTrackData[date];

      // Add a clear visual separator for each new day
      csvContent += `==========================================\n`;
      csvContent += ` DATE: ${date}\n`;
      csvContent += `==========================================\n\n`;

      // PART A: DAILY SUMMARY
      csvContent += "--- DAILY SUMMARY ---\n";
      csvContent += `Total Waterings,${trackData?.water_count || 0} times\n`;
      csvContent += `Grow Light Duration,${trackData?.light_minutes || 0} mins\n`;
      csvContent += `Sunlight Duration,${trackData?.sunlight_minutes || 0} mins\n\n`;

      // PART B: WATERING LOG (When exactly did it water?)
      csvContent += "--- WATERING LOG ---\n";
      csvContent += "Time,Action\n";
      if (trackData?.watering_log) {
        Object.keys(trackData.watering_log).sort().forEach(time => {
          csvContent += `${time},${trackData.watering_log[time]}\n`;
        });
      } else {
        csvContent += "No watering events recorded\n";
      }
      csvContent += "\n";

      // PART C: HOURLY ENVIRONMENT LOG
      csvContent += "--- HOURLY ENVIRONMENT LOG ---\n";
      csvContent += "Time,Temp (C),Humidity (%),Soil Avg (%),Lux,Nitrogen,Phosphorus,Potassium\n";
      
      if (histData) {
        Object.keys(histData).sort().forEach(hour => {
          const row = histData[hour];
          const line = [
            hour,
            row.temp || 0,
            row.humid || 0,
            row.soil_avg || 0,
            row.lux || 0,
            row.nitrogen || 0,
            row.phosphorus || 0,
            row.potassium || 0
          ].join(",");
          csvContent += line + "\n";
        });
      } else {
         csvContent += "No hourly data recorded for this date\n";
      }
      
      // Add extra space before the next day starts
      csvContent += "\n\n"; 
    });

    // 3. DOWNLOAD THE FILE
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Complete_Greenhouse_Report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// ==========================================
//      ONBOARDING GUIDE MODAL
// ==========================================
(function() {
  const TOTAL_STEPS = 5;
  let currentStep = 1;

  const modal      = document.getElementById("guideModal");
  const closeBtn   = document.getElementById("guideCloseBtn");
  const prevBtn    = document.getElementById("guidePrevBtn");
  const nextBtn    = document.getElementById("guideNextBtn");
  const progressBar = document.getElementById("guideProgressBar");
  const stepLabel  = document.getElementById("guideStepLabel");
  const guideBtn   = document.getElementById("guideBtn");

  function showStep(n) {
    // Hide all steps
    document.querySelectorAll(".guide-step").forEach(s => s.classList.remove("active"));
    // Show target step
    const target = document.querySelector(`.guide-step[data-step="${n}"]`);
    if (target) target.classList.add("active");

    // Update progress bar
    const pct = ((n - 1) / (TOTAL_STEPS - 1)) * 100;
    if (progressBar) progressBar.style.width = pct + "%";

    // Update step label
    if (stepLabel) stepLabel.textContent = `Step ${n} of ${TOTAL_STEPS}`;

    // Back button visibility
    if (prevBtn) prevBtn.style.visibility = n === 1 ? "hidden" : "visible";

    // Next button text
    if (nextBtn) nextBtn.textContent = n === TOTAL_STEPS ? "Got it! 🎉" : "Next →";

    currentStep = n;
  }

  function openModal() {
    if (modal) modal.classList.remove("hidden");
    showStep(1);
  }

  function closeModal() {
    if (modal) modal.classList.add("hidden");
    // Remember they've seen it
    localStorage.setItem("autogrow_guide_seen", "true");
  }

  // Next / Got it button
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentStep < TOTAL_STEPS) {
        showStep(currentStep + 1);
      } else {
        closeModal();
      }
    });
  }

  // Back button
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentStep > 1) showStep(currentStep - 1);
    });
  }

  // Close (X) button
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Click outside modal to close
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // "? Guide" button in navbar — always reopens
  if (guideBtn) guideBtn.addEventListener("click", openModal);

  // Auto-show on first login
  if (!localStorage.getItem("autogrow_guide_seen")) {
    // Small delay so the dashboard loads first
    setTimeout(openModal, 800);
  }
})();

// --- NOTIFICATION DROPDOWN LOGIC ---
const notifBtn = document.getElementById("notifBtn");
const notifDropdown = document.getElementById("notifDropdown");
const notifBadge = document.getElementById("notifBadge");
const clearNotifs = document.getElementById("clearNotifs");

// Toggle dropdown when clicking the bell
notifBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle("hidden");
    // Hide red dot when opened
    notifBadge.classList.add("hidden");
});

// Close dropdown if clicking anywhere else on the screen
document.addEventListener("click", () => {
    notifDropdown.classList.add("hidden");
});

// Prevent dropdown from closing when clicking inside it
notifDropdown.addEventListener("click", (e) => e.stopPropagation());

// Clear all notifications
if (clearNotifs) {
    clearNotifs.addEventListener("click", () => {
        const list = document.getElementById("notificationList");
        list.innerHTML = '<p id="noActivity">No recent activities...</p>';
    });
}