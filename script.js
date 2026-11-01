import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let containers = [];
let vessels = [];
let movements = [];
let dataReady = false;

const containersCollection = collection(db, "containers");
const vesselsCollection = collection(db, "vessels");
const yardsCollection = collection(db, "yardAllocations");
const movementsCollection = collection(db, "movementHistory");

function firestoreId(value) {
    return encodeURIComponent(String(value).trim());
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

function showMessage(message, type = "success") {
    const oldMessage = document.querySelector(".toast-message");

    if (oldMessage) oldMessage.remove();

    const toast = document.createElement("div");
    toast.className = "toast-message toast-" + type;

    toast.innerHTML = `
        <strong>${type === "success" ? "✓ Success!" : "✕ Error!"}</strong>
        ${escapeHTML(message)}
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showDatabaseError(error) {
    console.error("Firestore error:", error);
    showMessage("Could not save or load data. Check your internet connection and Firestore rules.", "error");
}

function showDialog(title, message, options = {}) {
    return new Promise(function(resolve) {
        const oldDialog = document.getElementById("portflow-dialog");
        if (oldDialog) oldDialog.remove();

        const isInput = options.input === true;
        const overlay = document.createElement("div");

        overlay.id = "portflow-dialog";
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,20,35,.6);display:flex;align-items:center;justify-content:center;padding:20px;z-index:10000;";

        const box = document.createElement("div");
        box.style.cssText = "width:100%;max-width:420px;background:#fff;border-radius:14px;padding:25px;box-shadow:0 15px 45px rgba(0,0,0,.25);color:#1e293b;";

        const heading = document.createElement("h3");
        heading.textContent = title;
        heading.style.cssText = "margin:0 0 10px;color:#102b46;font-size:21px;";

        const text = document.createElement("p");
        text.textContent = message;
        text.style.cssText = "margin:0 0 18px;color:#64748b;line-height:1.5;";

        let input = null;

        if (isInput) {
            input = document.createElement("input");
            input.type = "text";
            input.value = options.value || "";
            input.placeholder = options.placeholder || "";
            input.style.cssText = "width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:7px;margin-bottom:20px;font-size:14px;box-sizing:border-box;";
        }

        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;justify-content:flex-end;gap:10px;";

        const cancel = document.createElement("button");
        cancel.textContent = "Cancel";
        cancel.style.cssText = "padding:10px 18px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155;cursor:pointer;";

        const ok = document.createElement("button");
        ok.textContent = options.confirm ? "Delete" : (isInput ? "Save" : "OK");
        ok.style.cssText = "padding:10px 18px;border:0;border-radius:7px;background:" + (options.confirm ? "#dc4545" : "#1684d4") + ";color:#fff;cursor:pointer;";

        function close(value) {
            overlay.remove();
            resolve(value);
        }

        cancel.addEventListener("click", () => close(isInput ? null : false));
        ok.addEventListener("click", () => close(isInput ? input.value : true));

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                close(isInput ? null : false);
            }
        });

        box.appendChild(heading);
        box.appendChild(text);

        if (input) box.appendChild(input);

        actions.appendChild(cancel);
        actions.appendChild(ok);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        if (input) {
            input.focus();
            input.select();

            input.addEventListener("keydown", event => {
                if (event.key === "Enter") ok.click();
            });
        }
    });
}

async function loadAllData() {
    const [containerSnapshot, vesselSnapshot, movementSnapshot, yardSnapshot] =
        await Promise.all([
            getDocs(containersCollection),
            getDocs(vesselsCollection),
            getDocs(movementsCollection),
            getDocs(yardsCollection)
        ]);

    containers = containerSnapshot.docs.map(item => ({
        ...item.data(),
        firestoreId: item.id
    }));

    vessels = vesselSnapshot.docs.map(item => ({
        ...item.data(),
        firestoreId: item.id
    }));

    movements = movementSnapshot.docs.map(item => ({
        ...item.data(),
        firestoreId: item.id
    }));

    const yardByContainer = new Map();

    yardSnapshot.forEach(item => {
        yardByContainer.set(item.id, item.data());
    });

    containers = containers.map(container => {
        const yard = yardByContainer.get(container.firestoreId);

        return yard ? {
            ...container,
            yard: yard.yard,
            block: yard.block,
            slot: yard.slot
        } : container;
    });

    movements.sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
    );

    dataReady = true;
}

async function addMovement(id, activity, location) {
    const movement = {
        id,
        activity,
        location,
        date: new Date().toLocaleString(),
        createdAt: Date.now()
    };

    const result = await addDoc(movementsCollection, movement);

    movements.unshift({
        ...movement,
        firestoreId: result.id
    });

    displayHistory();
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const result = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const userSnapshot = await getDoc(
                doc(db, "users", result.user.uid)
            );

            if (!userSnapshot.exists()) {
                await signOut(auth);
                showMessage("Account profile not found. Contact the administrator.", "error");
                return;
            }

            const userData = userSnapshot.data();

            if (
                userData.active !== true ||
                !["admin", "staff", "visitor"].includes(userData.role)
            ) {
                await signOut(auth);
                showMessage("Your account is inactive or unauthorized.", "error");
                return;
            }

            window.location.href = "index.html#dashboard";

        } catch (error) {
            console.error("Login error:", error);

            if (error.code === "auth/invalid-credential") {
                showMessage("Invalid email or password.", "error");
            } else if (error.code === "auth/too-many-requests") {
                showMessage("Too many attempts. Try again later.", "error");
            } else {
                showMessage("Login failed. Please try again.", "error");
            }
        }
    });
}

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!name) {
            showMessage("Please enter your name.", "error");
            return;
        }

        if (password.length < 6) {
            showMessage("Password must contain at least 6 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        try {
            const result = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            await setDoc(
                doc(db, "users", result.user.uid),
                {
                    name: name,
                    email: email,
                    role: "visitor",
                    active: true,
                    createdAt: Date.now()
                }
            );

            showMessage("Account created successfully!");

            window.location.href = "index.html#dashboard";

        } catch (error) {
            console.error("Registration error:", error);

            if (error.code === "auth/email-already-in-use") {
                showMessage("This email is already registered. Please log in.", "error");
            } else if (error.code === "auth/weak-password") {
                showMessage("Please choose a stronger password.", "error");
            } else if (error.code === "auth/invalid-email") {
                showMessage("Please enter a valid email address.", "error");
            } else if (error.code === "permission-denied") {
                showMessage("Account created, but profile saving was denied. Contact the administrator.", "error");
            } else {
                showMessage("Registration failed. Please try again.", "error");
            }
        }
    });
}

const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

if (showSignup) {
    showSignup.addEventListener("click", function(event) {
        event.preventDefault();

        document.getElementById("loginPanel").hidden = true;
        document.getElementById("signupPanel").hidden = false;
    });
}

if (showLogin) {
    showLogin.addEventListener("click", function(event) {
        event.preventDefault();

        document.getElementById("signupPanel").hidden = true;
        document.getElementById("loginPanel").hidden = false;
    });
}

const showPassword = document.getElementById("showPassword");

if (showPassword) {
    showPassword.addEventListener("change", function() {
        document.getElementById("password").type =
            this.checked ? "text" : "password";
    });
}

async function logout() {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout error:", error);
        showMessage("Could not log out. Please try again.", "error");
    }
}

async function openDashboard() {
    const navbar = document.querySelector(".navbar");
    const hero = document.querySelector(".hero");
    const about = document.querySelector(".about");
    const features = document.querySelector(".features");
    const footer = document.querySelector("footer");
    const dashboard = document.getElementById("dashboard");

    if (navbar) navbar.hidden = true;
    if (hero) hero.hidden = true;
    if (about) about.hidden = true;
    if (features) features.hidden = true;
    if (footer) footer.hidden = true;
    if (dashboard) dashboard.hidden = false;

    try {
        await loadAllData();

        displayContainers();
        displayVessels();
        displayYards();
        displayHistory();
        updateDashboard();

    } catch (error) {
        showDatabaseError(error);
    }
}

if (
    document.getElementById("dashboard") &&
    window.location.hash === "#dashboard"
) {
    onAuthStateChanged(auth, async function(user) {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        try {
            const userSnapshot = await getDoc(
                doc(db, "users", user.uid)
            );

            if (!userSnapshot.exists()) {
                await signOut(auth);
                window.location.href = "login.html";
                return;
            }

            const userData = userSnapshot.data();

            if (
                userData.active !== true ||
                !["admin", "staff", "visitor"].includes(userData.role)
            ) {
                await signOut(auth);
                window.location.href = "login.html";
                return;
            }

            await openDashboard();

        } catch (error) {
            console.error("Dashboard authorization error:", error);
            showMessage("Could not verify your account.", "error");
            await signOut(auth);
            window.location.href = "login.html";
        }
    });
}

const containerForm = document.getElementById("containerForm");

if (containerForm) {
    containerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!dataReady) {
            showMessage("Please wait for dashboard data to load.", "error");
            return;
        }

        const id = document.getElementById("containerId").value.trim();

        if (containers.some(c => c.id.toLowerCase() === id.toLowerCase())) {
            showMessage("Container ID already exists!", "error");
            return;
        }

        const container = {
            id,
            type: document.getElementById("containerType").value,
            size: document.getElementById("containerSize").value,
            destination: document.getElementById("destination").value.trim(),
            status: "Arrived",
            vessel: "Not Assigned",
            yard: "Not Assigned",
            block: "-",
            slot: "-"
        };

        try {
            const documentId = firestoreId(id);

            await setDoc(
                doc(db, "containers", documentId),
                container
            );

            containers.push({
                ...container,
                firestoreId: documentId
            });

            await addMovement(id, "Container Registered", "Port");

            containerForm.reset();
            displayContainers();
            updateDashboard();

            showMessage("Container added successfully!");

        } catch (error) {
            showDatabaseError(error);
        }
    });
}

function displayContainers() {
    const table = document.getElementById("containerTable");

    if (!table) return;

    table.innerHTML = "";

    containers.forEach(function(c) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(c.id)}</td>
            <td>${escapeHTML(c.type)}</td>
            <td>${escapeHTML(c.size)}</td>
            <td>${escapeHTML(c.destination)}</td>
            <td>
                <select class="status-select" data-id="${escapeHTML(c.firestoreId)}">
                    ${["Arrived", "In Yard", "Departed"].map(s =>
                        `<option value="${s}" ${c.status === s ? "selected" : ""}>${s}</option>`
                    ).join("")}
                </select>
            </td>
            <td>
                <button data-action="edit" data-id="${escapeHTML(c.firestoreId)}">Edit</button>
                <button data-action="delete" data-id="${escapeHTML(c.firestoreId)}">Delete</button>
                <button data-action="vessel" data-id="${escapeHTML(c.firestoreId)}">Assign Vessel</button>
            </td>
        `;

        table.appendChild(row);
    });
}

const containerTable = document.getElementById("containerTable");

if (containerTable) {
    containerTable.addEventListener("click", async function(event) {
        const button = event.target.closest("button");

        if (!button) return;

        const documentId = button.dataset.id;
        const action = button.dataset.action;

        const container = containers.find(
            c => c.firestoreId === documentId
        );

        if (!container) return;

        try {
            if (action === "delete") {
                const approved = await showDialog(
                    "Delete container",
                    "Are you sure you want to delete this container?",
                    { confirm: true }
                );

                if (!approved) return;

                await deleteDoc(doc(db, "containers", documentId));
                await deleteDoc(doc(db, "yardAllocations", documentId));

                containers = containers.filter(
                    c => c.firestoreId !== documentId
                );

                displayContainers();
                displayYards();
                updateDashboard();

                showMessage("Container deleted successfully!");
            }

            if (action === "edit") {
                const destination = await showDialog(
                    "Edit destination",
                    "Enter the new destination:",
                    {
                        input: true,
                        value: container.destination
                    }
                );

                if (destination !== null && destination.trim() !== "") {
                    container.destination = destination.trim();

                    const { firestoreId: ignored, ...savedContainer } = container;

                    await setDoc(
                        doc(db, "containers", documentId),
                        savedContainer
                    );

                    displayContainers();
                    showMessage("Container updated successfully!");
                }
            }

            if (action === "vessel") {
                if (vessels.length === 0) {
                    showMessage("Please add a vessel first!", "error");
                    return;
                }

                const options = vessels.map(v => v.name).join(", ");

                const name = await showDialog(
                    "Assign vessel",
                    "Available vessels: " + options + ". Enter a vessel name:",
                    {
                        input: true,
                        placeholder: "Vessel name"
                    }
                );

                if (name !== null && name.trim() !== "") {
                    const vessel = vessels.find(
                        v => v.name.toLowerCase() === name.trim().toLowerCase()
                    );

                    if (!vessel) {
                        showMessage("Vessel not found!", "error");
                        return;
                    }

                    container.vessel = vessel.name;

                    const { firestoreId: ignored, ...savedContainer } = container;

                    await setDoc(
                        doc(db, "containers", documentId),
                        savedContainer
                    );

                    await addMovement(
                        container.id,
                        "Vessel Assigned: " + vessel.name,
                        "Port"
                    );

                    displayContainers();
                    showMessage("Vessel assigned successfully!");
                }
            }

        } catch (error) {
            showDatabaseError(error);
        }
    });

    containerTable.addEventListener("change", async function(event) {
        if (!event.target.classList.contains("status-select")) return;

        const documentId = event.target.dataset.id;

        const container = containers.find(
            c => c.firestoreId === documentId
        );

        if (!container) return;

        try {
            container.status = event.target.value;

            const { firestoreId: ignored, ...savedContainer } = container;

            await setDoc(
                doc(db, "containers", documentId),
                savedContainer
            );

            await addMovement(
                container.id,
                "Status Updated: " + container.status,
                container.yard
            );

            updateDashboard();

        } catch (error) {
            showDatabaseError(error);
        }
    });
}

const searchContainer = document.getElementById("searchContainer");

if (searchContainer) {
    searchContainer.addEventListener("input", function() {
        const value = this.value.toLowerCase();

        document.querySelectorAll("#containerTable tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(value)
                ? ""
                : "none";
        });
    });
}

const vesselForm = document.getElementById("vesselForm");

if (vesselForm) {
    vesselForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!dataReady) {
            showMessage("Please wait for dashboard data to load.", "error");
            return;
        }

        const id = document.getElementById("vesselId").value.trim();

        if (vessels.some(v => v.id.toLowerCase() === id.toLowerCase())) {
            showMessage("Vessel ID already exists!", "error");
            return;
        }

        const vessel = {
            name: document.getElementById("vesselName").value.trim(),
            id,
            voyage: document.getElementById("voyageNumber").value.trim()
        };

        try {
            const documentId = firestoreId(id);

            await setDoc(
                doc(db, "vessels", documentId),
                vessel
            );

            vessels.push({
                ...vessel,
                firestoreId: documentId
            });

            displayVessels();
            vesselForm.reset();

            showMessage("Vessel added successfully!");

        } catch (error) {
            showDatabaseError(error);
        }
    });
}

function displayVessels() {
    const table = document.getElementById("vesselTable");

    if (!table) return;

    table.innerHTML = "";

    vessels.forEach(function(v) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(v.name)}</td>
            <td>${escapeHTML(v.id)}</td>
            <td>${escapeHTML(v.voyage)}</td>
            <td>
                <button data-vessel-delete="${escapeHTML(v.firestoreId)}">Delete</button>
            </td>
        `;

        table.appendChild(row);
    });
}

const vesselTable = document.getElementById("vesselTable");

if (vesselTable) {
    vesselTable.addEventListener("click", async function(event) {
        const button = event.target.closest("button");

        if (!button) return;

        const documentId = button.dataset.vesselDelete;

        if (!documentId) return;

        const approved = await showDialog(
            "Delete vessel",
            "Are you sure you want to delete this vessel?",
            { confirm: true }
        );

        if (!approved) return;

        const vessel = vessels.find(
            v => v.firestoreId === documentId
        );

        if (!vessel) return;

        const assigned = containers.some(
            c => c.vessel === vessel.name
        );

        if (assigned) {
            showMessage(
                "This vessel is assigned to a container. Reassign it first.",
                "error"
            );
            return;
        }

        try {
            await deleteDoc(doc(db, "vessels", documentId));

            vessels = vessels.filter(
                v => v.firestoreId !== documentId
            );

            displayVessels();

            showMessage("Vessel deleted successfully!");

        } catch (error) {
            showDatabaseError(error);
        }
    });
}

const yardForm = document.getElementById("yardForm");

if (yardForm) {
    yardForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!dataReady) {
            showMessage("Please wait for dashboard data to load.", "error");
            return;
        }

        const id = document.getElementById("yardContainerId").value.trim();

        const container = containers.find(
            c => c.id.toLowerCase() === id.toLowerCase()
        );

        if (!container) {
            showMessage("Container not found!", "error");
            return;
        }

        if (container.status === "Departed") {
            showMessage("Departed containers cannot be assigned to a yard.", "error");
            return;
        }

        container.yard = document.getElementById("yardName").value.trim();
        container.block = document.getElementById("blockNumber").value.trim();
        container.slot = document.getElementById("slotNumber").value.trim();
        container.status = "In Yard";

        try {
            const { firestoreId: ignored, ...savedContainer } = container;

            await setDoc(
                doc(db, "containers", container.firestoreId),
                savedContainer
            );

            await setDoc(
                doc(db, "yardAllocations", container.firestoreId),
                {
                    containerId: container.id,
                    yard: container.yard,
                    block: container.block,
                    slot: container.slot
                }
            );

            await addMovement(
                id,
                "Yard Location Assigned",
                container.yard + " / " + container.block + " / " + container.slot
            );

            yardForm.reset();
            displayContainers();
            displayYards();
            updateDashboard();

            showMessage("Yard location assigned successfully!");

        } catch (error) {
            showDatabaseError(error);
        }
    });
}

function displayYards() {
    const table = document.getElementById("yardTable");

    if (!table) return;

    table.innerHTML = "";

    containers
        .filter(c => c.yard && c.yard !== "Not Assigned")
        .forEach(function(c) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${escapeHTML(c.id)}</td>
                <td>${escapeHTML(c.yard)}</td>
                <td>${escapeHTML(c.block)}</td>
                <td>${escapeHTML(c.slot)}</td>
            `;

            table.appendChild(row);
        });
}

function trackContainer() {
    const id = document.getElementById("trackingId").value.trim();

    const container = containers.find(
        c => c.id.toLowerCase() === id.toLowerCase()
    );

    const result = document.getElementById("trackingResult");

    if (!container) {
        result.textContent = "Container not found!";
        return;
    }

    result.innerHTML = `
        <h3>Container Details</h3>
        <p><b>Container ID:</b> ${escapeHTML(container.id)}</p>
        <p><b>Type:</b> ${escapeHTML(container.type)}</p>
        <p><b>Destination:</b> ${escapeHTML(container.destination)}</p>
        <p><b>Status:</b> ${escapeHTML(container.status)}</p>
        <p><b>Vessel:</b> ${escapeHTML(container.vessel)}</p>
        <p><b>Yard:</b> ${escapeHTML(container.yard)}</p>
        <p><b>Block:</b> ${escapeHTML(container.block)}</p>
        <p><b>Slot:</b> ${escapeHTML(container.slot)}</p>
    `;
}

function displayHistory() {
    const table = document.getElementById("historyTable");

    if (!table) return;

    table.innerHTML = "";

    movements.forEach(function(m) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(m.id)}</td>
            <td>${escapeHTML(m.activity)}</td>
            <td>${escapeHTML(m.location)}</td>
            <td>${escapeHTML(m.date)}</td>
        `;

        table.appendChild(row);
    });
}

function updateDashboard() {
    const total = document.getElementById("totalContainers");

    if (!total) return;

    total.textContent = containers.length;

    document.getElementById("arrivedContainers").textContent =
        containers.filter(c => c.status === "Arrived").length;

    document.getElementById("yardContainers").textContent =
        containers.filter(c => c.status === "In Yard").length;

    document.getElementById("departedContainers").textContent =
        containers.filter(c => c.status === "Departed").length;
}

window.logout = logout;
window.trackContainer = trackContainer;