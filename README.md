# De Stap naar Gezonder – Virtual Human Agent

A web application that embeds the [De Stap naar Gezonder](https://www.destapnaargezonder.nl/) website and provides an interactive virtual human agent powered by **Tavus** (avatar), **OpenAI Realtime API** (speech-to-speech), and **LiveKit** (real-time communication). Users can click the "Spreek een Agent" button to open a movable video window with a lifelike avatar that answers health-related questions in Dutch and automatically navigates the background website to relevant pages.

---

## Requirements

- **Python 3.12.5** (this is the version the application has been tested on)
- A code editor — we highly recommend **Visual Studio Code**
- A modern web browser (Chrome, Edge, or Firefox)
- API keys for **LiveKit**, **OpenAI**, and **Tavus** (setup instructions below)

---

## File Structure

```
code/
├── .env                        # Environment variables (API keys)
├── agent.py                    # LiveKit agent backend — connects the Tavus avatar
│                                 with the OpenAI Realtime API for speech-to-speech
│                                 conversation and manages the agent's behavior/prompt
├── server.py                   # Flask web server — serves the website and provides
│                                 a token endpoint for LiveKit room authentication
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── static/
│   ├── css/
│   │   └── style.css           # Stylesheet — responsible for the visual styling
│   │                             of the entire website (layout, colors, animations)
│   └── js/
│       └── app.js              # JavaScript — responsible for all frontend functionality
│                                 (LiveKit connection, microphone, chat, URL detection,
│                                 draggable window, avatar video rendering)
└── templates/
    └── index.html              # HTML template — the bone structure of the website
                                  (iframe embed, avatar window, chat panel, buttons)
```

### Key files explained

| File | Purpose |
|------|---------|
| **agent.py** | The LiveKit agent that runs in the background. It initializes the Tavus avatar and the OpenAI Realtime model, defines the system prompt (with all website URLs), and handles the speech-to-speech conversation with the user. |
| **server.py** | A Flask web server that serves the frontend (`index.html`) and exposes an `/api/token` endpoint. When a user clicks "Spreek een Agent", the frontend requests a LiveKit access token from this endpoint to join a room. |
| **.env** | Stores all API keys and configuration. This file is **never** committed to version control. You will fill in your own keys following the instructions below. |

---

## Getting Started

### 1. Clone or download the repository

**Option A — Clone with Git:**
```bash
git clone <repository-url>
cd code
```

**Option B — Download as ZIP:**
1. Download the repository as a ZIP file
2. Extract it to a folder on your computer
3. Open the `code` folder in Visual Studio Code

---

### 2. Create a virtual environment

Open a terminal in Visual Studio Code (Terminal → New Terminal) and make sure you are in the `code` directory.

**Windows:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

You should see `(.venv)` at the beginning of your terminal prompt. This means the virtual environment is active.

---

### 3. Install dependencies

With the virtual environment active, install all required packages. Try the first command — if it doesn't work, try the next one:

```bash
pip install -r requirements.txt
```

If that doesn't work:
```bash
python -m pip install -r requirements.txt
```

If that also doesn't work:
```bash
python3 -m pip install -r requirements.txt
```

If you get a permissions error:
```bash
pip install --user -r requirements.txt
```

---

### 4. Set up API keys

Open the `.env` file in Visual Studio Code. You need to fill in keys for three services: **LiveKit**, **OpenAI**, and **Tavus**.

#### 4.1 — LiveKit

1. Go to [https://livekit.com/](https://livekit.com/)
2. Click **"Start Building"**
3. Complete the sign-up process
4. Fill in a project name
5. Enable agent observability if asked
6. If asked to build your first agent, click **"Skip for now"**
7. Once logged into the LiveKit Cloud dashboard, click on **Settings** in the sidebar
8. Click on **API Keys**
9. There should already be a key waiting for you — click on it. If not, click **"Create Key"** and then click on the new key
10. Click **"Reveal Secret"**
11. A new field will appear called **Environment Variables**, containing:
    ```
    LIVEKIT_URL=wss://your-project.livekit.cloud
    LIVEKIT_API_KEY=your-api-key
    LIVEKIT_API_SECRET=your-api-secret
    ```
12. Copy that entire field and paste it into your `.env` file, replacing the existing LiveKit lines

#### 4.2 — OpenAI

1. Go to [https://platform.openai.com/login](https://platform.openai.com/login)
2. Sign up or log in
3. After logging in, go to the **API Keys** tab in the sidebar
4. Click **"Create new secret key"**
5. Give it a name (e.g., "stap-naar-gezonder")
6. Leave the project as **Default project**
7. Make sure **Permissions** is set to **All**
8. Click **"Create secret key"**
9. You will get an API key that starts with `sk-` — copy it
10. Paste it in the `.env` file as the value for `OPENAI_API_KEY`:
    ```
    OPENAI_API_KEY=sk-your-key-here
    ```
11. **Important:** You need to add funds to your OpenAI account to use the API. Go to **Billing** in the sidebar, add your payment details, and add at least **$5** (this is the minimum OpenAI accepts)

#### 4.3 — Tavus

1. Go to [https://platform.tavus.io/auth/sign-up](https://platform.tavus.io/auth/sign-up)
2. Sign up or log in
3. After logging in, click the **Key icon** in the sidebar
4. Click **"Create New Key"**
5. Give the new key any name you'd like, then click **"Create API Key"**
6. You will get an API key — copy it and paste it in the `.env` file as:
    ```
    TAVUS_API_KEY=your-tavus-key-here
    ```
7. For the demo, you can leave the `TAVUS_REPLICA_ID` and `TAVUS_PERSONA_ID` as they are. If you'd like to customize the avatar, you can browse replicas and personas in the Tavus dashboard (or create your own persona) and paste those IDs instead

#### Final `.env` file

Your `.env` file should look something like this:

```env
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud

OPENAI_API_KEY=sk-your-openai-key
TAVUS_API_KEY=your-tavus-key
TAVUS_REPLICA_ID=r72f7f7f7c8b
TAVUS_PERSONA_ID=pdac61133ac5
```

---

### 5. Run the application

You need **two terminals**, both with the virtual environment activated.

**How to activate the virtual environment (reminder):**

Windows:
```bash
.venv\Scripts\activate
```

macOS / Linux:
```bash
source .venv/bin/activate
```

#### Terminal 1 — Start the agent

```bash
python agent.py dev
```

This starts the LiveKit agent that manages the Tavus avatar and OpenAI Realtime connection. Keep this terminal running.

#### Terminal 2 — Start the web server

```bash
python server.py
```

This starts the Flask web server. You will see output like:

```
 * Running on http://127.0.0.1:5000
```

#### Open the application

Click the link or open your browser and go to:

**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

You should see the De Stap naar Gezonder website. Click the green **"Spreek een Agent"** button in the bottom-right corner to start a conversation with the virtual human agent.

---

## Troubleshooting

- **Microphone not working?** Make sure you allow microphone access when your browser asks for permission.
- **Avatar not appearing?** Check that `agent.py` is running in the first terminal and that your Tavus API key and replica/persona IDs are correct.
- **"Connection failed" error?** Verify that all API keys in the `.env` file are correct and that you have funds on your OpenAI account.

