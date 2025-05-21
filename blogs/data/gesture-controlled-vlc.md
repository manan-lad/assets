# Gesture Controlled VLC Media Player Using Python

In this project, I have explored a simple application of object detection models. I have used the `yolov3 tiny` model. When this project was made, [YOLO: Real-Time Object Detection](https://pjreddie.com/darknet/yolo/) was the only official implementation of yolo on the internet. I trained yolov3 to recognize two hand gestures. Combination of these two hand gestures were than detected and used to control [VLC media player, the best Open Source player - VideoLAN](https://www.videolan.org/vlc/).

... Training Scripts / Instructions will be added later ...

Refer to this [github](https://github.com/manan-lad/GESTURE_CONTROLLED_VLC_YOLO) repo for code reference.

**Understanding the repo structure.**
```text
GESTURE_CONTROLLED_VLC_YOLO/
├── VLC_Controller/        # Handles VLC media player interactions
│   ├── controller.py      # Main script for controlling VLC
├── YOLO_V3_Tiny/          # YOLO v3 Tiny model and detection logic
│   ├── __init__.py        # Initialization file for YOLO module
│   ├── model.py           # YOLO model processing
├── model/                 # Stores trained models and configurations
│   ├── yolov3-tiny-416-int8.zip  # Compressed trained model
├── playlist/              # Playlist management for VLC
│   ├── Jim Guthrie - Sword & Sworcery LP - The Ballad of the Space Babies - 10 Bones McCoy.mp3
│   ├── Jim Guthrie - Sword & Sworcery LP - The Ballad of the Space Babies - 11 Ode To A Room.mp3
│   ├── Jim Guthrie - Sword & Sworcery LP - The Ballad of the Space Babies - 12 The Prettiest Remix.mp3
├── sample/                # Sample images and test data
│   ├── sample.jpg         # Example image for testing
│   ├── showcase.mp4       # Video showcasing the project
├── test-notebooks/        # Jupyter notebooks for testing and debugging
│   ├── VLC Controller test.ipynb
│   ├── model testing.ipynb
├── .gitignore             # Git ignore file
├── README.md              # Project documentation
├── main_pc.py             # Main script for PC-based gesture control

```
  
We have majorly defined two components in the repo.
1. YOLO V3 model predictor.
2. VLC Media Player Python controller.

---

Lets look at `models.py` file. This file contains `class Predictor` that will be used to manage the yolo model.


### Class Predictor
#### Overview 
The `Predictor` class is responsible for **loading, processing, and making predictions** using a **TFLite model**. It handles **image preprocessing**, **model inference**, and **post-processing** to extract meaningful predictions

#### Class Definition
```python
class Predictor:
    def __init__(self, model_path: str):
        self.__initModel(model_path)
```
-   Initializes the `Predictor` class by loading the **TFLite model**.
-   Calls `__initModel()` to set up the model interpreter.

#### Methods
**1.** `__initModel(self, model_path)`
```python
def __initModel(self, model_path):
    if not Path(model_path).exists():
        raise self.ModelDoesNotExist('Check model path')
    self.interpreter = tf.lite.Interpreter(model_path=model_path)
    self.interpreter.allocate_tensors()
    self.input_details = self.interpreter.get_input_details()
    self.output_details = self.interpreter.get_output_details()
    self.input_shape = self.input_details[0]['shape']
    self.input_size = tuple(self.input_shape[1:3])
    self.input_index = self.input_details[0]['index']
```
-   **Loads the TFLite model** and initializes the interpreter.
-   **Extracts input/output tensor details** for inference.
-   **Raises an exception** if the model path is invalid.

**2.** `imageFilter(self, frame, invertBR=False)`
```python
def imageFilter(self, frame, invertBR=False):
    if invertBR:
        frame = cvtColor(frame, COLOR_BGR2RGB)
    image_data = resize(frame, self.input_size)
    image_data = image_data / 255.
    image_data = image_data[np.newaxis, ...].astype(np.float32)
    return image_data
```
-   **Preprocesses an image** before passing it to the model.
-   **Resizes** the image to match the model’s input size.
-   **Normalizes pixel values** to a range of `[0,1]`.

**3.** `forward_pass(self, image)`
```python
def forward_pass(self, image):
    self.interpreter.set_tensor(self.input_index, image)
    self.interpreter.invoke()
    pred = [self.interpreter.get_tensor(self.output_details[i]['index']) for i in range(len(self.output_details))]
    return pred
```
-   **Performs inference** on the input image using the TFLite model.
-   **Extracts predictions** from the model’s output tensors.

**4.** `filter_boxes(self, box_xywh, scores, score_threshold=0.4, input_shape=tf.constant([416,416]))`
```python
def filter_boxes(self, box_xywh, scores, score_threshold=0.4, input_shape=tf.constant([416,416])):
    scores_max = tf.math.reduce_max(scores, axis=-1)
    mask = scores_max >= score_threshold
    class_boxes = tf.boolean_mask(box_xywh, mask)
    pred_conf = tf.boolean_mask(scores, mask)
    class_boxes = tf.reshape(class_boxes, [tf.shape(scores)[0], -1, tf.shape(class_boxes)[-1]])
    pred_conf = tf.reshape(pred_conf, [tf.shape(scores)[0], -1, tf.shape(pred_conf)[-1]])
    box_xy, box_wh = tf.split(class_boxes, (2, 2), axis=-1)
    input_shape = tf.cast(input_shape, dtype=tf.float32)
    box_yx = box_xy[..., ::-1]
    box_hw = box_wh[..., ::-1]
    box_mins = (box_yx - (box_hw / 2.))/ input_shape
    box_maxes = (box_yx + (box_hw / 2.))/ input_shape
    boxes = tf.concat([box_mins[..., 0:1], box_mins[..., 1:2], box_maxes[..., 0:1], box_maxes[..., 1:2]], axis=-1)
    return (boxes, pred_conf)
```
-   **Filters bounding boxes** based on confidence scores.
-   **Reshapes and normalizes** bounding box coordinates.

**5.** `non_max_supression(self, boxes, pred_conf, IOU=0.4, SCORE=0.25)`
```python
def non_max_supression(self, boxes, pred_conf, IOU=0.4, SCORE=0.25):
    classes, valid_detection = tf.image.combined_non_max_suppression(
        boxes=tf.reshape(boxes, (tf.shape(boxes)[0], -1, 1, 4)),
        scores=tf.reshape(pred_conf, (tf.shape(pred_conf)[0], -1, tf.shape(pred_conf)[-1])),
        max_output_size_per_class=50,
        max_total_size=50,
        iou_threshold=IOU,
        score_threshold=SCORE
    )[2:]
    return classes, valid_detection
```
-   **Applies Non-Maximum Suppression (NMS)** to remove overlapping detections.
-   **Filters predictions** based on Intersection over Union (IoU) and confidence score thresholds.

**6.** `getPredictions(self, frame)`
```python
def getPredictions(self, frame):
    frame = self.imageFilter(frame)
    pred = self.forward_pass(frame)
    boxes, pred_conf = self.filter_boxes(pred[1], pred[0], score_threshold=0.25, input_shape=tf.constant([self.input_size]))
    classes, valid_detection = self.non_max_supression(boxes, pred_conf)
    return classes.numpy()[0, :valid_detection.numpy()[0]].astype(int)
```
-   **Runs the full prediction pipeline** on an input frame.
-   **Returns detected classes** after filtering and suppression.

#### Usage Example

```python
predictor = Predictor("model.tflite")
frame = cv2.imread("test.jpg")
predictions = predictor.getPredictions(frame)
print(predictions)
```
-   Loads the model and **processes an image** for prediction.
-   Outputs **detected classes** based on trained gestures.

---
Lets now look at `controller.py` file. This file contains `class VLCController` that will be used to control VLC media player.

### Class Predictor
#### **Overview**
The `VLCController` class is responsible for **managing VLC Media Player playlists** and **executing playback commands** based on predefined signals. It integrates with **Python VLC bindings** to control media playback dynamically.

### **Class Definition**
```python
from vlc import Instance, MediaListPlayer
from pathlib import Path

class VLCController():
    def __init__(self, number_conf: dict):
        self.conf = number_conf
        self.media_player = MediaListPlayer()
```
-   Initializes the **VLCController** class.
-   Stores **configuration mappings** for playback commands.
-   Creates a **MediaListPlayer instance** for handling playlists.
    

### **Methods**
#### **1** `setPlaylist(self, PATH_TO_PLAYLIST)`
```python
def setPlaylist(self, PATH_TO_PLAYLIST: str):
    playlist = Path(PATH_TO_PLAYLIST)
    if not playlist.exists():
        raise ValueError('Playlist does not exist')

    player = Instance()
    media_list = player.media_list_new()

    for path in playlist.glob('*.mp3'):
        media = player.media_new(path)
        media_list.add_media(media)

    self.media_player.set_media_list(media_list)
```
-  **Loads a playlist** from the specified directory. 
-  **Checks if the playlist exists**, raising an error if not found. 
-  **Iterates through** `.mp3` **files** and adds them to VLC’s media list. 
-  **Sets the media list** for playback using `MediaListPlayer`.

#### **2** `configMapper(self, signal)`
```python
def configMapper(self, signal):
    if signal:
        if signal == self.conf['play']:
            self.media_player.play()
        if signal == self.conf['pause']:
            self.media_player.pause()
        if signal == self.conf['stop']:
            self.media_player.stop()
        if signal == self.conf['next']:
            self.media_player.next()
        if signal == self.conf['previous']:
            self.media_player.previous()
```

- **Maps predefined signals** (e.g., play, pause, stop) to VLC commands. 
- **Executes playback actions** based on the received signal.
- **Supports navigation** (next/previous track).

### **Usage Example**
```python
config = {
    "play": "gesture_play",
    "pause": "gesture_pause",
    "stop": "gesture_stop",
    "next": "gesture_next",
    "previous": "gesture_previous"
}

vlc_controller = VLCController(config)
vlc_controller.setPlaylist("path/to/playlist")
vlc_controller.configMapper("gesture_play")  # Starts playback

```
- **Initializes VLCController** with gesture-based commands.
- **Loads a playlist** from the specified directory.
- **Executes playback commands** based on detected gestures.

---
By Combining Yolo Model Predictor and VLC Media Player (`main_pc.py`) we make a script that can be left running on device with a camera enabled to control the song playlist.

```python
from cv2 import VideoCapture
from YOLO_V3_Tiny.model import Predictor
from VLC_Controller.controller import VLCController
from time import sleep

MODEL_PATH = '../model/yolov3-tiny-416-int8.tflite'
VIDEO_PATH = '../sample/showcase.mp4'
PLAYLIST_PATH = '../playlist'

conf = {
    "play": [1],
    "pause": [0],
    "next": [1, 1],
    "previous": [0, 0],
    "stop": [1, 0]
}

cap = VideoCapture(0)
# cap = VideoCapture(VIDEO_PATH)
predictor = Predictor(MODEL_PATH)
controller = VLCController(conf)
controller.setPlaylist(PLAYLIST_PATH)

while(cap.isOpened()):
    ret, frame = cap.read()

    if not ret: break

    detection = predictor.getPredictions(frame)
    print(detection)
    if detection.size > 0:
        controller.configMapper(list(detection))
        sleep(1)
```


## Future Scopes
This script can be improved to Dynamically select and control playlist (video & audio). With just 2 gestures I have made `conf =  {  "play":  [1],  "pause":  [0],  "next":  [1,  1],  "previous":  [0,  0],  "stop":  [1,  0]  }` **5** Functionalities. We can train yolo with more gestures and map them to more functionalities. This project showcases the application of object detection models to act as a gesture-based controller for systems.
