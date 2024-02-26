import type { FC } from "react";
import { useStore } from "../store/store";

const Goal: FC = () => {
  const { goal } = useStore();
  return (
    <>{goal && <h1 className="absolute p-4 text-2xl text-primary z-[999]" id="goal">
      Find <strong>{goal}</strong></h1>}</>
  );
};

export default Goal;
