# TransitX - Smart Travel Booking System with Sentiment and Crowd Analysis

TransitX is an integrated travel assistant system that allows users to:

* Search and book trains or buses
* View real-time crowd density analysis
* Submit feedback with sentiment analysis

---

## ✨ Features

### 🌐 Web Interface

* Login / Register
* Source-Destination search for buses and trains
* Real-time crowd density visualization (colored rows)
* User feedback submission with sentiment classification (positive/neutral/negative/irrelevant)

### 📊 Sentiment Analysis

* Trained using Twitter feedback dataset
* Random Forest classifier
* TF-IDF vectorization

### 👬 Crowd Density Detection

* Live webcam-based people detection using OpenCV (HOG + SVM)
* Flask API endpoint exposed to frontend via `localhost:5500/density`

### ✨ Backend APIs (Express.js)

* User authentication (register, login)
* Fetch trains and buses
* Launches Python crowd analysis script in background

---

## 📚 Project Structure

```
transitx/
├── app.py                   # Streamlit app for sentiment analysis
├── sentiment_analysis.py    # Model training script (optional)
├── rf_model.pkl             # Trained Random Forest model (to be added)
├── vectorizer.pkl           # Trained TF-IDF vectorizer (to be added)
├── crowd_analyzer.py        # Python Flask + OpenCV crowd detector
├── server.js                # Express backend + MySQL + Python integration

# Frontend HTML Pages
├── login.html
├── register.html
├── main.html
├── contact.html
├── details.html             # Trains display with density color
├── details_buses.html       # Buses display with density color

# Public assets (to be added)
├── images/
│   ├── icon.jpeg
│   ├── image.jpeg
│   ├── busimg.png
│   ├── trainimg.jpg
│   ├── t1.jpeg
│   ├── t2.jpeg
│   └── transitx_logo.jpeg
```

---

## 🚀 Getting Started

### 1. Install Requirements

#### Backend

```bash
cd transitx
npm install express mysql2 body-parser cors
```

#### Python

```bash
pip install flask flask-cors opencv-python nltk scikit-learn streamlit joblib pandas
python -m nltk.downloader punkt stopwords wordnet
```

### 2. Set Up MySQL Database

Create a database named `transitx` and the following tables:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE trains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    train_number VARCHAR(10),
    train_name VARCHAR(100),
    source VARCHAR(100),
    destination VARCHAR(100),
    departure_time VARCHAR(20),
    arrival_time VARCHAR(20),
    duration VARCHAR(20)
);

CREATE TABLE buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bus_number VARCHAR(10),
    bus_name VARCHAR(100),
    source VARCHAR(100),
    destination VARCHAR(100),
    departure_time VARCHAR(20),
    arrival_time VARCHAR(20),
    duration VARCHAR(20)
);
```

### 3. Start the Server

```bash
node server.js
```

It will also launch `crowd_analyzer.py` in background.

### 4. Launch Sentiment App (Optional)

```bash
streamlit run app.py
```

---

## 🌐 Accessing the App

* Navigate to `main.html` in a browser (via VSCode Live Server or any HTTP server)
* Use login/register to access search features
* Train and bus info updates with density color every 10s

---

## 🚫 Notes

* Make sure webcam access is enabled for `crowd_analyzer.py`
* Use secure password storage (e.g., bcrypt) in production
* Currently runs only on `localhost`

---

## 🚀 Future Improvements

* JWT-based authentication
* Google Maps API integration
* Deployment with Docker
* Admin dashboard for feedback insights
