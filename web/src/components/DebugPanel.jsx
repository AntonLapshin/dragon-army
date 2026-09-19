import { useState } from "react";
import styles from "./DebugPanel.module.css";
import { timeAdapter } from "../adapters/timeAdapter.js";
import { sensorAdapter } from "../adapters/stepsAdapter.js";

export default function DebugPanel({ onRender }) {
  const [steps, setSteps] = useState(100);
  const [hours, setHours] = useState(1);
  const [days, setDays] = useState(1);

  function handleAddSteps() {
    sensorAdapter.add(steps);
    onRender();
  }

  function handleJumpTime() {
    timeAdapter.addHours(hours);
    onRender();
  }

  function handleJumpDays() {
    const hrs = days * 24;
    timeAdapter.addHours(hrs);
    onRender();
  }

  function handleReset() {
    sensorAdapter.reset();
    timeAdapter.resetOffset();
    try {
      localStorage.removeItem("dragon_army_state");
    } catch (_) {}
    onRender();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>Debug Panel</div>

      <div className={styles.row}>
        <label>Steps:</label>
        <input
          type="number"
          min="1"
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
          className={styles.input}
        />
        <button className={styles.btn} onClick={handleAddSteps}>
          Add
        </button>
      </div>

      <div className={styles.row}>
        <label>Jump:</label>
        <input
          type="number"
          min="1"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className={styles.input}
        />
        <button className={styles.btn} onClick={handleJumpTime}>
          +{hours}h
        </button>
      </div>

      <div className={styles.row}>
        <label>Fast:</label>
        <input
          type="number"
          min="1"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className={styles.input}
        />
        <button className={styles.btn} onClick={handleJumpDays}>
          +{days}d
        </button>
      </div>

      <div className={styles.row}>
        <button
          className={`${styles.btn} ${styles.danger}`}
          onClick={handleReset}
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}
