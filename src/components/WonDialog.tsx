import { useRef, type FC, useEffect, useState } from "react";
import { useStore } from "../store/store";
import isMobile from "../util/isMobile";
import copy from "copy-to-clipboard";
import { intervalToDuration } from "date-fns";

const WonDialog: FC = () => {
  const { won, goal, clicks, imageDataUrl } = useStore();

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (won) {
      dialogRef.current?.showModal();
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

  if (duration.seconds && duration.seconds > 0) {
    string += `${duration.seconds.toString().padStart(2, "0")}`;
  }


  return (
    <dialog id="dialog" className="modal" ref={dialogRef}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Next word available in {string}</h3>
        <p id="info" className="py-4">
          You found {goal} in {clicks} clicks!
        </p>
        <img id="result" src={imageDataUrl} />
        <div className="modal-action">
          <form method="dialog">
            <button
              id="share"
              className="btn btn-primary"
              onClick={async () => {
                let text = `semantical.fun - I found today's word in ${clicks} clicks!`;
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
            <button className="btn btn-neutral ml-4" onClick={() => dialogRef.current?.close()}>
              Continue exploring
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default WonDialog;
