import type { FC } from "react";
import { useStore } from "../store/store";

const Goal: FC = () => {
  const { goals, found } = useStore();
  const goal = goals[0];
  return (
    <>
      {goal && goals.length === 1 && (
        <h1 className="absolute p-4 text-2xl text-primary z-[999]" id="goal">
          Find <strong>{goal}</strong>
        </h1>
      )}
      {goals.length > 1 && (
        // 3x3 grid of goals
        <div className="absolute p-4 text-2xl text-primary z-[999]" id="goal">
          <div className="grid grid-cols-3 gap-0 p-4">
            {goals.map((goal) => (
              <div key={goal} className={`p-4 text-sm text-center border-2 border-primary ${found.includes(goal) ? "bg-stone-300 text-green-700 text-base" : ""}`}>
                <strong>{goal}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Goal;
