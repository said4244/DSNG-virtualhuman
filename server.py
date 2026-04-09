import os
import uuid
from dotenv import load_dotenv
from flask import Flask, render_template, jsonify, request
from livekit import api

load_dotenv()

app = Flask(__name__)


@app.route("/")
def index():
    livekit_url = os.getenv("LIVEKIT_URL", "")
    return render_template("index.html", livekit_url=livekit_url)


@app.route("/api/token")
def get_token():
    room = request.args.get("room")
    identity = request.args.get("identity")

    if not room or not identity:
        return jsonify({"error": "Missing room or identity parameter"}), 400

    token = (
        api.AccessToken(
            os.getenv("LIVEKIT_API_KEY"),
            os.getenv("LIVEKIT_API_SECRET"),
        )
        .with_identity(identity)
        .with_name("Klant")
        .with_grants(api.VideoGrants(room_join=True, room=room))
        .with_room_config(
            api.RoomConfiguration(
                agents=[
                    api.RoomAgentDispatch(agent_name="stap-naar-gezonder")
                ],
            ),
        )
        .to_jwt()
    )

    return jsonify({"token": token, "url": os.getenv("LIVEKIT_URL", "")})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
