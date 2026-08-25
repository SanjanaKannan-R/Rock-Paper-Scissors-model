# RPS Vision

RPS Vision is a Flask web application that identifies Rock, Paper, and Scissors hand gestures with a trained TensorFlow/Keras model. It supports image uploads, live webcam prediction, and a local two-player mode that uses one webcam.

## Features

- Rock, Paper, and Scissors gesture prediction
- Live webcam predictions
- Automatic two-player turns using one camera
- Automatic round winner calculation and celebration
- Local score tracking for Player 1, Player 2, and ties

## Requirements

- Python 3.11 or newer
- Webcam permission in your browser for webcam mode

## Installation

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
pip install -r requirements.txt
```

## Run the app

```powershell
python app.py
```

Open this address in a browser:

```text
http://127.0.0.1:5000
```

If you use the existing project environment, run:

```powershell
.\.venv313\Scripts\python.exe app.py
```

## Using live webcam prediction

1. Open the app in a browser.
2. Select **Webcam**.
3. Click **Start camera** and allow browser camera access.
4. Hold your hand clearly within the square frame.
5. The model continuously displays its Rock, Paper, or Scissors prediction.

## Two-player mode

1. Select **2 Players**.
2. Start the camera.
3. Player 1 holds a gesture still until the app locks it automatically.
4. Pass the camera to Player 2.
5. Player 2 holds a gesture still until it is locked.
6. The app shows the winner and updates the score.

For stability, a gesture is accepted only after the same high-confidence prediction is detected in three consecutive webcam frames.

## Model files

The project expects these files in the root folder:

```text
keras_model.h5   # trained Keras gesture classifier
labels.txt       # class labels, one per line
```

`labels.txt` should use this format:

```text
0 Rock
1 Paper
2 Scissors
```

## Improve prediction accuracy

The web app preprocesses each image in the model's expected format: **224 × 224 RGB**, normalized to `[-1, 1]`. If predictions are inaccurate, the model should be retrained with better data.

- Collect 200–500 varied images for each gesture.
- Use different backgrounds, lighting, distances, and hand angles.
- Keep the full hand inside the camera frame.
- Add a `No Gesture` / `Background` class to avoid random predictions when no hand is visible.
- Train with the same webcam and environment you will use during play where possible.

## Troubleshooting

### The camera does not start

- Allow camera permission in the browser.
- Close other apps that are using the webcam.
- Use `http://127.0.0.1:5000` rather than opening the HTML file directly.

### The model does not load

Install all dependencies again:

```powershell
.\.venv313\Scripts\python.exe -m pip install -r requirements.txt
```

Then restart the app. The `/health` endpoint can confirm model status:

```text
http://127.0.0.1:5000/health
```
