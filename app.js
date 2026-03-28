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
const modeRef = database.ref("mode");

// CONFIG DRAFT REFERENCES
const selectedCropRef = database.ref("/selected_crop");
const presetsRef = database.ref("/crop_presets");
const configRef = database.ref("/config");
const configDraftRef = database.ref("/config_draft");
const growRef = database.ref("/grow");

// Grab the HTML elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Listen to the hidden Firebase connection path
const connectedRef = firebase.database().ref('.info/connected');

connectedRef.on('value', (snap) => {
  if (snap.val() === true) {
    // We have internet!
    statusDot.textContent = '🟢';
    statusText.textContent = 'Connected to Database';
    statusText.style.color = 'green';
  } else {
    // We lost internet!
    statusDot.textContent = '🔴';
    statusText.textContent = 'Disconnected (Check Wi-Fi)';
    statusText.style.color = 'red';
  }
});

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

  // Format the numbers so they look like a digital clock (e.g., 08:05 instead of 8:5)
  if (nextTime) {
    const formattedHour = String(nextTime.hour).padStart(2, '0');
    const formattedMin = String(nextTime.min).padStart(2, '0');
    nextWateringDisplay.textContent = `${nextTime.day} at ${formattedHour}:${formattedMin}`;
  } else {
    nextWateringDisplay.textContent = "Error reading schedule";
  }
});

//HELPER FUNCTIONS
function safeNumber(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
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
    const el = document.getElementById("tempDisplay");
    if (el) el.innerText = safeNumber(snap.val()).toFixed(1) + " °C";
  });
  // Humidity
    humidityRef.on("value", snap => {
    const el = document.getElementById("humidityDisplay");
    if (el) el.innerText = safeNumber(snap.val()).toFixed(1) + " %";
  });
  // Soil 1
    soil1Ref.on("value", snap => {
    const el = document.getElementById("soilDisplay1");
    if (el) el.innerText = Math.round(safeNumber(snap.val())) + " %";
    });
  // Soil 2
    soil2Ref.on("value", snap => {
    const el = document.getElementById("soilDisplay2");
    if (el) el.innerText = Math.round(safeNumber(snap.val())) + " %";
  });
  // Soil 3
    soil3Ref.on("value", snap => {
    const el = document.getElementById("soilDisplay3");
    if (el) el.innerText = Math.round(safeNumber(snap.val())) + " %";
    });
  // Light
    lightRef.on("value", snap => {
    const el = document.getElementById("lightDisplay");
    if (el) {
      // Get the value, round it, and format it with commas
      const luxValue = Math.round(safeNumber(snap.val()));
      el.innerText = luxValue.toLocaleString() + " Lux"; 
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

  let currentMode = "manual"; // Default mode
  let fanState = false;
  let pumpState = false;
  let lightState = false;

    // --- 2. MODE SWITCH LOGIC ---
    // Listen for clicks on the new buttons
    if (btnAuto) {
      btnAuto.addEventListener("click", () => {
        modeRef.set("auto");
        // Turn off manual actuators when switching to auto to be safe
        if (fanCmdRef) fanCmdRef.set(false);
        if (pumpCmdRef) pumpCmdRef.set(false);
        if (lightCmdRef) lightCmdRef.set(false);
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
        btn.classList.remove("off");
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

    // Send commands to Firebase when buttons are clicked
    if (fanBtn) {
      fanBtn.addEventListener("click", () => {
        if (currentMode === "manual") fanCmdRef.set(!fanState);
      });
    }
    if (pumpBtn) {
      pumpBtn.addEventListener("click", () => {
        if (currentMode === "manual") pumpCmdRef.set(!pumpState);
      });
    }
    if (lightBtn) {
      lightBtn.addEventListener("click", () => {
        if (currentMode === "manual") lightCmdRef.set(!lightState);
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

  // Helper function to update the little text below the buttons
  function updateSubStatus(element, isOn) {
    if (!element) return;
    if (isOn) {
      element.innerHTML = "Live: 🟢 ON";
      element.style.color = "#2ecc71"; // Nice bright green
      element.style.fontWeight = "bold";
    } else {
      element.innerHTML = "Live: 🔴 OFF";
      element.style.color = "#888"; // Subtle gray
      element.style.fontWeight = "normal";
    }
  }

  // Listen to Firebase and update instantly
  fanStateRef.on("value", snap => updateSubStatus(statusFan, snap.val()));
  pumpStateRef.on("value", snap => updateSubStatus(statusPump, snap.val()));
  lightStateRef.on("value", snap => updateSubStatus(statusLight, snap.val()));
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
        ["targetTemp", "targetHumidity", "targetSoil", "targetLight"].forEach(id => {
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
      if (activeCropSub) activeCropSub.textContent = "Your greenhouse is in AUTO mode.";
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
    [fanBtn, pumpBtn, lightBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = isDisabled;
      btn.style.opacity = isDisabled ? "0.5" : "1";
      btn.style.cursor = isDisabled ? "not-allowed" : "pointer";
    });
  });

  // 2. Sync Dashboard Targets (and clear them when null)
  configRef.on("value", snap => {
    const config = snap.val();
    const targetIDs = ["targetTemp", "targetHumidity", "targetSoil", "targetLight"];

    // IF CONFIG IS WIPED (NULL), CLEAR THE LABELS
    if (!config) {
      targetIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
      });
      return;
    }

    // IF CONFIG EXISTS, UPDATE THE LABELS
    const style = 'style="color: #888; font-size: 0.8rem; margin-left: 5px;"';

    if (config.fan) {
      const t = document.getElementById("targetTemp");
      const h = document.getElementById("targetHumidity");
      if (t) t.innerHTML = `<span ${style}>(Target: ${config.fan.target_temp}°C)</span>`;
      if (h) h.innerHTML = `<span ${style}>(Target: ${config.fan.target_humidity}%)</span>`;
    }
    if (config.watering) {
      const s = document.getElementById("targetSoil");
      if (s) s.innerHTML = `<span ${style}>(Target: ${config.watering.target_soil_moisture}%)</span>`;
    }
    if (config.grow_light) {
      const l = document.getElementById("targetLight");
      if (l) l.innerHTML = `<span ${style}>(Req: ${config.grow_light.required_hours}hrs)</span>`;
    }
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
      const waterCount = data.water_count || 0;
      const lightMins = data.light_minutes || 0;
      const sunlightMins = data.sunlight_minutes || 0;
      
      // Math: Convert total minutes into Hours and Minutes
      const lightHrs = Math.floor(lightMins / 60);
      const lightRemainderMins = lightMins % 60;

      const sunHrs = Math.floor(sunlightMins / 60);
      const sunRemainderMins = sunlightMins % 60;
      
      if (pumpCountDisplay) pumpCountDisplay.textContent = waterCount + " times";
      if (lightHoursDisplay) lightHoursDisplay.textContent = `${lightHrs} hrs ${lightRemainderMins} mins`;
      if (sunlightHoursDisplay) sunlightHoursDisplay.textContent = `${sunHrs} hrs ${sunRemainderMins} mins`;
      
    } else {
      // If it's exactly midnight and the ESP32 hasn't sent data yet
      if (pumpCountDisplay) pumpCountDisplay.textContent = "0 times (waiting for data...)";
      if (lightHoursDisplay) lightHoursDisplay.textContent = "0 hrs 0 mins (waiting for data...)";
      if (sunlightHoursDisplay) sunlightHoursDisplay.textContent = "0 hrs 0 mins (waiting for data...)";
    }
  }, (error) => {
    // Handle Firebase read errors
    console.error("Tracking data read error:", error);
    if (pumpCountDisplay) pumpCountDisplay.textContent = "⚠️ Unable to load";
    if (lightHoursDisplay) lightHoursDisplay.textContent = "⚠️ Firebase error";
    if (sunlightHoursDisplay) sunlightHoursDisplay.textContent = "⚠️ Firebase error";
  });

  // ==========================================
  //      SYSTEM ALERTS (TOAST NOTIFICATIONS)
  // ==========================================
  const systemToast = document.getElementById("systemToast");
  const toastMessage = document.getElementById("toastMessage");
  let toastTimeout;

  let prevFan = false;
  let prevPump = false;
  let prevLight = false;
  let isFirstLoad = true;

  // We need to know the current mode for accurate alerts
  let systemMode = "manual";
  modeRef.on("value", snap => {
    systemMode = snap.val() || "manual";
  });

  // The function to trigger the pop-up
  function showToast(message, color) {
    
    if (!systemToast || !toastMessage) return;

    // Change text and border color
    toastMessage.textContent = message;
    systemToast.style.borderLeftColor = color;

    // Slide it down
    systemToast.classList.remove("hidden");

    // Reset the timer if a new alert comes in before the old one hides
    clearTimeout(toastTimeout);

    // Hide it automatically after 5 seconds
    toastTimeout = setTimeout(() => {
      systemToast.classList.add("hidden");
    }, 5000);
  }

  // Listen to fan commands for alerts
  fanCmdRef.on("value", (snap) => {
    const currentFan = !!snap.val();
    if (!isFirstLoad && currentFan === true && prevFan === false) {
      if (systemMode === "auto") showToast("⚠️ INET BOI BAKA NAMAN. Fan ON.", "#e74c3c"); 
      else showToast("👋 Manual Command: Fan turned ON.", "#7f8c8d"); 
    }
    prevFan = currentFan;
    isFirstLoad = false;
  });

  // Listen to pump commands for alerts
  pumpCmdRef.on("value", (snap) => {
    const currentPump = !!snap.val();
    if (!isFirstLoad && currentPump === true && prevPump === false) {
      if (systemMode === "auto") showToast("💧 HOY NAUUHAW NAKO PENGENG TUBIG. Pump ON.", "#3498db"); 
      else showToast("👋 Manual Command: Pump turned ON.", "#7f8c8d"); 
    }
    prevPump = currentPump;
    isFirstLoad = false;
  });

  // Listen to light commands for alerts
  lightCmdRef.on("value", (snap) => {
    const currentLight = !!snap.val();
    if (!isFirstLoad && currentLight === true && prevLight === false) {
      if (systemMode === "auto") showToast("🌙 BROWNOUT AHHHHHHHH!. Grow lights ON.", "#f39c12"); 
      else showToast("👋 Manual Command: Grow lights ON.", "#7f8c8d"); 
    }
    prevLight = currentLight;
    isFirstLoad = false;
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
      let waterCount = entry.water_count !== undefined ? entry.water_count : 0;
      
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
let myChart = null; // We use this to remember the current chart so we can erase it before drawing a new one

if (ctx && datePicker) {
  // 1. Set the Date Picker to Today automatically
  const today = new Date();
  // Format as YYYY-MM-DD (e.g., "2026-03-28")
  const localDate = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
  
  datePicker.value = localDate;

  // 2. Function to load data from Firebase and draw the graph
  function loadGraph(dateKey) {
    const historyRef = firebase.database().ref('history/' + dateKey);
    
    historyRef.once('value', snapshot => {
      const data = snapshot.val();

      // If there is no data for this day, just clear the chart
      if (!data) {
        if (myChart) myChart.destroy();
        return;
      }

      // Arrays to hold our graphed data
      const timeLabels = [];
      const tempData = [];
      const humidData = [];
      const soilData = [];
      const luxData = [];

      // Sort the hours so they read left-to-right (17:00, 18:00, etc.)
      const hours = Object.keys(data).sort();

      hours.forEach(hour => {
        timeLabels.push(hour);
        tempData.push(data[hour].temp || 0);
        humidData.push(data[hour].humid || 0);
        soilData.push(data[hour].soil_avg || 0);
        luxData.push(data[hour].lux || 0);
      });

      // Erase the old chart if one exists (prevents glitching when changing dates)
      if (myChart) {
        myChart.destroy();
      }

      // 3. Draw the new Chart
      myChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            { label: 'Temp (°C)', data: tempData, borderColor: '#e74c3c', backgroundColor: '#e74c3c', tension: 0.3, yAxisID: 'y' },
            { label: 'Humidity (%)', data: humidData, borderColor: '#3498db', backgroundColor: '#3498db', tension: 0.3, yAxisID: 'y' },
            { label: 'Soil Avg (%)', data: soilData, borderColor: '#2ecc71', backgroundColor: '#2ecc71', tension: 0.3, yAxisID: 'y' },
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
              grid: { drawOnChartArea: false }, // Don't draw background lines for this axis to keep it clean
              suggestedMin: 0
            }
          }
        }
      });
    });
  }

  // 4. Initial load for today's data
  loadGraph(localDate);

  // 5. If the user picks a new date, load that data instead!
  datePicker.addEventListener('change', (e) => {
    loadGraph(e.target.value);
  });
}
