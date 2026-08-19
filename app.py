import os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")
from flask import Flask, render_template, request, jsonify
import tensorflow as tf
import uuid
import numpy as np
img_to_array = tf.keras.utils.img_to_array
load_img = tf.keras.utils.load_img
class LegacyDepthwiseConv2D(tf.keras.layers.DepthwiseConv2D):
    def __init__(self, groups=1, **kwargs):
        super().__init__(**kwargs)
app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "keras_model.h5")
LABELS_PATH = os.path.join(BASE_DIR, "labels.txt")
LEGACY_LABELS_PATH = os.path.join(BASE_DIR, "lables")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
if not os.path.exists(LABELS_PATH) and os.path.exists(LEGACY_LABELS_PATH):
    import shutil
    shutil.copy2(LEGACY_LABELS_PATH, LABELS_PATH)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print("Loading model...")
model = None
model_error = None
try:
    with open(MODEL_PATH, "rb") as f:
        header = f.read(8)
    if not header.startswith(b"\x89HDF"):
        raise ValueError("The model file is not a valid HDF5 file.")

    model = tf.keras.models.load_model(
        MODEL_PATH,
        compile=False,
        custom_objects={"DepthwiseConv2D": LegacyDepthwiseConv2D},
        safe_mode=False,
    )
    print("Model loaded successfully!")
    print("Input shape:", model.input_shape, "Output shape:", model.output_shape)
except Exception as e:
    model_error = str(e)
    print("Model load failed:", e)
    print("Please replace keras_model.h5 with a valid trained Keras model file.")
    model = None
labels = []
label_file = LABELS_PATH if os.path.exists(LABELS_PATH) else LEGACY_LABELS_PATH
with open(label_file, "r") as file:

    for line in file:

        line = line.strip()

        if not line:
            continue

        parts = line.split(maxsplit=1)

        if len(parts) == 2:
            labels.append(parts[1])

        else:
            labels.append(parts[0])
print("Labels:", labels)
ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}

def allowed_file(filename):

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )
def predict_image(image_path):

    image = load_img(
        image_path,
        target_size=(224, 224),
        color_mode="rgb"
    )

    image_array = img_to_array(image)

    image_array = tf.cast(image_array, tf.float32)

    image_array = (image_array / 127.5) - 1

    image_array = tf.expand_dims(
        image_array,
        axis=0
    )
    predictions = model.predict(
        image_array,
        verbose=0
    )[0]
    predictions = np.asarray(predictions, dtype=np.float32)
    class_index = int(np.argmax(predictions))

    confidence = float(
        predictions[class_index]
    ) * 100
    if class_index < len(labels):
        predicted_label = labels[class_index]

    else:
        predicted_label = f"Class {class_index}"
    all_predictions = []

    for i, probability in enumerate(predictions):

        label = (
            labels[i]
            if i < len(labels)
            else f"Class {i}"
        )

        all_predictions.append({
            "label": label,
            "confidence": round(
                float(probability) * 100,
                2
            )
        })
    all_predictions.sort(
        key=lambda x: x["confidence"],
        reverse=True
    )

    return (
        predicted_label,
        round(confidence, 2),
        all_predictions
    )
@app.route("/")
def home():

    return render_template(
        "index.html"
    )


@app.route("/health")
def health():
    return jsonify({
        "model_loaded": model is not None,
        "model_error": model_error,
        "labels": labels
    })


@app.route(
    "/predict",
    methods=["POST"]
)
def predict():
    if "image" not in request.files:

        return jsonify({
            "success": False,
            "error": "No image uploaded."
        }), 400


    file = request.files["image"]
    if file.filename == "":

        return jsonify({
            "success": False,
            "error": "Please select an image."
        }), 400
    if not allowed_file(file.filename):

        return jsonify({
            "success": False,
            "error": (
                "Invalid file type. "
                "Use JPG, JPEG, PNG or WEBP."
            )
        }), 400

    if model is None:
        return jsonify({
            "success": False,
            "error": "The model is missing or corrupted. Please provide a valid keras_model.h5 file."
        }), 500

    try:
        extension = file.filename.rsplit(
            ".",
            1
        )[1].lower()

        filename = (
            f"{uuid.uuid4().hex}.{extension}"
        )

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )
        file.save(filepath)


        # Predict
        (
            prediction,
            confidence,
            all_predictions
        ) = predict_image(filepath)
        return jsonify({

            "success": True,

            "prediction": prediction,

            "confidence": confidence,

            "all_predictions": all_predictions

        })


    except Exception as e:

        print("Prediction error:", e)

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500
    finally:
        if "filepath" in locals() and os.path.exists(filepath):
            os.remove(filepath)

if __name__ == "__main__":

    app.run(
        debug=False,
        host="127.0.0.1",
        port=5000
    )
