# **Master Specification: "FingerFlow" Biomechanical Typing Tutor**

Version: 1.3.0 (Final Release)  
Target Role: Full-Stack AI Developer  
Objective: Build a high-performance typing application that tracks detailed biomechanical data (keystroke latency, dwell time, flight time) to optimize user typing efficiency.

## **1\. Project Overview & Core Philosophy**

**FingerFlow** is not just a WPM tracker; it is a **typing diagnostics tool**.

* **Core Value:** We record every keydown and keyup event to analyze individual finger performance.  
* **User Interface:** Pure CSS-variable driven themes. Two specific view modes ("Ticker Tape" and "Rolling Window") focusing on smooth motion and instant feedback.  
* **Architecture:** Python FastAPI backend (acting as both API and Log Proxy) \+ React Frontend (High-frequency event capturing).

## **2\. Technical Stack & Standards (Strict)**

### **2.1 Backend**

* **Language:** Python 3.10+  
* **Framework:** FastAPI (Async is mandatory for telemetry ingestion).  
* **ORM:** SQLAlchemy 2.0+ (Strict typing, new 2.0 syntax).  
* **Database:** SQLite (Dev) / PostgreSQL (Prod).  
* **Logging:** structlog (Must output structured JSON to stdout).  
* **Auth:** python-jose (JWT) \+ Google OAuth2 flow.

### **2.2 Frontend**

* **Framework:** React 18+ (Functional Components, Hooks).  
* **Styling:** **CSS Variables (Custom Properties)** for all colors/fonts. Tailwind CSS used *only* for layout geometry (grid, flex, padding), never for colors.  
* **Icons:** Lucide-React.  
* **Telemetry:** Custom buffer logic using navigator.sendBeacon or batched fetch.

## **3\. Database Schema (SQLAlchemy Models)**

The database must support high-frequency write operations for telemetry.

### **3.1 User**

* id: Integer/UUID (Primary Key)  
* email: String (Unique, Indexed)  
* hashed\_password: String (Nullable if OAuth)  
* auth\_provider: String ('local', 'google')  
* created\_at: BigInteger (Unix Timestamp ms)

### **3.2 TypingSession**

* id: Integer (Primary Key)  
* user\_id: ForeignKey(User.id)  
* start\_time: BigInteger  
* end\_time: BigInteger (Nullable)  
* wpm: Float  
* accuracy: Float

### **3.3 TelemetryEvent (The "Big Data" Table)**

* **Production Note:** In a production PostgreSQL environment, this table should ideally use the **TimescaleDB** extension (hypertable) to handle millions of rows efficiently.  
* id: BigInteger (Primary Key)  
* session\_id: ForeignKey(TypingSession.id)  
* event\_type: Enum ('DOWN', 'UP')  
* key\_code: String (e.g., "KeyA", "Space")  
* timestamp\_offset: Integer (Milliseconds since session start)  
* finger\_used: Enum (L\_PINKY, R\_INDEX, etc. \- Mapped on ingestion)  
* is\_error: Boolean

## **4\. Backend Implementation Rules**

### **4.1 Authentication**

* Implement POST /auth/register and POST /auth/login (returns JWT).  
* Implement Google OAuth2:  
  * GET /auth/google/login: Returns Google Auth URL.  
  * GET /auth/google/callback: Exchanges code for token, creates/gets user, issues local JWT.

### **4.2 Telemetry Ingestion (Performance Critical)**

* **Endpoint:** POST /api/sessions/{id}/telemetry  
* **Payload:** { events: List\[TelemetryItem\] }  
* **Logic:**  
  1. Receive batch of 20-50 events.  
  2. Validate Session ID.  
  3. **Bulk Insert** into DB (do not insert one by one).  
  4. Return 200 OK immediately.

### **4.3 Structured Logging Proxy**

* **Goal:** Centralize frontend and backend logs in one JSON stream.  
* **Endpoint:** POST /api/system/logs  
* **Logic:**  
  1. Frontend sends { level, message, context, timestamp }.  
  2. Backend injects user\_id (from JWT) and source="frontend".  
  3. Backend uses structlog to print JSON to stdout.

### **4.4 Analytics & Statistical Requirements**

The backend must provide endpoints to calculate the following metrics on-demand using SQL aggregation or Pandas/Polars.

**A. Basic Performance Metrics**

* **CPM (Characters Per Minute):** Total Correct Keystrokes / Time (min).  
* **Raw WPM (Gross):** (Total Keystrokes / 5\) / Time (min). Includes errors.  
* **Productive WPM (Net):** Raw WPM \- (Total Uncorrected Errors / Time (min)). Measure of useful output speed.  
* **Accuracy:** (Total Correct Keystrokes / Total Keystrokes) \* 100\.

**B. Biomechanical Metrics (The "FingerFlow" Differentiator)**

* **Dwell Time (Hold Time):**  
  * *Calculation:* KeyUp Timestamp \- KeyDown Timestamp.  
  * *Granularity:* Per Key (e.g., 'A'), Per Finger (e.g., Left Pinky), and Global Avg.  
* **Flight Time (Inter-Key Latency):**  
  * *Calculation:* KeyDown(Current) \- KeyUp(Previous).  
  * *Context:* Measures speed of moving between keys. Negative values indicate N-Key Rollover (overlapping presses).  
* **Transition Time (Digraph Latency):**  
  * *Calculation:* KeyDown(Current) \- KeyDown(Previous).  
  * *Context:* Measures the rhythm and speed of specific letter pairs (e.g., 'th', 'er').

**C. Aggregation Scopes**

* **Session Scope:** All metrics calculated for a single session\_id.  
* **Windowed Scope:** Metrics calculated for a specific time slice (e.g., "Seconds 30-60 of Session X"). useful for detecting fatigue.  
* **Historical Scope:** Aggregation over N sessions or date range (e.g., "Last 7 Days").  
* **Evolution/Trend:** Time-series data points showing the delta of WPM/Accuracy/Dwell Time over the user's entire history (Learning Curve).

## **5\. Frontend Implementation Rules**

### **5.1 Theming Engine (CSS Variables)**

* Define all themes in global CSS :root and attribute selectors (e.g., \[data-theme="paper"\]).  
* **Required Variables:**  
  * \--bg-app, \--bg-panel (Backgrounds)  
  * \--text-main, \--text-dim (Typography)  
  * \--accent-primary, \--accent-glow (Highlights)  
  * \--status-error (Feedback)

### **5.2 View Modes & Smooth Scrolling Dynamics**

The visual presentation must be fluid and responsive. Avoid "jumpy" DOM updates.

* **Mode A: Ticker Tape (Horizontal Flow)**  
  * **Layout:** A single horizontal line. The "Current Character" is strictly fixed to the horizontal center (50%) of the container.  
  * **Motion:** As the user types, the *entire text strip* slides smoothly from Right to Left.  
  * **Implementation:** Use CSS transform: translateX(...) combined with transition: transform 100ms linear.  
  * **Smoothness:** The movement must feel continuous, not stepped. If the user types faster than the transition speed (e.g., \>100 WPM), dynamically shorten or disable the transition to prevent input lag/ghosting.  
* **Mode B: Rolling Window (Vertical Flow)**  
  * **Layout:** A vertical block of text (e.g., 3 or 5 lines). The "Active Line" is strictly fixed to the vertical center of the container.  
  * **Motion:** When the user completes a line (hits Enter or wraps automatically), the *entire text block* slides smoothly Upward.  
  * **Implementation:** Use CSS transform: translateY(...) combined with cubic-bezier easing for a satisfying "typewriter return" feel.  
  * **Context:** Previous lines fade to 50% opacity; future lines are 50% opacity. Only the active line is 100% opaque.

### **5.3 Instant Visual Feedback**

The user must receive immediate (\>16ms) visual confirmation of every keystroke.

* **State-Based Styling:** Every character in the text buffer must have a visual state:  
  * Pending: Default text color (e.g., Grey/White).  
  * Correct: Turns **Green** (or Theme Primary Color) instantly.  
  * Error: Turns **Red** (or Theme Error Color) instantly.  
  * Current: The active character should be highlighted (e.g., inverted colors, background block, or scale animation).  
* **The "Flash" Effect:** On an error, the container or the active line should briefly flash a subtle red background tint to alert the user peripherally, allowing them to correct without looking directly at the character.

### **5.4 Visual Guidance (Virtual Keyboard)**

To support the "Finger Mapping" requirement:

* Display a visual representation of a keyboard below the typing area.  
* **Highlights:**  
  * Highlight the key corresponding to the Current character.  
  * (Optional) Highlight the specific finger on a "Virtual Hand" graphic that should be used to press that key.

### **5.5 Telemetry Buffer (The "Invisible" Layer)**

* Create a TelemetryManager class/hook.  
* Listen to window.keydown and window.keyup.  
* **Do not** send API requests on every keystroke.  
* **Buffer Rule:** Push to array. Flush to API when buffer.length \> 50 OR time \> 5000ms.  
* **Reliability:** Use navigator.sendBeacon for flush-on-unload.

## **6\. Development Workflow for the Agent**

1. **Step 1: Backend Skeleton:**  
   * Setup FastAPI, structlog configuration, and Database connection.  
   * Create SQLAlchemy Models.  
2. **Step 2: Auth Layer:**  
   * Implement JWT generation/validation.  
   * Implement Google OAuth stub/flow.  
3. **Step 3: API & Analytics:**  
   * Create the Telemetry Ingestion endpoint (optimized for bulk writes).  
   * Create the Log Proxy endpoint.  
   * **Implement the Analytics Engine** (Section 4.4) using optimized SQL queries.  
4. **Step 4: Frontend Logic:**  
   * Setup React root.  
   * Implement TelemetryManager and Input Handling.  
5. **Step 5: UI Construction:**  
   * Build TickerTape, RollingWindow, and VirtualKeyboard components using the CSS Variable theme engine.  
   * **Crucial:** Tune the CSS transitions to ensure the "Smooth Scrolling" requirements in Section 5.2 are met.

## **7\. Quality Assurance Guidelines**

* **Code Comments:** Explain complex logic, especially the math behind the Ticker Tape scrolling (translateX offsets) and Telemetry buffering.  
* **Error Handling:** The frontend must never crash if the backend is offline; it should cache telemetry locally (localStorage) and retry.  
* **Performance:** No React re-renders on every keystroke for the entire document text. Use CSS classes on individual character spans and CSS transforms for container movement.