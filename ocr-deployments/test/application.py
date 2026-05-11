from flask import Flask

application = Flask(__name__)

@application.route("/")
def index():
    return "OK"

@application.route("/health")
def health():
    return "OK"

if __name__ == "__main__":
    application.run(host="0.0.0.0", port=8080)
