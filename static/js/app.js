// ===== State =====
let room = null;
let micEnabled = true;
let isConnected = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Track transcription segments by ID for updating partial → final
const transcriptionSegments = {};

// ===== DOM Elements =====
const avatarWindow = document.getElementById("avatar-window");
const windowHeader = document.getElementById("window-header");
const csButton = document.getElementById("cs-button");
const avatarVideoContainer = document.getElementById("avatar-video-container");
const avatarPlaceholder = document.getElementById("avatar-placeholder");
const chatMessages = document.getElementById("chat-messages");
const micToggle = document.getElementById("mic-toggle");
const micIconOn = document.getElementById("mic-icon-on");
const micIconOff = document.getElementById("mic-icon-off");
const micLabel = document.getElementById("mic-label");
const connectionStatus = document.getElementById("connection-status");
const backgroundIframe = document.getElementById("background-iframe");
const urlNotification = document.getElementById("url-notification");
const urlNotificationText = document.getElementById("url-notification-text");

// ===== Customer Service Toggle =====
function toggleCustomerService() {
    if (avatarWindow.classList.contains("hidden")) {
        openCustomerService();
    } else {
        closeCustomerService();
    }
}

async function openCustomerService() {
    avatarWindow.classList.remove("hidden");
    csButton.style.display = "none";
    centerWindow();

    if (!isConnected) {
        await connectToRoom();
    }
}

function closeCustomerService() {
    avatarWindow.classList.add("hidden");
    csButton.style.display = "flex";

    if (room) {
        room.disconnect();
        room = null;
        isConnected = false;
        resetUI();
    }
}

function minimizeWindow() {
    avatarWindow.classList.add("hidden");
    csButton.style.display = "flex";
}

function resetUI() {
    // Clear chat
    chatMessages.innerHTML =
        '<div class="chat-welcome"><p>Welkom! Stel uw vragen over gezondheid en welzijn. Uw gesprek wordt hier weergegeven.</p></div>';

    // Reset avatar
    avatarPlaceholder.classList.remove("hidden");
    const videos = avatarVideoContainer.querySelectorAll("video");
    videos.forEach((v) => v.remove());

    // Reset mic
    micEnabled = true;
    updateMicUI();

    // Reset status
    updateConnectionStatus("Verbinden...");

    // Clear segment tracking
    Object.keys(transcriptionSegments).forEach((k) => delete transcriptionSegments[k]);
}

// ===== Center Window =====
function centerWindow() {
    const w = avatarWindow.offsetWidth;
    const h = avatarWindow.offsetHeight;
    const x = (window.innerWidth - w) / 2;
    const y = (window.innerHeight - h) / 2;
    avatarWindow.style.left = Math.max(0, x) + "px";
    avatarWindow.style.top = Math.max(0, y) + "px";
    avatarWindow.style.right = "auto";
    avatarWindow.style.bottom = "auto";
}

// ===== Draggable Window =====
windowHeader.addEventListener("mousedown", (e) => {
    if (e.target.closest(".header-controls")) return;
    isDragging = true;
    dragOffsetX = e.clientX - avatarWindow.offsetLeft;
    dragOffsetY = e.clientY - avatarWindow.offsetTop;
    document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragOffsetX;
    const newY = e.clientY - dragOffsetY;
    // Clamp to viewport
    const maxX = window.innerWidth - avatarWindow.offsetWidth;
    const maxY = window.innerHeight - avatarWindow.offsetHeight;
    avatarWindow.style.left = Math.max(0, Math.min(newX, maxX)) + "px";
    avatarWindow.style.top = Math.max(0, Math.min(newY, maxY)) + "px";
    avatarWindow.style.right = "auto";
    avatarWindow.style.bottom = "auto";
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "";
});

// Touch support for mobile dragging
windowHeader.addEventListener("touchstart", (e) => {
    if (e.target.closest(".header-controls")) return;
    isDragging = true;
    const touch = e.touches[0];
    dragOffsetX = touch.clientX - avatarWindow.offsetLeft;
    dragOffsetY = touch.clientY - avatarWindow.offsetTop;
}, { passive: true });

document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffsetX;
    const newY = touch.clientY - dragOffsetY;
    const maxX = window.innerWidth - avatarWindow.offsetWidth;
    const maxY = window.innerHeight - avatarWindow.offsetHeight;
    avatarWindow.style.left = Math.max(0, Math.min(newX, maxX)) + "px";
    avatarWindow.style.top = Math.max(0, Math.min(newY, maxY)) + "px";
    avatarWindow.style.right = "auto";
    avatarWindow.style.bottom = "auto";
}, { passive: true });

document.addEventListener("touchend", () => {
    isDragging = false;
});

// ===== LiveKit Connection =====
async function connectToRoom() {
    const roomName = "cs-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    const identity = "user-" + Date.now();

    updateConnectionStatus("Verbinden...");

    try {
        // Request token from server
        const response = await fetch(
            `/api/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Token request failed");
        }

        const wsUrl = data.url;
        const token = data.token;

        // Create LiveKit room
        room = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
        });

        // Set up event handlers
        setupRoomEvents(room);

        // Connect to room
        await room.connect(wsUrl, token);
        isConnected = true;
        updateConnectionStatus("Verbonden");

        // Request microphone permission and publish
        try {
            await room.localParticipant.setMicrophoneEnabled(true);
            micEnabled = true;
            updateMicUI();
        } catch (micError) {
            console.error("Microphone access denied:", micError);
            addSystemMessage("Microfoon toegang geweigerd. Schakel de microfoon in via uw browserinstellingen.");
            micEnabled = false;
            updateMicUI();
        }
    } catch (error) {
        console.error("Connection error:", error);
        updateConnectionStatus("Fout");
        addSystemMessage("Verbinding mislukt: " + error.message);
    }
}

// ===== Room Events =====
function setupRoomEvents(room) {
    const RoomEvent = LivekitClient.RoomEvent;

    // Track subscribed — attach avatar video
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video") {
            const element = track.attach();
            element.style.width = "100%";
            element.style.height = "100%";
            element.style.objectFit = "cover";
            avatarPlaceholder.classList.add("hidden");
            avatarVideoContainer.appendChild(element);
        }
        // Audio tracks are automatically played
        if (track.kind === "audio") {
            const audioEl = track.attach();
            audioEl.style.display = "none";
            document.body.appendChild(audioEl);
        }
    });

    // Track unsubscribed — remove elements
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
    });

    // Participant connected
    room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant connected:", participant.identity);
        if (!participant.identity.includes("avatar")) {
            updateConnectionStatus("Agent verbonden");
        }
    });

    // Participant disconnected
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant disconnected:", participant.identity);
    });

    // Transcription received — chat + URL detection
    room.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {
        handleTranscription(segments, participant);
    });

    // Handle data received for potential structured messages
    room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
        try {
            const text = new TextDecoder().decode(payload);
            const data = JSON.parse(text);
            if (data.type === "url_change" && data.url) {
                navigateIframe(data.url);
            }
        } catch (e) {
            // Not JSON data, ignore
        }
    });

    // Disconnected
    room.on(RoomEvent.Disconnected, (reason) => {
        console.log("Disconnected:", reason);
        isConnected = false;
        updateConnectionStatus("Verbinding verbroken");
    });

    // Reconnecting
    room.on(RoomEvent.Reconnecting, () => {
        updateConnectionStatus("Opnieuw verbinden...");
    });

    // Reconnected
    room.on(RoomEvent.Reconnected, () => {
        updateConnectionStatus("Verbonden");
    });
}

// ===== Transcription Handling =====
function handleTranscription(segments, participant) {
    const isUser = participant && room && participant.sid === room.localParticipant.sid;
    const senderType = isUser ? "user" : "agent";
    const senderName = isUser ? "U" : "Agent";

    segments.forEach((segment) => {
        const segId = senderType + "-" + segment.id;

        if (transcriptionSegments[segId]) {
            // Update existing message
            const msgEl = transcriptionSegments[segId];
            const textEl = msgEl.querySelector(".message-text");
            if (textEl) {
                textEl.textContent = segment.text;
            }
            if (segment.final) {
                msgEl.classList.remove("partial");
                // Check for URLs in final agent messages
                if (senderType === "agent") {
                    detectAndNavigateUrls(segment.text);
                }
            }
        } else {
            // Create new message
            const msgEl = createChatMessage(senderType, senderName, segment.text, !segment.final);
            transcriptionSegments[segId] = msgEl;

            if (segment.final && senderType === "agent") {
                detectAndNavigateUrls(segment.text);
            }
        }

        scrollChatToBottom();
    });
}

function createChatMessage(type, sender, text, isPartial) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${type}${isPartial ? " partial" : ""}`;

    const senderDiv = document.createElement("div");
    senderDiv.className = "sender";
    senderDiv.textContent = sender;

    const textDiv = document.createElement("div");
    textDiv.className = "message-text";
    textDiv.textContent = text;

    msgDiv.appendChild(senderDiv);
    msgDiv.appendChild(textDiv);

    // Remove welcome message if present
    const welcome = chatMessages.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    chatMessages.appendChild(msgDiv);
    scrollChatToBottom();

    return msgDiv;
}

function addSystemMessage(text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message agent";
    msgDiv.style.background = "#fff3e0";
    msgDiv.style.border = "1px solid #ffcc80";
    msgDiv.style.color = "#e65100";

    const textDiv = document.createElement("div");
    textDiv.className = "message-text";
    textDiv.textContent = text;

    msgDiv.appendChild(textDiv);

    const welcome = chatMessages.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    chatMessages.appendChild(msgDiv);
    scrollChatToBottom();
}

function scrollChatToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// ===== URL Detection & Iframe Navigation =====
function detectAndNavigateUrls(text) {
    // Match URLs in the agent's response
    const urlRegex = /https?:\/\/[^\s,;)"'<>]+/gi;
    const matches = text.match(urlRegex);

    if (matches && matches.length > 0) {
        // Use the last URL mentioned (most likely the one being referred to)
        let url = matches[matches.length - 1];
        // Clean trailing punctuation
        url = url.replace(/[.,;:!?)]+$/, "");
        navigateIframe(url);
    }
}

function navigateIframe(url) {
    try {
        new URL(url); // Validate URL
    } catch (e) {
        return; // Invalid URL
    }

    const currentSrc = backgroundIframe.src;
    if (currentSrc === url) return; // Already on this page

    backgroundIframe.src = url;
    showUrlNotification(url);
}

function showUrlNotification(url) {
    urlNotificationText.textContent = "Navigeren naar: " + url;
    urlNotification.classList.remove("hidden");

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        dismissNotification();
    }, 5000);
}

function dismissNotification() {
    urlNotification.classList.add("hidden");
}

// ===== Microphone Toggle =====
async function toggleMic() {
    if (!room || !isConnected) return;

    micEnabled = !micEnabled;
    try {
        await room.localParticipant.setMicrophoneEnabled(micEnabled);
    } catch (error) {
        console.error("Mic toggle error:", error);
        micEnabled = !micEnabled; // Revert
        addSystemMessage("Kon de microfoon niet schakelen. Controleer uw browserinstellingen.");
    }
    updateMicUI();
}

function updateMicUI() {
    if (micEnabled) {
        micToggle.classList.remove("muted");
        micIconOn.classList.remove("hidden");
        micIconOff.classList.add("hidden");
        micLabel.textContent = "Microfoon aan";
    } else {
        micToggle.classList.add("muted");
        micIconOn.classList.add("hidden");
        micIconOff.classList.remove("hidden");
        micLabel.textContent = "Microfoon uit";
    }
}

// ===== Connection Status =====
function updateConnectionStatus(status) {
    connectionStatus.textContent = status;
    if (status === "Verbonden" || status === "Agent verbonden") {
        connectionStatus.classList.add("connected");
    } else {
        connectionStatus.classList.remove("connected");
    }
}

// ===== Iframe Load Detection =====
backgroundIframe.addEventListener("load", () => {
    const fallback = document.getElementById("iframe-fallback");
    if (fallback) fallback.classList.add("hidden");
});

// If iframe fails to load (e.g. X-Frame-Options), show fallback after timeout
setTimeout(() => {
    try {
        // Try accessing iframe content — will throw if cross-origin blocked
        const _ = backgroundIframe.contentDocument;
    } catch (e) {
        // Cross-origin is expected, iframe is loading fine
    }
}, 5000);

// ===== Expose functions to global scope for onclick handlers =====
window.toggleCustomerService = toggleCustomerService;
window.openCustomerService = openCustomerService;
window.closeCustomerService = closeCustomerService;
window.minimizeWindow = minimizeWindow;
window.toggleMic = toggleMic;
window.dismissNotification = dismissNotification;
