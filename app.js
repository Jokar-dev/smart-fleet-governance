
(function () {
  const STORAGE_KEYS = {
    init: "vehify_initialized_v2",
    vehicles: "vehify_vehicles",
    drivers: "vehify_drivers",
    trips: "vehify_trips",
    role: "vehify_role",
    alerts: "vehify_alerts",
    emergencyMode: "vehify_emergency_mode",
    activeDriver: "vehify_active_driver",
    mockExpanded: "vehify_mock_expanded_v1",
    mockBulk100: "vehify_mock_bulk_100_v1"
  };

  const page = document.body.dataset.page || "dashboard";
  const inPagesDir = window.location.pathname.replace(/\\/g, "/").includes("/pages/");
  const state = {
    flash: null,
    leafletMap: null,
    leafletAssetsRequested: false
  };

  const LOCATION_POINTS = {
    "City Hospital": { x: 18, y: 26 },
    "Area A": { x: 28, y: 48 },
    "Area B": { x: 42, y: 32 },
    "Highway": { x: 62, y: 24 },
    "Warehouse": { x: 72, y: 62 },
    "Kolkata Depot": { x: 54, y: 72 },
    "Durgapur Hub": { x: 84, y: 40 },
    "Salt Lake": { x: 46, y: 56 },
    "Howrah": { x: 34, y: 70 }
  };

  const LOCATION_LATLNG = {
    "City Hospital": [22.5726, 88.3639],
    "Area A": [22.6100, 88.3900],
    "Area B": [22.5400, 88.3300],
    "Highway": [22.5200, 88.2800],
    "Warehouse": [22.5600, 88.4100],
    "Kolkata Depot": [22.5850, 88.4200],
    "Durgapur Hub": [23.5200, 87.3200],
    "Salt Lake": [22.5800, 88.4300],
    "Howrah": [22.5958, 88.2636]
  };

  const REQUEST_PREFERENCE = {
    Emergency: ["ambulance", "police", "car", "van"],
    Transport: ["bus", "van", "car", "truck"],
    Logistics: ["truck", "van", "bus", "car"]
  };

  function uid(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  }

  function read(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getRole() {
    return localStorage.getItem(STORAGE_KEYS.role) || "admin";
  }

  function setRole(role) {
    localStorage.setItem(STORAGE_KEYS.role, role);
  }

  function isEmergencyMode() {
    return localStorage.getItem(STORAGE_KEYS.emergencyMode) === "true";
  }

  function setEmergencyMode(flag) {
    localStorage.setItem(STORAGE_KEYS.emergencyMode, flag ? "true" : "false");
  }

  function getVehicles() {
    return read(STORAGE_KEYS.vehicles, []);
  }

  function getDrivers() {
    return read(STORAGE_KEYS.drivers, []);
  }

  function getTrips() {
    return read(STORAGE_KEYS.trips, []);
  }

  function getAlerts() {
    return read(STORAGE_KEYS.alerts, []);
  }

  function setVehicles(rows) {
    write(STORAGE_KEYS.vehicles, rows);
  }

  function setDrivers(rows) {
    write(STORAGE_KEYS.drivers, rows);
  }

  function setTrips(rows) {
    write(STORAGE_KEYS.trips, rows);
  }

  function setAlerts(rows) {
    write(STORAGE_KEYS.alerts, rows);
  }

  function activeDriverId() {
    return localStorage.getItem(STORAGE_KEYS.activeDriver) || "drv_2001";
  }

  function setActiveDriver(id) {
    localStorage.setItem(STORAGE_KEYS.activeDriver, id);
  }

  function toTitle(text) {
    return (text || "").replace(/-/g, " ");
  }

  function pathFor(name) {
    if (name === "home") {
      return homePath();
    }
    return inPagesDir ? name + ".html" : "pages/" + name + ".html";
  }

  function homePath() {
    return inPagesDir ? "../index.html" : "index.html";
  }

  function vehicleLabel(v) {
    return (v.name || v.regNo || "Vehicle") + " (" + (v.regNo || "N/A") + ")";
  }

  function statusBadge(status) {
    return "<span class=\"badge " + status + "\">" + toTitle(status) + "</span>";
  }

  function seedData() {
    if (localStorage.getItem(STORAGE_KEYS.init)) {
      normalizeStoredData();
      ensureMockExpansion();
      ensureBulkMockData();
      ensureEmergencyUnits();
      return;
    }

    const vehicles = [
      {
        id: "veh_1001",
        name: "Ambulance Alpha",
        regNo: "WB06A7823",
        type: "ambulance",
        fuelType: "diesel",
        fuelLevel: 76,
        status: "available",
        healthStatus: "healthy",
        capacity: 4,
        location: "City Hospital",
        lastServiceDate: "2026-01-20"
      },
      {
        id: "veh_1002",
        name: "Truck 3",
        regNo: "WB19C5521",
        type: "truck",
        fuelType: "diesel",
        fuelLevel: 20,
        status: "assigned",
        healthStatus: "service-due",
        capacity: 2,
        location: "Warehouse",
        lastServiceDate: "2025-10-12"
      },
      {
        id: "veh_1003",
        name: "Bus 2",
        regNo: "WB07K1142",
        type: "bus",
        fuelType: "cng",
        fuelLevel: 64,
        status: "available",
        healthStatus: "healthy",
        capacity: 24,
        location: "Area A",
        lastServiceDate: "2025-12-08"
      },
      {
        id: "veh_1004",
        name: "Police Rapid",
        regNo: "WB09P9911",
        type: "police",
        fuelType: "petrol",
        fuelLevel: 52,
        status: "available",
        healthStatus: "healthy",
        capacity: 4,
        location: "Highway",
        lastServiceDate: "2026-02-02"
      },
      {
        id: "veh_1010",
        name: "Fire Brigade One",
        regNo: "WB14F1190",
        type: "fire-brigade",
        fuelType: "diesel",
        fuelLevel: 79,
        status: "available",
        healthStatus: "healthy",
        capacity: 6,
        location: "Area B",
        lastServiceDate: "2026-02-14"
      }
    ];

    const drivers = [
      {
        id: "drv_2001",
        name: "Rohan Das",
        phone: "9876543210",
        licenseNumber: "DL-01-98A1001",
        availability: "available",
        assignedVehicle: "veh_1001"
      },
      {
        id: "drv_2002",
        name: "Anita Roy",
        phone: "9823456701",
        licenseNumber: "DL-09-42C8821",
        availability: "available",
        assignedVehicle: "veh_1003"
      },
      {
        id: "drv_2003",
        name: "Samar Ghosh",
        phone: "9123456780",
        licenseNumber: "DL-11-03T5621",
        availability: "unavailable",
        assignedVehicle: "veh_1002"
      }
    ];

    const trips = [
      {
        id: "trp_3001",
        vehicleId: "veh_1001",
        driverId: "drv_2001",
        origin: "City Hospital",
        destination: "Area B",
        startTime: "2026-03-06T09:30",
        status: "in-progress",
        priority: "high",
        requestType: "Emergency"
      },
      {
        id: "trp_3002",
        vehicleId: "veh_1003",
        driverId: "drv_2002",
        origin: "Area A",
        destination: "Salt Lake",
        startTime: "2026-03-06T10:30",
        status: "scheduled",
        priority: "medium",
        requestType: "Transport"
      },
      {
        id: "trp_3003",
        vehicleId: "veh_1002",
        driverId: "drv_2003",
        origin: "Warehouse",
        destination: "Durgapur Hub",
        startTime: "2026-03-05T06:10",
        status: "completed",
        priority: "low",
        requestType: "Logistics"
      }
    ];

    setVehicles(vehicles);
    setDrivers(drivers);
    setTrips(trips);
    setAlerts([
      { id: uid("alt"), level: "error", message: "Maintenance Required - Truck 3", time: new Date().toISOString() }
    ]);
    setRole("admin");
    setActiveDriver("drv_2001");
    setEmergencyMode(false);
    localStorage.setItem(STORAGE_KEYS.init, "true");
    ensureMockExpansion();
    ensureBulkMockData();
    ensureEmergencyUnits();
  }

  function normalizeStoredData() {
    const vehicleDefaults = {
      name: "Fleet Unit",
      type: "car",
      fuelType: "diesel",
      fuelLevel: 60,
      status: "available",
      healthStatus: "healthy",
      capacity: 4,
      location: "Area A",
      lastServiceDate: "2026-01-01"
    };
    const vehicles = getVehicles().map(function (v, idx) {
      return Object.assign({}, vehicleDefaults, v, {
        id: v.id || uid("veh"),
        regNo: v.regNo || "REG-" + (idx + 1),
        fuelLevel: Number(v.fuelLevel || vehicleDefaults.fuelLevel),
        capacity: Number(v.capacity || vehicleDefaults.capacity)
      });
    });
    setVehicles(vehicles);

    const drivers = getDrivers().map(function (d) {
      return Object.assign(
        {
          availability: "available",
          assignedVehicle: ""
        },
        d,
        { id: d.id || uid("drv") }
      );
    });
    setDrivers(drivers);

    const trips = getTrips().map(function (t) {
      return Object.assign(
        {
          status: "scheduled",
          priority: "medium",
          requestType: "Transport"
        },
        t,
        { id: t.id || uid("trp") }
      );
    });
    setTrips(trips);
  }

  function ensureMockExpansion() {
    if (localStorage.getItem(STORAGE_KEYS.mockExpanded)) {
      return;
    }

    const extraVehicles = [
      {
        id: "veh_1005",
        name: "Logistics Titan",
        regNo: "WB11T3377",
        type: "truck",
        fuelType: "diesel",
        fuelLevel: 68,
        status: "available",
        healthStatus: "healthy",
        capacity: 3,
        location: "Kolkata Depot",
        lastServiceDate: "2026-02-10"
      },
      {
        id: "veh_1006",
        name: "City Van 6",
        regNo: "WB22V1206",
        type: "van",
        fuelType: "diesel",
        fuelLevel: 41,
        status: "available",
        healthStatus: "service-due",
        capacity: 8,
        location: "Area B",
        lastServiceDate: "2025-11-22"
      },
      {
        id: "veh_1007",
        name: "Rapid Bike 1",
        regNo: "WB05B9088",
        type: "bike",
        fuelType: "petrol",
        fuelLevel: 57,
        status: "available",
        healthStatus: "healthy",
        capacity: 1,
        location: "Howrah",
        lastServiceDate: "2026-01-28"
      },
      {
        id: "veh_1008",
        name: "Ambulance Bravo",
        regNo: "WB08A4432",
        type: "ambulance",
        fuelType: "diesel",
        fuelLevel: 84,
        status: "available",
        healthStatus: "healthy",
        capacity: 4,
        location: "City Hospital",
        lastServiceDate: "2026-02-18"
      },
      {
        id: "veh_1009",
        name: "Staff Bus 9",
        regNo: "WB13S7821",
        type: "bus",
        fuelType: "cng",
        fuelLevel: 73,
        status: "assigned",
        healthStatus: "healthy",
        capacity: 30,
        location: "Area A",
        lastServiceDate: "2026-01-30"
      }
    ];

    const extraDrivers = [
      {
        id: "drv_2004",
        name: "Karan Sen",
        phone: "9012365478",
        licenseNumber: "DL-12-77N9001",
        availability: "available",
        assignedVehicle: "veh_1005"
      },
      {
        id: "drv_2005",
        name: "Mita Paul",
        phone: "9034567812",
        licenseNumber: "DL-18-44R6702",
        availability: "available",
        assignedVehicle: "veh_1008"
      },
      {
        id: "drv_2006",
        name: "Arif Khan",
        phone: "9099876611",
        licenseNumber: "DL-22-11X5560",
        availability: "unavailable",
        assignedVehicle: "veh_1009"
      },
      {
        id: "drv_2007",
        name: "Nikhil Dey",
        phone: "9088123456",
        licenseNumber: "DL-04-31P1188",
        availability: "available",
        assignedVehicle: "veh_1006"
      }
    ];

    const extraTrips = [
      {
        id: "trp_3004",
        vehicleId: "veh_1005",
        driverId: "drv_2004",
        origin: "Kolkata Depot",
        destination: "Warehouse",
        startTime: "2026-03-06T12:00",
        status: "scheduled",
        priority: "medium",
        requestType: "Logistics"
      },
      {
        id: "trp_3005",
        vehicleId: "veh_1008",
        driverId: "drv_2005",
        origin: "City Hospital",
        destination: "Area A",
        startTime: "2026-03-06T12:30",
        status: "scheduled",
        priority: "high",
        requestType: "Emergency"
      },
      {
        id: "trp_3006",
        vehicleId: "veh_1009",
        driverId: "drv_2006",
        origin: "Area A",
        destination: "Salt Lake",
        startTime: "2026-03-06T13:15",
        status: "in-progress",
        priority: "low",
        requestType: "Transport"
      },
      {
        id: "trp_3007",
        vehicleId: "veh_1006",
        driverId: "drv_2007",
        origin: "Area B",
        destination: "Howrah",
        startTime: "2026-03-05T15:10",
        status: "completed",
        priority: "medium",
        requestType: "Transport"
      },
      {
        id: "trp_3008",
        vehicleId: "veh_1007",
        driverId: "drv_2001",
        origin: "Howrah",
        destination: "Highway",
        startTime: "2026-03-06T14:00",
        status: "scheduled",
        priority: "high",
        requestType: "Emergency"
      }
    ];

    const currentVehicles = getVehicles();
    const currentDrivers = getDrivers();
    const currentTrips = getTrips();

    const mergedVehicles = currentVehicles.concat(
      extraVehicles.filter(function (v) {
        return !currentVehicles.some(function (x) {
          return x.id === v.id || x.regNo === v.regNo;
        });
      })
    );

    const mergedDrivers = currentDrivers.concat(
      extraDrivers.filter(function (d) {
        return !currentDrivers.some(function (x) {
          return x.id === d.id || x.licenseNumber === d.licenseNumber;
        });
      })
    );

    const allowedVehicleIds = mergedVehicles.map(function (v) { return v.id; });
    const allowedDriverIds = mergedDrivers.map(function (d) { return d.id; });
    const mergedTrips = currentTrips.concat(
      extraTrips.filter(function (t) {
        return (
          !currentTrips.some(function (x) { return x.id === t.id; }) &&
          allowedVehicleIds.includes(t.vehicleId) &&
          allowedDriverIds.includes(t.driverId)
        );
      })
    );

    setVehicles(mergedVehicles);
    setDrivers(mergedDrivers);
    setTrips(mergedTrips);
    localStorage.setItem(STORAGE_KEYS.mockExpanded, "true");
  }

  function ensureBulkMockData() {
    if (localStorage.getItem(STORAGE_KEYS.mockBulk100)) {
      return;
    }

    const targetVehicles = 100;
    const targetDrivers = 100;
    const targetTrips = 100;
    const locations = Object.keys(LOCATION_POINTS);
    const types = ["car", "truck", "van", "bike", "ambulance", "bus", "police", "fire-brigade"];
    const fuelTypes = ["diesel", "petrol", "cng", "electric"];
    const priorities = ["low", "medium", "high"];
    const tasks = ["Transport", "Logistics", "Emergency"];

    const vehicles = getVehicles().slice();
    const drivers = getDrivers().slice();
    const trips = getTrips().slice();

    let nextVehicleNum = vehicles.length + 1;
    while (vehicles.length < targetVehicles) {
      const idx = nextVehicleNum;
      const type = types[idx % types.length];
      const status = idx % 9 === 0 ? "maintenance" : idx % 4 === 0 ? "assigned" : "available";
      const healthStatus =
        status === "maintenance" ? "under-maintenance" : idx % 7 === 0 ? "service-due" : "healthy";
      vehicles.push({
        id: "veh_auto_" + String(idx).padStart(4, "0"),
        name: "Fleet Unit " + idx,
        regNo: "WB" + String(10 + (idx % 80)).padStart(2, "0") + "X" + String(3000 + idx),
        type: type,
        fuelType: fuelTypes[idx % fuelTypes.length],
        fuelLevel: 20 + (idx * 7) % 80,
        status: status,
        healthStatus: healthStatus,
        capacity: type === "bus" ? 30 : type === "truck" ? 3 : type === "van" ? 10 : 4,
        location: locations[idx % locations.length],
        lastServiceDate: "2026-02-" + String(1 + (idx % 27)).padStart(2, "0")
      });
      nextVehicleNum += 1;
    }

    let nextDriverNum = drivers.length + 1;
    while (drivers.length < targetDrivers) {
      const idx = nextDriverNum;
      const assignedVehicle = vehicles[(idx - 1) % vehicles.length].id;
      drivers.push({
        id: "drv_auto_" + String(idx).padStart(4, "0"),
        name: "Driver " + idx,
        phone: "9" + String(100000000 + idx).slice(-9),
        licenseNumber: "DL-AUTO-" + String(10000 + idx),
        availability: idx % 6 === 0 ? "unavailable" : "available",
        assignedVehicle: assignedVehicle
      });
      nextDriverNum += 1;
    }

    let nextTripNum = trips.length + 1;
    while (trips.length < targetTrips) {
      const idx = nextTripNum;
      const vehicle = vehicles[(idx - 1) % vehicles.length];
      const driver = drivers[(idx - 1) % drivers.length];
      const day = String(1 + (idx % 28)).padStart(2, "0");
      const hour = String(6 + (idx % 12)).padStart(2, "0");
      const minute = idx % 2 === 0 ? "00" : "30";
      trips.push({
        id: "trp_auto_" + String(idx).padStart(4, "0"),
        vehicleId: vehicle.id,
        driverId: driver.id,
        origin: locations[idx % locations.length],
        destination: locations[(idx + 3) % locations.length],
        startTime: "2026-03-" + day + "T" + hour + ":" + minute,
        status: idx % 8 === 0 ? "completed" : idx % 5 === 0 ? "in-progress" : "scheduled",
        priority: priorities[idx % priorities.length],
        requestType: tasks[idx % tasks.length]
      });
      nextTripNum += 1;
    }

    setVehicles(vehicles);
    setDrivers(drivers);
    setTrips(trips);
    pushAlert("info", "Bulk mock data generated: 100+ records ready.");
    localStorage.setItem(STORAGE_KEYS.mockBulk100, "true");
  }

  function ensureEmergencyUnits() {
    const vehicles = getVehicles();
    const hasFireUnit = vehicles.some(function (v) {
      return v.type === "fire-brigade";
    });
    if (hasFireUnit) return;
    vehicles.push({
      id: "veh_fire_9001",
      name: "Fire Brigade One",
      regNo: "WB14F1190",
      type: "fire-brigade",
      fuelType: "diesel",
      fuelLevel: 82,
      status: "available",
      healthStatus: "healthy",
      capacity: 6,
      location: "Area B",
      lastServiceDate: "2026-02-14"
    });
    setVehicles(vehicles);
  }

  function pushAlert(level, message) {
    const alerts = getAlerts();
    alerts.unshift({
      id: uid("alt"),
      level: level,
      message: message,
      time: new Date().toISOString()
    });
    setAlerts(alerts.slice(0, 20));
  }

  function distanceScore(from, to) {
    const p1 = LOCATION_POINTS[from] || { x: 50, y: 50 };
    const p2 = LOCATION_POINTS[to] || { x: 50, y: 50 };
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function vehicleById(id) {
    return getVehicles().find(function (v) {
      return v.id === id;
    });
  }

  function driverById(id) {
    return getDrivers().find(function (d) {
      return d.id === id;
    });
  }

  function vehicleAvailable(vehicleId, editingTripId) {
    const vehicle = vehicleById(vehicleId);
    if (!vehicle || vehicle.status !== "available" || vehicle.healthStatus === "under-maintenance") {
      return false;
    }
    return !getTrips().some(function (trip) {
      if (editingTripId && trip.id === editingTripId) {
        return false;
      }
      return trip.vehicleId === vehicleId && (trip.status === "scheduled" || trip.status === "in-progress");
    });
  }

  function driverAvailable(driverId, editingTripId) {
    const driver = driverById(driverId);
    if (!driver || driver.availability !== "available") {
      return false;
    }
    return !getTrips().some(function (trip) {
      if (editingTripId && trip.id === editingTripId) {
        return false;
      }
      return trip.driverId === driverId && (trip.status === "scheduled" || trip.status === "in-progress");
    });
  }

  function bestDriverForVehicle(vehicleId) {
    const drivers = getDrivers().filter(function (d) {
      return d.availability === "available";
    });
    const assigned = drivers.find(function (d) {
      return d.assignedVehicle === vehicleId && driverAvailable(d.id);
    });
    return assigned || drivers.find(function (d) { return driverAvailable(d.id); }) || null;
  }

  function smartAssign(requestType, location, passengers, priority, emergencyKind) {
    let pref = REQUEST_PREFERENCE[requestType] || [];
    if (requestType === "Emergency") {
      if (emergencyKind === "Fire") {
        pref = ["fire-brigade", "truck", "police", "ambulance"];
      } else if (emergencyKind === "Accident" || emergencyKind === "Medical") {
        pref = ["ambulance", "police", "car", "van"];
      } else if (emergencyKind === "Security") {
        pref = ["police", "ambulance", "car", "van"];
      }
    }
    const emergencyBoost = isEmergencyMode() ? 25 : 0;
    const priorityWeight = priority === "high" ? 22 : priority === "medium" ? 12 : 6;
    const candidates = getVehicles().filter(function (v) {
      return v.status === "available" && v.healthStatus !== "under-maintenance";
    });

    if (!candidates.length) {
      return { vehicle: null, reason: "No available vehicles." };
    }

    let best = null;
    candidates.forEach(function (v) {
      const prefIndex = pref.indexOf(v.type);
      const typeScore = prefIndex === -1 ? 2 : 18 - prefIndex * 4;
      const fuelScore = Math.max(0, Math.min(20, Math.round(v.fuelLevel / 5)));
      const capacityScore = Number(v.capacity) >= Number(passengers) ? 20 : -15;
      const dist = distanceScore(v.location, location);
      const distanceWeight = Math.max(0, 20 - Math.round(dist / 2));
      const emergencyType = (v.type === "ambulance" || v.type === "police" || v.type === "fire-brigade") ? 12 : 0;
      const total = priorityWeight + typeScore + fuelScore + capacityScore + distanceWeight + emergencyType + emergencyBoost;
      const reason =
        "priority " +
        priority +
        ", type " +
        v.type +
        (requestType === "Emergency" && emergencyKind ? ", emergency kind " + emergencyKind : "") +
        ", fuel " +
        v.fuelLevel +
        "%, distance score " +
        distanceWeight;
      if (!best || total > best.score) {
        best = { vehicle: v, score: total, reason: reason };
      }
    });
    return best;
  }

  function setFlash(text, kind) {
    state.flash = { text: text, kind: kind || "info" };
  }

  function navItems() {
    const role = getRole();
    const all = [
      ["home", "Home"],
      ["dashboard", "Dashboard"],
      ["vehicles", "Vehicles"],
      ["drivers", "Drivers"],
      ["trips", "Trips"],
      ["maintenance", "Maintenance"],
      ["reports", "Reports"]
    ];
    if (role === "driver") {
      return all.filter(function (item) {
        return item[0] === "home" || item[0] === "dashboard" || item[0] === "trips";
      });
    }
    if (role === "fleet-manager") {
      return all.filter(function (item) {
        return item[0] !== "drivers";
      });
    }
    return all;
  }

  function canAccess(currentPage) {
    const role = getRole();
    if (role === "admin") {
      return true;
    }
    if (role === "fleet-manager" && currentPage === "drivers") {
      return false;
    }
    if (role === "driver") {
      return currentPage === "dashboard" || currentPage === "trips";
    }
    return true;
  }

  function baseLayout() {
    const role = getRole();
    const navIcon = {
      home: "⌂",
      dashboard: "▦",
      vehicles: "▣",
      drivers: "◉",
      trips: "↦",
      maintenance: "⚙",
      reports: "◫"
    };
    const nav = navItems()
      .map(function (item) {
        return (
          "<a class=\"nav-link " +
          (page === item[0] ? "active" : "") +
          "\" href=\"" +
          pathFor(item[0]) +
          "\"><span class=\"nav-ico\">" +
          (navIcon[item[0]] || "•") +
          "</span><span class=\"nav-txt\">" +
          item[1] +
          "</span></a>"
        );
      })
      .join("");

    return (
      "<div class=\"app-shell\">" +
      "<aside class=\"sidebar\">" +
      "<a class=\"brand\" href=\"" +
      homePath() +
      "\"><span class=\"brand-mark\">V</span><span>VehiFy</span></a>" +
      "<div class=\"nav-links\">" +
      nav +
      "</div>" +
      "</aside>" +
      "<div class=\"main-shell\">" +
      "<header class=\"topbar\">" +
      "<div><div class=\"topbar-title\">Fleet Governance & Scheduling System</div><div class=\"topbar-subtitle\">Smart command center</div></div>" +
      "<div class=\"topbar-tools\">" +
      "<select id=\"rolePicker\"><option value=\"admin\" " +
      (role === "admin" ? "selected" : "") +
      ">Admin</option><option value=\"fleet-manager\" " +
      (role === "fleet-manager" ? "selected" : "") +
      ">Fleet Manager</option><option value=\"driver\" " +
      (role === "driver" ? "selected" : "") +
      ">Driver</option></select>" +
      "<span class=\"mode-pill " +
      (isEmergencyMode() ? "mode-live" : "") +
      "\">" +
      (isEmergencyMode() ? "Emergency Mode" : "Normal Mode") +
      "</span>" +
      "</div>" +
      "</header>" +
      "<main id=\"page-content\" class=\"page\"></main>" +
      "</div>" +
      "</div>"
    );
  }

  function pageHeader(title, sub) {
    let flash = "";
    if (state.flash) {
      flash = "<div class=\"flash " + state.flash.kind + "\">" + state.flash.text + "</div>";
      state.flash = null;
    }
    return "<section class=\"page-header\"><h1>" + title + "</h1><p>" + sub + "</p></section>" + flash;
  }
  function dashboardTemplate() {
    return (
      pageHeader("Dashboard", "Operational view with intelligence, map, alerts, and override controls") +
      "<section class=\"grid-cards\">" +
      "<article class=\"card glow\"><div class=\"card-label\">Total Vehicles</div><div id=\"kpiTotalVehicles\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">Available Vehicles</div><div id=\"kpiAvailableVehicles\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">In Maintenance</div><div id=\"kpiMaintenanceVehicles\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">Scheduled Trips</div><div id=\"kpiScheduledTrips\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">Fleet Efficiency Score</div><div id=\"kpiEfficiency\" class=\"card-value\">0%</div></article>" +
      "</section>" +
      "<section class=\"report-grid\">" +
      "<article class=\"panel glass\"><h2>Request Vehicle</h2>" +
      "<form id=\"requestForm\" class=\"form-grid columns-2\">" +
      "<div class=\"field\"><label>Request Type</label><select id=\"rqType\"><option>Emergency</option><option>Transport</option><option>Logistics</option></select></div>" +
      "<div class=\"field\"><label>Emergency Kind</label><select id=\"rqEmergencyKind\"><option>Accident</option><option>Fire</option><option>Medical</option><option>Security</option><option>General</option></select></div>" +
      "<div class=\"field\"><label>Location</label><select id=\"rqLocation\"></select></div>" +
      "<div class=\"field\"><label>Passengers</label><input id=\"rqPassengers\" type=\"number\" min=\"1\" value=\"2\" required /></div>" +
      "<div class=\"field\"><label>Priority</label><select id=\"rqPriority\"><option value=\"high\">High</option><option value=\"medium\">Medium</option><option value=\"low\">Low</option></select></div>" +
      "<div class=\"btn-row\" style=\"grid-column:1/-1;\"><button class=\"btn-primary\" type=\"submit\">Auto Assign</button></div>" +
      "</form><div id=\"assignmentResult\" class=\"result-box\">No assignment yet.</div></article>" +
      "<article class=\"panel glass\"><h2>Fleet Intelligence</h2><ul id=\"intelList\" class=\"alert-list\"></ul></article>" +
      "<article class=\"panel glass\"><h2>Smart Alerts</h2><ul id=\"alertsList\" class=\"alert-list\"></ul></article>" +
      "<article class=\"panel glass\"><h2>Emergency Override</h2><button id=\"emergencyBtn\" class=\"btn-danger emergency-btn\">Activate Emergency Mode</button><p class=\"subtle\">Prioritizes emergency response, cancels low-priority schedules, dispatches nearest unit.</p></article>" +
      "</section>" +
      "<section class=\"panel glass\" style=\"margin-top:14px;\"><h2>Fleet Map</h2><div id=\"fleetMap\" class=\"fleet-map\"></div></section>" +
      "<section class=\"panel glass\" style=\"margin-top:14px;\"><h2>Scheduling Timeline</h2><div class=\"table-wrap\"><table><thead><tr><th>Time</th><th>Vehicle</th><th>Task</th><th>Status</th><th>Priority</th></tr></thead><tbody id=\"timelineTable\"></tbody></table></div></section>"
    );
  }

  function homeTemplate() {
    return (
      "<section class=\"home-hero\">" +
      "<div class=\"home-glow home-glow-a\"></div>" +
      "<div class=\"home-glow home-glow-b\"></div>" +
      "<div class=\"home-card\">" +
      "<div class=\"home-brand\"><span class=\"brand-mark\">V</span><span>VehiFy</span></div>" +
      "<h1>Fleet Governance & Scheduling System</h1>" +
      "<p class=\"home-tagline\">&bull; Be Basic Be Perfect &bull;</p>" +
      "<p class=\"home-copy\">Smart assignment, emergency control, live alerts, map intelligence, and analytics in one command center.</p>" +
      "<div class=\"home-cta-row\"><a class=\"btn-primary home-cta\" href=\"" +
      pathFor("dashboard") +
      "\">Enter Dashboard</a><a class=\"btn-secondary home-cta\" href=\"" +
      pathFor("reports") +
      "\">View Reports</a></div>" +
      "<div class=\"home-stats\"><div class=\"home-stat\"><span id=\"homeTotalVehicles\">0</span><small>Vehicles</small></div><div class=\"home-stat\"><span id=\"homeTrips\">0</span><small>Trips</small></div><div class=\"home-stat\"><span id=\"homeEfficiency\">0%</span><small>Efficiency</small></div></div>" +
      "</div>" +
      "</section>"
    );
  }

  function vehiclesTemplate() {
    return (
      pageHeader("Vehicle Management", "Manage fleet inventory and readiness") +
      "<section class=\"layout-two\">" +
      "<article class=\"panel glass\"><h2 id=\"vehicleFormTitle\">Add Vehicle</h2><form id=\"vehicleForm\" class=\"form-grid columns-2\">" +
      "<input type=\"hidden\" id=\"vehicleId\" />" +
      "<div class=\"field\"><label>Name</label><input id=\"vehName\" required /></div>" +
      "<div class=\"field\"><label>Registration Number</label><input id=\"regNo\" required /></div>" +
      "<div class=\"field\"><label>Vehicle Type</label><select id=\"vehicleType\"><option>car</option><option>truck</option><option>van</option><option>bike</option><option>ambulance</option><option>bus</option><option>police</option><option>fire-brigade</option></select></div>" +
      "<div class=\"field\"><label>Fuel Type</label><select id=\"fuelType\"><option>petrol</option><option>diesel</option><option>electric</option><option>cng</option></select></div>" +
      "<div class=\"field\"><label>Fuel Level (%)</label><input id=\"fuelLevel\" type=\"number\" min=\"0\" max=\"100\" value=\"60\" /></div>" +
      "<div class=\"field\"><label>Status</label><select id=\"vehicleStatus\"><option>available</option><option>assigned</option><option>maintenance</option></select></div>" +
      "<div class=\"field\"><label>Maintenance State</label><select id=\"vehicleHealth\"><option>healthy</option><option>service-due</option><option>under-maintenance</option></select></div>" +
      "<div class=\"field\"><label>Capacity</label><input id=\"vehCapacity\" type=\"number\" min=\"1\" value=\"4\" /></div>" +
      "<div class=\"field\"><label>Location</label><select id=\"vehLocation\"></select></div>" +
      "<div class=\"field\"><label>Last Service Date</label><input id=\"lastServiceDate\" type=\"date\" required /></div>" +
      "<div class=\"btn-row\" style=\"grid-column:1/-1;\"><button class=\"btn-primary\" type=\"submit\">Save Vehicle</button><button class=\"btn-secondary\" type=\"button\" id=\"vehicleReset\">Clear</button></div>" +
      "</form></article>" +
      "<article class=\"panel glass\"><h2>Vehicle List</h2><div class=\"table-wrap\"><table><thead><tr><th>Name</th><th>Reg No</th><th>Type</th><th>Fuel</th><th>Location</th><th>Status</th><th>Health</th><th>Actions</th></tr></thead><tbody id=\"vehicleTable\"></tbody></table></div></article>" +
      "</section>"
    );
  }

  function driversTemplate() {
    return (
      pageHeader("Driver Management", "Govern driver availability and assignment") +
      "<section class=\"layout-two\">" +
      "<article class=\"panel glass\"><h2 id=\"driverFormTitle\">Add Driver</h2><form id=\"driverForm\" class=\"form-grid\">" +
      "<input type=\"hidden\" id=\"driverId\" />" +
      "<div class=\"field\"><label>Name</label><input id=\"driverName\" required /></div>" +
      "<div class=\"field\"><label>Phone</label><input id=\"driverPhone\" required /></div>" +
      "<div class=\"field\"><label>License Number</label><input id=\"licenseNo\" required /></div>" +
      "<div class=\"field\"><label>Availability</label><select id=\"driverAvailability\"><option>available</option><option>unavailable</option></select></div>" +
      "<div class=\"field\"><label>Assigned Vehicle</label><select id=\"assignedVehicle\"></select></div>" +
      "<div class=\"btn-row\"><button class=\"btn-primary\" type=\"submit\">Save Driver</button><button class=\"btn-secondary\" type=\"button\" id=\"driverReset\">Clear</button></div>" +
      "</form></article>" +
      "<article class=\"panel glass\"><h2>Driver List</h2><div class=\"table-wrap\"><table><thead><tr><th>Name</th><th>Phone</th><th>License</th><th>Availability</th><th>Vehicle</th><th>Actions</th></tr></thead><tbody id=\"driverTable\"></tbody></table></div></article>" +
      "</section>"
    );
  }

  function tripsTemplate() {
    return (
      pageHeader("Trip Scheduling", "Smart schedule coordination with availability checks") +
      "<section class=\"layout-two\">" +
      "<article class=\"panel glass\"><h2 id=\"tripFormTitle\">Schedule Trip</h2><form id=\"tripForm\" class=\"form-grid columns-2\">" +
      "<input type=\"hidden\" id=\"tripId\" />" +
      "<div class=\"field\"><label>Vehicle</label><select id=\"tripVehicle\"></select></div>" +
      "<div class=\"field\"><label>Driver</label><select id=\"tripDriver\"></select></div>" +
      "<div class=\"field\"><label>Origin</label><select id=\"tripOrigin\"></select></div>" +
      "<div class=\"field\"><label>Destination</label><select id=\"tripDestination\"></select></div>" +
      "<div class=\"field\"><label>Start Time</label><input id=\"tripStartTime\" type=\"datetime-local\" required /></div>" +
      "<div class=\"field\"><label>Status</label><select id=\"tripStatus\"><option>scheduled</option><option>in-progress</option><option>completed</option><option>cancelled</option></select></div>" +
      "<div class=\"field\"><label>Priority</label><select id=\"tripPriority\"><option value=\"high\">high</option><option value=\"medium\">medium</option><option value=\"low\">low</option></select></div>" +
      "<div class=\"field\"><label>Task Type</label><select id=\"tripTaskType\"><option>Emergency</option><option>Transport</option><option>Logistics</option></select></div>" +
      "<div class=\"btn-row\" style=\"grid-column:1/-1;\"><button class=\"btn-primary\" type=\"submit\">Save Trip</button><button class=\"btn-secondary\" type=\"button\" id=\"tripReset\">Clear</button></div>" +
      "</form></article>" +
      "<article class=\"panel glass\"><h2>Trip List</h2><div class=\"table-wrap\"><table><thead><tr><th>Vehicle</th><th>Driver</th><th>Task</th><th>Route</th><th>Time</th><th>Status</th><th>Priority</th><th>Actions</th></tr></thead><tbody id=\"tripTable\"></tbody></table></div></article>" +
      "</section>"
    );
  }

  function maintenanceTemplate() {
    return (
      pageHeader("Maintenance Tracking", "Health updates and preventive alerts") +
      "<section class=\"panel glass\"><h2>Service Alerts</h2><ul id=\"serviceAlerts\" class=\"alert-list\"></ul></section>" +
      "<section class=\"panel glass\" style=\"margin-top:14px;\"><h2>Maintenance Matrix</h2><div class=\"table-wrap\"><table><thead><tr><th>Vehicle</th><th>Health</th><th>Status</th><th>Last Service</th><th>Fuel</th><th>Update</th><th>Actions</th></tr></thead><tbody id=\"maintenanceTable\"></tbody></table></div></section>"
    );
  }

  function reportsTemplate() {
    return (
      pageHeader("Reports", "Fleet analytics and operational intelligence") +
      "<section class=\"grid-cards\">" +
      "<article class=\"card glow\"><div class=\"card-label\">Total Trips Completed</div><div id=\"reportTripsCompleted\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">Vehicle Usage Records</div><div id=\"reportVehicleUsageCount\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">Maintenance Frequency</div><div id=\"reportMaintenanceCount\" class=\"card-value\">0</div></article>" +
      "<article class=\"card glow\"><div class=\"card-label\">Fleet Efficiency Score</div><div id=\"reportEfficiency\" class=\"card-value\">0%</div></article>" +
      "</section>" +
      "<section class=\"report-grid\">" +
      "<article class=\"panel glass\"><h2>Vehicle Usage (Bar)</h2><canvas id=\"usageCanvas\" class=\"chart-canvas\"></canvas></article>" +
      "<article class=\"panel glass\"><h2>Fuel Distribution (Pie)</h2><canvas id=\"fuelCanvas\" class=\"chart-canvas\"></canvas></article>" +
      "<article class=\"panel glass\"><h2>Vehicle Status (Bar)</h2><canvas id=\"statusCanvas\" class=\"chart-canvas\"></canvas></article>" +
      "</section>"
    );
  }

  function accessDeniedTemplate() {
    return (
      pageHeader("Restricted", "Role-based access control is active.") +
      "<section class=\"panel glass\"><h2>Access Limited</h2><p>Your current role does not have permission to access this module.</p></section>"
    );
  }

  function renderLayout() {
    if (page === "home") {
      document.getElementById("app").innerHTML = homeTemplate();
      return;
    }
    document.getElementById("app").innerHTML = baseLayout();
    const root = document.getElementById("page-content");
    if (!canAccess(page)) {
      root.innerHTML = accessDeniedTemplate();
      return;
    }
    const map = {
      dashboard: dashboardTemplate,
      vehicles: vehiclesTemplate,
      drivers: driversTemplate,
      trips: tripsTemplate,
      maintenance: maintenanceTemplate,
      reports: reportsTemplate
    };
    root.innerHTML = (map[page] || dashboardTemplate)();
  }

  function setupHomePage() {
    animatedCount(document.getElementById("homeTotalVehicles"), getVehicles().length);
    animatedCount(document.getElementById("homeTrips"), getTrips().length);
    animatedCount(document.getElementById("homeEfficiency"), computeEfficiencyScore(), "%");
  }

  function animatedCount(el, value, suffix) {
    if (!el) return;
    const steps = 20;
    const to = Number(value || 0);
    let n = 0;
    const inc = to / steps;
    const timer = setInterval(function () {
      n += inc;
      if (n >= to) {
        n = to;
        clearInterval(timer);
      }
      el.textContent = Math.round(n) + (suffix || "");
    }, 18);
  }

  function availableLocationsOptions(selected) {
    return Object.keys(LOCATION_POINTS)
      .map(function (loc) {
        return "<option " + (loc === selected ? "selected" : "") + ">" + loc + "</option>";
      })
      .join("");
  }
  function renderDashboard() {
    const vehicles = getVehicles();
    const trips = getTrips();
    const inMaintenance = vehicles.filter(function (v) {
      return v.healthStatus === "under-maintenance" || v.status === "maintenance";
    }).length;
    const scheduledTrips = trips.filter(function (t) {
      return t.status === "scheduled";
    }).length;

    animatedCount(document.getElementById("kpiTotalVehicles"), vehicles.length);
    animatedCount(
      document.getElementById("kpiAvailableVehicles"),
      vehicles.filter(function (v) {
        return v.status === "available";
      }).length
    );
    animatedCount(document.getElementById("kpiMaintenanceVehicles"), inMaintenance);
    animatedCount(document.getElementById("kpiScheduledTrips"), scheduledTrips);
    animatedCount(document.getElementById("kpiEfficiency"), computeEfficiencyScore(), "%");

    const locSelect = document.getElementById("rqLocation");
    locSelect.innerHTML = availableLocationsOptions("Area A");
    const rqTypeEl = document.getElementById("rqType");
    const rqEmergencyKindEl = document.getElementById("rqEmergencyKind");
    function toggleEmergencyKind() {
      const isEmergency = rqTypeEl.value === "Emergency";
      rqEmergencyKindEl.disabled = !isEmergency;
      rqEmergencyKindEl.parentElement.style.opacity = isEmergency ? "1" : "0.55";
    }
    rqTypeEl.addEventListener("change", toggleEmergencyKind);
    toggleEmergencyKind();

    renderIntelligence();
    renderAlerts();
    renderMap();
    renderTimeline();

    const emergencyBtn = document.getElementById("emergencyBtn");
    emergencyBtn.textContent = isEmergencyMode() ? "Deactivate Emergency Mode" : "Activate Emergency Mode";
    emergencyBtn.addEventListener("click", function () {
      triggerEmergencyOverride();
    });

    document.getElementById("requestForm").addEventListener("submit", function (event) {
      event.preventDefault();
      const requestType = document.getElementById("rqType").value;
      const emergencyKind = document.getElementById("rqEmergencyKind").value;
      const location = document.getElementById("rqLocation").value;
      const passengers = Number(document.getElementById("rqPassengers").value || 1);
      const priority = document.getElementById("rqPriority").value;

      const assigned = smartAssign(requestType, location, passengers, priority, emergencyKind);
      const out = document.getElementById("assignmentResult");
      if (!assigned || !assigned.vehicle) {
        out.textContent = "No suitable vehicle found.";
        pushAlert("error", "No vehicle available for " + requestType + " at " + location);
        renderAlerts();
        return;
      }

      const driver = bestDriverForVehicle(assigned.vehicle.id);
      if (!driver) {
        out.textContent = "Vehicle found but no available driver.";
        pushAlert("warn", "Driver unavailable for " + vehicleLabel(assigned.vehicle));
        renderAlerts();
        return;
      }

      const trips = getTrips();
      trips.push({
        id: uid("trp"),
        vehicleId: assigned.vehicle.id,
        driverId: driver.id,
        origin: location,
        destination: "Command Center",
        startTime: new Date(Date.now() + 10 * 60000).toISOString().slice(0, 16),
        status: "scheduled",
        priority: priority,
        requestType: requestType === "Emergency" ? "Emergency - " + emergencyKind : requestType
      });
      setTrips(trips);

      out.innerHTML =
        "Assigned Vehicle: <strong>" +
        assigned.vehicle.name +
        "</strong><br>Driver: <strong>" +
        driver.name +
        "</strong><br>Reason: " +
        assigned.reason;
      pushAlert("info", "Auto-dispatched " + assigned.vehicle.name + " for " + (requestType === "Emergency" ? emergencyKind + " emergency" : requestType + " request") + ".");
      renderTimeline();
      renderAlerts();
      renderIntelligence();
    });
  }

  function renderIntelligence() {
    const list = document.getElementById("intelList");
    if (!list) return;
    const vehicles = getVehicles();
    const trips = getTrips();
    const today = new Date().toISOString().slice(0, 10);
    const insights = [];

    vehicles
      .filter(function (v) {
        return Number(v.fuelLevel) <= 25;
      })
      .forEach(function (v) {
        insights.push(v.name + " fuel low (" + v.fuelLevel + "%)");
      });

    vehicles.forEach(function (v) {
      const useCount = trips.filter(function (t) {
        return t.vehicleId === v.id && t.startTime.slice(0, 10) === today;
      }).length;
      if (useCount >= 2) {
        insights.push(v.name + " heavily used today.");
      }
    });

    const rec = smartAssign("Transport", "Area A", 6, "medium");
    if (rec && rec.vehicle) {
      insights.push(rec.vehicle.name + " recommended for next transport task.");
    }

    list.innerHTML = insights.map(function (m) { return "<li>" + m + "</li>"; }).join("") || "<li>No anomalies detected.</li>";
  }

  function deriveSystemAlerts() {
    const alerts = [];
    getVehicles().forEach(function (v) {
      if (Number(v.fuelLevel) <= 25) {
        alerts.push("Low Fuel - " + v.name);
      }
      if (v.healthStatus === "service-due" || v.healthStatus === "under-maintenance") {
        alerts.push("Maintenance Required - " + v.name);
      }
    });
    if (isEmergencyMode()) {
      alerts.push("Emergency Mode Active");
    }
    return alerts;
  }

  function renderAlerts() {
    const node = document.getElementById("alertsList");
    if (!node) return;
    const manual = getAlerts().map(function (a) {
      return a.message;
    });
    const merged = deriveSystemAlerts().concat(manual).slice(0, 8);
    node.innerHTML = merged.map(function (m) { return "<li>" + m + "</li>"; }).join("") || "<li>No active alerts.</li>";
  }

  function markerEmoji(type) {
    const map = {
      ambulance: "AMB",
      police: "POL",
      "fire-brigade": "FIR",
      truck: "TRK",
      bus: "BUS",
      van: "VAN",
      car: "CAR",
      bike: "BIK"
    };
    return map[type] || "VEH";
  }

  function ensureLeafletAssets(onReady) {
    if (window.L) {
      onReady();
      return;
    }
    if (state.leafletAssetsRequested) {
      return;
    }
    state.leafletAssetsRequested = true;

    const cssId = "leaflet-css-cdn";
    const jsId = "leaflet-js-cdn";

    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    if (!document.getElementById(jsId)) {
      const script = document.createElement("script");
      script.id = jsId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = function () {
        state.leafletAssetsRequested = false;
        onReady();
      };
      script.onerror = function () {
        state.leafletAssetsRequested = false;
        const container = document.getElementById("fleetMap");
        if (container) {
          container.innerHTML = "<div class=\"map-error\">Leaflet failed to load. Check internet access.</div>";
        }
      };
      document.head.appendChild(script);
    }
  }

  function renderMap() {
    const container = document.getElementById("fleetMap");
    if (!container) return;

    if (!window.L) {
      container.innerHTML = "<div class=\"map-loading\">Loading map...</div>";
      ensureLeafletAssets(renderMap);
      return;
    }

    if (state.leafletMap) {
      state.leafletMap.remove();
      state.leafletMap = null;
    }

    const L = window.L;
    const map = L.map(container, { zoomControl: true, preferCanvas: true }).setView([22.5726, 88.3639], 10);
    state.leafletMap = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    async function getNearbyPlaces(lat, lon, type) {

    let query = "";

    if (type === "petrol") {
        query = `
        [out:json];
        node
          ["amenity"="fuel"]
          (around:5000, ${lat}, ${lon});
        out;
        `;
    }

    if (type === "restaurant") {
        query = `
        [out:json];
        node
          ["amenity"="restaurant"]
          (around:5000, ${lat}, ${lon});
        out;
        `;
    }

    const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
            method: "POST",
            body: query
        }
    );

    const data = await response.json();

    return data.elements;
}

async function showNearbyPlaces(lat, lon, type) {

    const places = await getNearbyPlaces(lat, lon, type);

    places.forEach(place => {

        const marker = L.marker([place.lat, place.lon])
            .addTo(map);

        marker.bindPopup(`
            <b>${place.tags.name || "Unknown"}</b><br>
            ${type}
        `);
    });
}
    
    const bounds = [];
    getVehicles().forEach(function (v) {
      const latlng = LOCATION_LATLNG[v.location] || [22.5726, 88.3639];
      bounds.push(latlng);

      const icon = L.divIcon({
        className: "vehify-map-icon",
        html: "<span>" + markerEmoji(v.type) + "</span>",
        iconSize: [42, 24],
        iconAnchor: [21, 12]
      });

      const popup =
        "<strong>" +
        v.name +
        "</strong><br/>Location: " +
        v.location +
        "<br/>Type: " +
        v.type +
        "<br/>Status: " +
        v.status +
        "<br/>Fuel: " +
        v.fuelLevel +
        "%";

      L.marker(latlng, { icon: icon }).addTo(map).bindPopup(popup);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [24, 24] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 11);
    }
  }

  function renderTimeline() {
    const body = document.getElementById("timelineTable");
    if (!body) return;
    const rows = getTrips()
      .slice()
      .sort(function (a, b) {
        return new Date(a.startTime) - new Date(b.startTime);
      })
      .slice(0, 10)
      .map(function (t) {
        const v = vehicleById(t.vehicleId);
        return (
          "<tr><td>" +
          new Date(t.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
          "</td><td>" +
          (v ? v.name : "Unknown") +
          "</td><td>" +
          t.requestType +
          "</td><td>" +
          statusBadge(t.status) +
          "</td><td>" +
          statusBadge(t.priority || "medium") +
          "</td></tr>"
        );
      })
      .join("");
    body.innerHTML = rows || "<tr><td colspan=\"5\">No schedules available</td></tr>";
  }

  function triggerEmergencyOverride() {
    const nextMode = !isEmergencyMode();
    setEmergencyMode(nextMode);

    if (nextMode) {
      const trips = getTrips().map(function (t) {
        if (t.status === "scheduled" && (t.priority === "low" || t.priority === "medium")) {
          return Object.assign({}, t, { status: "cancelled" });
        }
        return t;
      });
      setTrips(trips);

      const auto = smartAssign("Emergency", "City Hospital", 1, "high");
      if (auto && auto.vehicle) {
        const driver = bestDriverForVehicle(auto.vehicle.id);
        if (driver) {
          const current = getTrips();
          current.push({
            id: uid("trp"),
            vehicleId: auto.vehicle.id,
            driverId: driver.id,
            origin: "City Hospital",
            destination: "Highway",
            startTime: new Date().toISOString().slice(0, 16),
            status: "in-progress",
            priority: "high",
            requestType: "Emergency"
          });
          setTrips(current);
          pushAlert("error", "Emergency vehicle dispatched: " + auto.vehicle.name);
        }
      }
      setFlash("Emergency Mode activated. Low and medium priority schedules were cancelled.", "error");
    } else {
      setFlash("Emergency Mode deactivated. System back to normal governance.", "success");
      pushAlert("info", "Emergency mode cleared.");
    }
    renderPage();
  }

  function vehicleOptions(selectedId, includeAll) {
    return getVehicles()
      .filter(function (v) {
        return includeAll || (v.status === "available" && v.healthStatus !== "under-maintenance");
      })
      .map(function (v) {
        return "<option value=\"" + v.id + "\" " + (v.id === selectedId ? "selected" : "") + ">" + vehicleLabel(v) + "</option>";
      })
      .join("");
  }

  function driverOptions(selectedId, includeAll) {
    return getDrivers()
      .filter(function (d) {
        return includeAll || d.availability === "available";
      })
      .map(function (d) {
        return "<option value=\"" + d.id + "\" " + (d.id === selectedId ? "selected" : "") + ">" + d.name + "</option>";
      })
      .join("");
  }

  function setupVehiclesPage() {
    document.getElementById("vehLocation").innerHTML = availableLocationsOptions("Area A");
    renderVehicleTable();

    document.getElementById("vehicleReset").addEventListener("click", function () {
      document.getElementById("vehicleForm").reset();
      document.getElementById("vehicleId").value = "";
      document.getElementById("vehicleFormTitle").textContent = "Add Vehicle";
      document.getElementById("vehLocation").innerHTML = availableLocationsOptions("Area A");
    });

    document.getElementById("vehicleForm").addEventListener("submit", function (event) {
      event.preventDefault();
      const id = document.getElementById("vehicleId").value;
      const payload = {
        id: id || uid("veh"),
        name: document.getElementById("vehName").value.trim(),
        regNo: document.getElementById("regNo").value.trim().toUpperCase(),
        type: document.getElementById("vehicleType").value,
        fuelType: document.getElementById("fuelType").value,
        fuelLevel: Number(document.getElementById("fuelLevel").value || 0),
        status: document.getElementById("vehicleStatus").value,
        healthStatus: document.getElementById("vehicleHealth").value,
        capacity: Number(document.getElementById("vehCapacity").value || 1),
        location: document.getElementById("vehLocation").value,
        lastServiceDate: document.getElementById("lastServiceDate").value
      };

      if (payload.healthStatus === "under-maintenance") {
        payload.status = "maintenance";
      }

      const vehicles = getVehicles();
      const dup = vehicles.some(function (v) {
        return v.regNo === payload.regNo && v.id !== payload.id;
      });
      if (dup) {
        setFlash("Registration number already exists.", "error");
        renderPage();
        return;
      }

      const next = id
        ? vehicles.map(function (v) {
            return v.id === id ? payload : v;
          })
        : vehicles.concat(payload);
      setVehicles(next);
      pushAlert("info", "Vehicle record updated: " + payload.name);
      setFlash("Vehicle saved successfully.", "success");
      renderPage();
    });

    document.getElementById("vehicleTable").addEventListener("click", function (event) {
      const target = event.target;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      const vehicles = getVehicles();
      const row = vehicles.find(function (v) { return v.id === id; });

      if (action === "edit" && row) {
        document.getElementById("vehicleId").value = row.id;
        document.getElementById("vehName").value = row.name;
        document.getElementById("regNo").value = row.regNo;
        document.getElementById("vehicleType").value = row.type;
        document.getElementById("fuelType").value = row.fuelType;
        document.getElementById("fuelLevel").value = row.fuelLevel;
        document.getElementById("vehicleStatus").value = row.status;
        document.getElementById("vehicleHealth").value = row.healthStatus;
        document.getElementById("vehCapacity").value = row.capacity;
        document.getElementById("vehLocation").innerHTML = availableLocationsOptions(row.location);
        document.getElementById("lastServiceDate").value = row.lastServiceDate;
        document.getElementById("vehicleFormTitle").textContent = "Edit Vehicle";
      }

      if (action === "delete") {
        setVehicles(
          vehicles.filter(function (v) {
            return v.id !== id;
          })
        );
        setTrips(
          getTrips().filter(function (t) {
            return t.vehicleId !== id;
          })
        );
        setDrivers(
          getDrivers().map(function (d) {
            return d.assignedVehicle === id ? Object.assign({}, d, { assignedVehicle: "" }) : d;
          })
        );
        pushAlert("warn", "Vehicle removed from fleet.");
        setFlash("Vehicle deleted.", "info");
        renderPage();
      }
    });
  }

  function renderVehicleTable() {
    document.getElementById("vehicleTable").innerHTML = getVehicles()
      .map(function (v) {
        return (
          "<tr><td>" +
          v.name +
          "</td><td>" +
          v.regNo +
          "</td><td>" +
          v.type +
          "</td><td>" +
          v.fuelType +
          " (" +
          v.fuelLevel +
          "%)</td><td>" +
          v.location +
          "</td><td>" +
          statusBadge(v.status) +
          "</td><td>" +
          statusBadge(v.healthStatus) +
          "</td><td><div class=\"actions\"><button class=\"btn-secondary\" data-action=\"edit\" data-id=\"" +
          v.id +
          "\">Edit</button><button class=\"btn-danger\" data-action=\"delete\" data-id=\"" +
          v.id +
          "\">Delete</button></div></td></tr>"
        );
      })
      .join("");
  }
  function setupDriversPage() {
    document.getElementById("assignedVehicle").innerHTML = "<option value=\"\">None</option>" + vehicleOptions("", true);
    renderDriverTable();

    document.getElementById("driverReset").addEventListener("click", function () {
      document.getElementById("driverForm").reset();
      document.getElementById("driverId").value = "";
      document.getElementById("driverFormTitle").textContent = "Add Driver";
      document.getElementById("assignedVehicle").innerHTML = "<option value=\"\">None</option>" + vehicleOptions("", true);
    });

    document.getElementById("driverForm").addEventListener("submit", function (event) {
      event.preventDefault();
      const id = document.getElementById("driverId").value;
      const payload = {
        id: id || uid("drv"),
        name: document.getElementById("driverName").value.trim(),
        phone: document.getElementById("driverPhone").value.trim(),
        licenseNumber: document.getElementById("licenseNo").value.trim().toUpperCase(),
        availability: document.getElementById("driverAvailability").value,
        assignedVehicle: document.getElementById("assignedVehicle").value
      };
      const drivers = getDrivers();
      const dup = drivers.some(function (d) {
        return d.licenseNumber === payload.licenseNumber && d.id !== payload.id;
      });
      if (dup) {
        setFlash("License number already exists.", "error");
        renderPage();
        return;
      }
      const next = id
        ? drivers.map(function (d) { return d.id === id ? payload : d; })
        : drivers.concat(payload);
      setDrivers(next);
      setFlash("Driver saved.", "success");
      renderPage();
    });

    document.getElementById("driverTable").addEventListener("click", function (event) {
      const action = event.target.dataset.action;
      const id = event.target.dataset.id;
      if (!action || !id) return;
      const rows = getDrivers();
      const row = rows.find(function (d) { return d.id === id; });
      if (action === "edit" && row) {
        document.getElementById("driverId").value = row.id;
        document.getElementById("driverName").value = row.name;
        document.getElementById("driverPhone").value = row.phone;
        document.getElementById("licenseNo").value = row.licenseNumber;
        document.getElementById("driverAvailability").value = row.availability;
        document.getElementById("assignedVehicle").innerHTML = "<option value=\"\">None</option>" + vehicleOptions(row.assignedVehicle, true);
        document.getElementById("driverFormTitle").textContent = "Edit Driver";
      }
      if (action === "delete") {
        setDrivers(rows.filter(function (d) { return d.id !== id; }));
        setTrips(getTrips().filter(function (t) { return t.driverId !== id; }));
        setFlash("Driver deleted.", "info");
        renderPage();
      }
    });
  }

  function renderDriverTable() {
    document.getElementById("driverTable").innerHTML = getDrivers()
      .map(function (d) {
        const vehicle = vehicleById(d.assignedVehicle);
        return (
          "<tr><td>" +
          d.name +
          "</td><td>" +
          d.phone +
          "</td><td>" +
          d.licenseNumber +
          "</td><td>" +
          statusBadge(d.availability) +
          "</td><td>" +
          (vehicle ? vehicle.name : "None") +
          "</td><td><div class=\"actions\"><button class=\"btn-secondary\" data-action=\"edit\" data-id=\"" +
          d.id +
          "\">Edit</button><button class=\"btn-danger\" data-action=\"delete\" data-id=\"" +
          d.id +
          "\">Delete</button></div></td></tr>"
        );
      })
      .join("");
  }

  function setupTripsPage() {
    const role = getRole();
    const driverMode = role === "driver";
    document.getElementById("tripVehicle").innerHTML = vehicleOptions("", false);
    document.getElementById("tripDriver").innerHTML = driverOptions("", false);
    document.getElementById("tripOrigin").innerHTML = availableLocationsOptions("Area A");
    document.getElementById("tripDestination").innerHTML = availableLocationsOptions("City Hospital");
    renderTripTable();

    if (driverMode) {
      document.getElementById("tripForm").style.display = "none";
      document.getElementById("tripFormTitle").textContent = "Driver View";
    }

    document.getElementById("tripReset").addEventListener("click", function () {
      document.getElementById("tripForm").reset();
      document.getElementById("tripId").value = "";
      document.getElementById("tripVehicle").innerHTML = vehicleOptions("", false);
      document.getElementById("tripDriver").innerHTML = driverOptions("", false);
      document.getElementById("tripOrigin").innerHTML = availableLocationsOptions("Area A");
      document.getElementById("tripDestination").innerHTML = availableLocationsOptions("City Hospital");
      document.getElementById("tripFormTitle").textContent = "Schedule Trip";
    });

    document.getElementById("tripForm").addEventListener("submit", function (event) {
      event.preventDefault();
      const id = document.getElementById("tripId").value;
      const payload = {
        id: id || uid("trp"),
        vehicleId: document.getElementById("tripVehicle").value,
        driverId: document.getElementById("tripDriver").value,
        origin: document.getElementById("tripOrigin").value,
        destination: document.getElementById("tripDestination").value,
        startTime: document.getElementById("tripStartTime").value,
        status: document.getElementById("tripStatus").value,
        priority: document.getElementById("tripPriority").value,
        requestType: document.getElementById("tripTaskType").value
      };
      if (!payload.vehicleId || !payload.driverId) {
        setFlash("Vehicle and driver are required.", "error");
        renderPage();
        return;
      }
      if ((payload.status === "scheduled" || payload.status === "in-progress") && !vehicleAvailable(payload.vehicleId, id)) {
        setFlash("Vehicle unavailable for schedule.", "error");
        return;
      }
      if ((payload.status === "scheduled" || payload.status === "in-progress") && !driverAvailable(payload.driverId, id)) {
        setFlash("Driver unavailable for schedule.", "error");
        return;
      }
      const rows = getTrips();
      const next = id
        ? rows.map(function (t) { return t.id === id ? payload : t; })
        : rows.concat(payload);
      setTrips(next);
      pushAlert("info", "Trip schedule updated.");
      setFlash("Trip saved successfully.", "success");
      renderPage();
    });

    document.getElementById("tripTable").addEventListener("click", function (event) {
      const action = event.target.dataset.action;
      const id = event.target.dataset.id;
      if (!action || !id || driverMode) return;
      const rows = getTrips();
      const row = rows.find(function (t) { return t.id === id; });
      if (action === "edit" && row) {
        document.getElementById("tripId").value = row.id;
        document.getElementById("tripVehicle").innerHTML = vehicleOptions(row.vehicleId, true);
        document.getElementById("tripDriver").innerHTML = driverOptions(row.driverId, true);
        document.getElementById("tripOrigin").innerHTML = availableLocationsOptions(row.origin);
        document.getElementById("tripDestination").innerHTML = availableLocationsOptions(row.destination);
        document.getElementById("tripStartTime").value = row.startTime;
        document.getElementById("tripStatus").value = row.status;
        document.getElementById("tripPriority").value = row.priority || "medium";
        document.getElementById("tripTaskType").value = row.requestType || "Transport";
        document.getElementById("tripFormTitle").textContent = "Edit Trip";
      }
      if (action === "delete") {
        setTrips(rows.filter(function (t) { return t.id !== id; }));
        setFlash("Trip deleted.", "info");
        renderPage();
      }
    });
  }

  function renderTripTable() {
    const role = getRole();
    const rows = getTrips().filter(function (t) {
      if (role !== "driver") return true;
      return t.driverId === activeDriverId();
    });
    document.getElementById("tripTable").innerHTML = rows
      .map(function (t) {
        const v = vehicleById(t.vehicleId);
        const d = driverById(t.driverId);
        return (
          "<tr><td>" +
          (v ? v.name : "Unknown") +
          "</td><td>" +
          (d ? d.name : "Unknown") +
          "</td><td>" +
          (t.requestType || "Task") +
          "</td><td>" +
          t.origin +
          " -> " +
          t.destination +
          "</td><td>" +
          new Date(t.startTime).toLocaleString() +
          "</td><td>" +
          statusBadge(t.status) +
          "</td><td>" +
          statusBadge(t.priority || "medium") +
          "</td><td>" +
          (role === "driver"
            ? "<span class=\"subtle\">view only</span>"
            : "<div class=\"actions\"><button class=\"btn-secondary\" data-action=\"edit\" data-id=\"" +
              t.id +
              "\">Edit</button><button class=\"btn-danger\" data-action=\"delete\" data-id=\"" +
              t.id +
              "\">Delete</button></div>") +
          "</td></tr>"
        );
      })
      .join("");
  }

  function setupMaintenancePage() {
    renderMaintenancePage();
    document.getElementById("maintenanceTable").addEventListener("click", function (event) {
      if (event.target.dataset.action !== "save") return;
      const id = event.target.dataset.id;
      const stateSelect = document.querySelector("select[data-kind='health'][data-id='" + id + "']");
      const health = stateSelect ? stateSelect.value : "healthy";
      const next = getVehicles().map(function (v) {
        if (v.id !== id) return v;
        return Object.assign({}, v, {
          healthStatus: health,
          status: health === "under-maintenance" ? "maintenance" : v.status
        });
      });
      setVehicles(next);
      setFlash("Maintenance updated.", "success");
      renderPage();
    });
  }

  function renderMaintenancePage() {
    const vehicles = getVehicles();
    const alerts = vehicles.filter(function (v) {
      return v.healthStatus !== "healthy";
    });
    document.getElementById("serviceAlerts").innerHTML = alerts
      .map(function (v) {
        return "<li>" + v.name + " requires attention (" + toTitle(v.healthStatus) + ")</li>";
      })
      .join("") || "<li>All vehicles healthy.</li>";

    document.getElementById("maintenanceTable").innerHTML = vehicles
      .map(function (v) {
        return (
          "<tr><td>" +
          v.name +
          "</td><td>" +
          statusBadge(v.healthStatus) +
          "</td><td>" +
          statusBadge(v.status) +
          "</td><td>" +
          v.lastServiceDate +
          "</td><td>" +
          v.fuelLevel +
          "%</td><td><select data-kind=\"health\" data-id=\"" +
          v.id +
          "\"><option value=\"healthy\" " +
          (v.healthStatus === "healthy" ? "selected" : "") +
          ">healthy</option><option value=\"service-due\" " +
          (v.healthStatus === "service-due" ? "selected" : "") +
          ">service due</option><option value=\"under-maintenance\" " +
          (v.healthStatus === "under-maintenance" ? "selected" : "") +
          ">under maintenance</option></select></td><td><button class=\"btn-primary\" data-action=\"save\" data-id=\"" +
          v.id +
          "\">Update</button></td></tr>"
        );
      })
      .join("");
  }

  function computeEfficiencyScore() {
    const vehicles = getVehicles();
    const trips = getTrips();
    if (!vehicles.length) return 0;
    const idle = vehicles.filter(function (v) {
      return !trips.some(function (t) {
        return t.vehicleId === v.id && (t.status === "scheduled" || t.status === "in-progress");
      });
    }).length;
    const avgFuel = vehicles.reduce(function (acc, v) {
      return acc + Number(v.fuelLevel || 0);
    }, 0) / vehicles.length;
    const maintenanceIssues = vehicles.filter(function (v) {
      return v.healthStatus !== "healthy";
    }).length;
    const idlePenalty = (idle / vehicles.length) * 35;
    const fuelBonus = (avgFuel / 100) * 35;
    const maintenancePenalty = (maintenanceIssues / vehicles.length) * 30;
    const raw = Math.max(0, Math.min(100, 100 - idlePenalty - maintenancePenalty + fuelBonus));
    return Math.round(raw);
  }

  function setupCanvas(canvas, height) {
    const cssW = Math.max(300, Math.floor(canvas.clientWidth || 520));
    const cssH = height || 260;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor(cssH * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    return { ctx: ctx, width: cssW, height: cssH };
  }

  function shortLabel(text, maxLen) {
    const s = String(text);
    return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
  }

  function drawEmptyState(ctx, width, height, msg) {
    ctx.fillStyle = "#6b7b90";
    ctx.font = "13px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(msg || "No data available", width / 2, height / 2);
  }

  function drawBarChart(canvas, data, color) {
    if (!canvas) return;
    const chart = setupCanvas(canvas, 260);
    const ctx = chart.ctx;
    const w = chart.width;
    const h = chart.height;
    const entries = Object.entries(data);
    if (!entries.length) {
      drawEmptyState(ctx, w, h, "No records to plot");
      return;
    }

    const max = Math.max(1, entries.reduce(function (m, item) { return Math.max(m, item[1]); }, 0));
    const margin = { top: 20, right: 16, bottom: 58, left: 40 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const gap = Math.max(8, Math.floor(plotW * 0.03));
    const barW = Math.max(20, Math.floor((plotW - gap * (entries.length - 1)) / entries.length));

    ctx.strokeStyle = "#c9d8eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left + plotW, margin.top + plotH);
    ctx.stroke();

    ctx.fillStyle = "#5e7088";
    ctx.font = "11px Segoe UI";
    ctx.textAlign = "right";
    ctx.fillText(String(max), margin.left - 6, margin.top + 4);
    ctx.fillText("0", margin.left - 6, margin.top + plotH + 2);

    entries.forEach(function (entry, index) {
      const x = margin.left + index * (barW + gap);
      const value = entry[1];
      const barH = Math.round((value / max) * plotH);
      const y = margin.top + plotH - barH;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);

      ctx.fillStyle = "#1e334c";
      ctx.font = "12px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText(String(value), x + barW / 2, y - 6);
      ctx.fillStyle = "#2d465f";
      ctx.font = "11px Segoe UI";
      ctx.fillText(shortLabel(entry[0], 14), x + barW / 2, margin.top + plotH + 18);
    });
  }

  function drawPieChart(canvas, data) {
    if (!canvas) return;
    const chart = setupCanvas(canvas, 260);
    const ctx = chart.ctx;
    const w = chart.width;
    const h = chart.height;
    const entries = Object.entries(data);
    const total = entries.reduce(function (acc, entry) { return acc + entry[1]; }, 0);
    if (!total) {
      drawEmptyState(ctx, w, h, "No fuel data");
      return;
    }

    const colors = ["#0f766e", "#1d4ed8", "#f59e0b", "#dc2626", "#7c3aed", "#0ea5e9"];
    const wide = w >= 500;
    const cx = wide ? Math.floor(w * 0.3) : Math.floor(w * 0.5);
    const cy = wide ? Math.floor(h * 0.5) : Math.floor(h * 0.42);
    const radius = wide ? Math.min(82, Math.floor(h * 0.33)) : Math.min(70, Math.floor(h * 0.28));
    let start = -Math.PI / 2;

    entries.forEach(function (entry, idx) {
      const ratio = entry[1] / total;
      const end = start + ratio * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fill();
      start = end;
    });

    const legendX = wide ? Math.floor(w * 0.58) : 20;
    const legendY = wide ? 26 : Math.floor(h * 0.72);
    entries.forEach(function (entry, idx) {
      const pct = Math.round((entry[1] / total) * 100);
      const y = legendY + idx * 20;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fillRect(legendX, y - 9, 10, 10);
      ctx.fillStyle = "#243b54";
      ctx.font = "12px Segoe UI";
      ctx.textAlign = "left";
      ctx.fillText(shortLabel(entry[0], 12) + " " + pct + "%", legendX + 16, y);
    });
  }

  function setupReportsPage() {
    const trips = getTrips();
    const vehicles = getVehicles();
    const done = trips.filter(function (t) { return t.status === "completed"; }).length;
    document.getElementById("reportTripsCompleted").textContent = done;
    document.getElementById("reportVehicleUsageCount").textContent = trips.length;
    document.getElementById("reportMaintenanceCount").textContent = vehicles.filter(function (v) { return v.healthStatus !== "healthy"; }).length;
    document.getElementById("reportEfficiency").textContent = computeEfficiencyScore() + "%";

    const usage = {};
    trips.forEach(function (t) {
      const v = vehicleById(t.vehicleId);
      const key = v ? v.name : "Unknown";
      usage[key] = (usage[key] || 0) + 1;
    });

    const fuel = {};
    vehicles.forEach(function (v) {
      fuel[v.fuelType] = (fuel[v.fuelType] || 0) + Number(v.fuelLevel || 0);
    });

    const status = {};
    vehicles.forEach(function (v) {
      status[v.status] = (status[v.status] || 0) + 1;
    });

    drawBarChart(document.getElementById("usageCanvas"), usage, "#1d4ed8");
    drawPieChart(document.getElementById("fuelCanvas"), fuel);
    drawBarChart(document.getElementById("statusCanvas"), status, "#0f766e");
  }

  function bindGlobalControls() {
    const rolePicker = document.getElementById("rolePicker");
    if (!rolePicker) return;
    rolePicker.addEventListener("change", function () {
      setRole(rolePicker.value);
      if (rolePicker.value === "driver") {
        const drivers = getDrivers();
        const first = drivers[0] ? drivers[0].id : "";
        if (first) setActiveDriver(first);
      }
      renderPage();
    });
  }

  function renderPage() {
    renderLayout();
    bindGlobalControls();
    if (page === "home") {
      setupHomePage();
      return;
    }
    if (!canAccess(page)) {
      return;
    }
    if (page === "dashboard") renderDashboard();
    if (page === "vehicles") setupVehiclesPage();
    if (page === "drivers") setupDriversPage();
    if (page === "trips") setupTripsPage();
    if (page === "maintenance") setupMaintenancePage();
    if (page === "reports") setupReportsPage();
  }

  seedData();
  renderPage();
})();

