import type { FC } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import Graph from "./Graph";
import WonDialog from "./WonDialog";
import { useStore } from "../store/store";
import Goal from "./Goal";

export const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App: FC = () => {
  return (
    <QueryClientProvider client={client}>
      <Goal />
      <div className="w-[100vw] h-[100vh]">
        <Graph />
        <WonDialog />
      </div>
    </QueryClientProvider>
  );
};

export default App;
