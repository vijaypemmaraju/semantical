import { useRef, type FC, useEffect, useState } from "react";
import { useStore } from "../store/store";
import isMobile from "../util/isMobile";
import copy from "copy-to-clipboard";
import { intervalToDuration } from "date-fns";

const WonDialog: FC = () => {
  const { won, goal, clicks, imageDataUrl } = useStore();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (won) {
      setOpen(true);
    }
  }, [won]);

  const [timer, setTimer] = useState(0);
  useEffect(() => {
    if (won) {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [won]);


  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const timeUntilBeginningOfNextDayInSeconds = (tomorrow.getTime() - now.getTime());

  const duration = intervalToDuration({ start: 0, end: timeUntilBeginningOfNextDayInSeconds });


  if (duration.hours === 0 && duration.minutes === 0 && duration.seconds === 0) {
    window.location.reload();
  }

  let string = "";
  if (duration.hours && duration.hours > 0) {
    string += `${duration.hours}:`;
  }
  if (duration.minutes && duration.minutes > 0) {
    string += `${duration.minutes.toString().padStart(2, "0")}:`;
  }

  string += `${(duration.seconds || 0).toString().padStart(2, "0")}`;

  const { maxDailyStreak, dailyStreak, totalPlayed, path, hintsLeft } = useStore();

  let grade: string;

  if (clicks - path.length === 0) {
    grade = "S"
  } else if (clicks - path.length < 6) {
    grade = "A";
  } else if (clicks - path.length < 10) {
    grade = "B";
  } else if (clicks - path.length < 15) {
    grade = "C";
  } else if (clicks - path.length < 25) {
    grade = "D";
  } else {
    grade = "E";
  }

  return (
    <dialog id="dialog" className={`modal ${open ? "modal-open" : ""}`}>
      <div className="modal-box w-11/12 max-w-5xl max-h-[100vh]">
        <h3 className="font-bold text-lg">Next word available in {string}</h3>
        <div className="stats shadow flex flex-wrap justify-between items-center">
          <div className="stat place-items-center">
            <div className="stat-title">Today&apos;s word</div>
            <div className="stat-value">{goal}</div>
          </div>

          <div className="stat place-items-center flex-[0.5]">
            <div className="stat-title">Clicks</div>
            <div className="stat-value">{clicks}</div>
          </div>

          <div className="stat place-items-center flex-[0.5]">
            <div className="stat-title">Grade</div>
            <div className="stat-value">{grade}</div>
          </div>

          <div className="stat place-items-center flex-[0.5]">
            <div className="stat-title">Hints used</div>
            <div className="stat-value">{3 - hintsLeft}</div>
          </div>

          <div className="stat place-items-center flex-[0.5]">
            <div className="stat-title">Streak</div>
            <div className="stat-value">{dailyStreak}</div>
          </div>

          <div className="stat place-items-center flex-[0.5]">
            <div className="stat-title">Max Streak</div>
            <div className="stat-value">{maxDailyStreak}</div>
          </div>

          <div className="stat place-items-center flex-[0.5]">
            <div className="stat-title">Total Played</div>
            <div className="stat-value">{totalPlayed}</div>
          </div>

        </div>
        <div className="flex justify-center">
          <img id="result" className="h-[250px]" src={imageDataUrl} />
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button
              id="share"
              className="btn btn-primary"
              onClick={async () => {
                const daysSinceFeb252024 = Math.floor(
                  (new Date().getTime() - new Date("2024-02-25").getTime()) /
                  (1000 * 60 * 60 * 24)
                ) + 1;
                console.log("days since feb 25 2024", daysSinceFeb252024);
                let text = `Semantical #${daysSinceFeb252024}\n${clicks} clicks\nGrade: ${grade}`;
                if (isMobile() && navigator.share) {
                  const blob = await (
                    await fetch(
                      document.getElementById("result")?.getAttribute("src")!
                    )
                  ).blob();
                  const file = new File([blob], "graph.png", {
                    type: blob.type,
                  });
                  navigator.share({
                    title: "I found the word!",
                    text,
                    files: [file],
                  });
                } else {
                  console.log("copying to clipboard", text);
                  setTimeout(() => copy(text), 0);
                  const div = document.createElement("div");
                  div.innerHTML = `<div role="alert" class="alert alert-info absolute top-0 right-0 m-4 p-4 bg-blue-100 text-blue-900 rounded-lg flex items-center space-x-2 w-[50vw]">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  <span>Copied to clipboard.</span>
</div>`;

                  document.querySelector("main")!.appendChild(div);
                  setTimeout(() => {
                    div.remove();
                  }, 3000);
                }
              }}
            >
              Share
            </button>
            <button className="btn btn-neutral ml-4" onClick={() => setOpen(false)}>
              Continue exploring
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default WonDialog;
