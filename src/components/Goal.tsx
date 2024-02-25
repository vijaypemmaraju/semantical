import type { FC } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import Graph from "./Graph";
import WonDialog from "./WonDialog";
import { useStore } from "../store/store";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const Goal: FC = () => {
  const { goal } = useStore();
  return (
    <>{goal && <h1 className="absolute p-4 text-3xl text-primary" id="goal">Find {goal}</h1>}</>
  );
};

export default Goal;
