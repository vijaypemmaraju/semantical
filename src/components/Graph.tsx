import { useEffect, type FC, useState, useRef } from "react";
import { useStore, type Mode } from "../store/store";
import { useMutation, useQuery, useQueryClient } from "react-query";
import ky from "ky";
import ForceGraph from "force-graph";
import * as d3 from "d3-force";
import isMobile from "../util/isMobile";
import { startOfDay } from "date-fns";
import { FaSearch, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

type Start = {
  words: string[];
  path: string[];
}

type Bingo = {
  start: string;
  ends: {
    word: string;
    path: string[];
  }[];
}

const Graph: FC = () => {
  const { nodes, links, graph } = useStore.getState();
  const mode = useStore((state) => state.mode);

  useQuery(["start", mode], async () => {
    const date = mode === 'daily' ? startOfDay(new Date()) : new Date();
    const data = await ky
      .get("./start.json", { timeout: 30000, searchParams: { seed: date.getTime() } })
      .json<Start>();
    useStore.setState({
      start: data.words[0],
      current: data.words[0],
      goals: [data.words[1]],
      nodes: [{ id: data.words[0] }],
      path: data.path,
    });
    setTimeout(() => {
      mutateAsync(data.words[0]);
    }, 0);
  }, {
    enabled: mode !== 'bingo',
  });

  useQuery(["bingo", mode], async () => {
    const date = new Date();
    const data = await ky
      .get("./bingo.json", { timeout: 30000, searchParams: { seed: date.getTime() } })
      .json<Bingo>();
    useStore.setState({
      start: data.start,
      current: data.start,
      goals: data.ends.map(e => e.word),
      nodes: [{ id: data.start }],
      // path: data.path,
    });
  }, { enabled: mode === 'bingo' });


  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const resize = () => {
      const graph = useStore.getState().graph;
      if (graph) {
        graph.width(window.innerWidth);
        graph.height(window.innerHeight);
      }
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const client = useQueryClient();

  useEffect(() => {
    const { nodes, goals, found, won } = useStore.getState();
    if (found.length === goals.length && !won) {
      graph!.zoomToFit(1000, isMobile() ? 100 : 250);
      useStore.setState({ capturing: true, won: true });
      useStore.getState().win();
      //   capturing = true;
      let file: File;
      graph!.linkWidth(3);
      setTimeout(async () => {
        const originalCanvas = document.querySelector("canvas")!;
        const heightToUse = isMobile()
          ? originalCanvas.height / 2
          : originalCanvas.height;
        const desiredWidth = 1500;
        const desiredHeight =
          desiredWidth * (heightToUse / originalCanvas.width);
        let startingY = isMobile() ? originalCanvas.height / 4 : 0;
        let endingY = isMobile()
          ? (3 * originalCanvas.height) / 4
          : originalCanvas.height;
        const canvas = document.createElement("canvas");
        canvas.width = desiredWidth;
        canvas.height = desiredHeight;
        // draw background
        const context = canvas.getContext("2d")!;

        context.fillStyle = "#1d232a";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          originalCanvas,
          0,
          startingY,
          originalCanvas.width,
          endingY,
          0,
          0,
          desiredWidth,
          desiredHeight
        );
        const imageUrl = canvas!.toDataURL("image/png");
        document.getElementById("result")!.setAttribute("src", imageUrl);
        const blob = await (
          await fetch(document.getElementById("result")?.getAttribute("src")!)
        ).blob();
        file = new File([blob], "graph.png", { type: blob.type });
        useStore.setState({ imageDataUrl: imageUrl, capturing: false });
        graph!.linkWidth(6);
      }, 1000);
    }
  }, [nodes]);

  const onNodeClick = async (node: any) => {
    node.clicked = true;
    node.loading = true;
    useStore.setState({ current: node.id });
    // node.clicked = true;
    const { graph } = useStore.getState();
    graph!.centerAt(node.x, node.y, 1000);

    try {
      await mutateAsync(node.id);
    } catch (e) {
      console.error(e);
      node.loading = false;
      node.error = true;
      useStore.setState({ lock: false });
      return;
    }

    const { lock } = useStore.getState();

    if (lock) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!lock) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });
    }

    useStore.setState({ lock: true, clicks: useStore.getState().clicks + 1 });

    node.loading = false;
    node.error = false;
    updateGraph();
  };
  (window as any).onNodeClick = onNodeClick;
  useStore.setState({ lock: false });


  const { mutateAsync, isLoading: isMutating } = useMutation(
    ["word"],
    async (word: string) => {
      const data = await ky
        .get(`./word.json?word=${word}`, { timeout: 30000 })
        .json<{ words: string[] }>();

      let { nodes, links, goals, found } = useStore.getState();
      let newNodes: { id: string }[] = [];
      data.words.forEach((word: string) => {
        const newNode = { id: word };
        newNodes.push(newNode);
        nodes.push(newNode);
      });

      // dedupe
      nodes = nodes.filter(
        (node, index, self) => self.findIndex((n) => n.id === node.id) === index
      );
      // add links
      links = links.concat(
        data.words.map((w: string) => ({ source: w, target: word }))
      );

      newNodes.forEach((node) => {
        if (goals.includes(node.id)) {
          found.push(node.id);
        }
      });

      found = Array.from(new Set(found));

      useStore.setState({ nodes, links, found });
      updateGraph();
      setLoaded(true);
    }
  );

  const graphRef = useRef<HTMLDivElement>(null);

  const initializeGraph = async () => {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (graphRef.current) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
    const Graph = ForceGraph()(document.getElementById("graph")!)
      .graphData({
        nodes,
        links,
      })
      .nodeId("id")
      .nodeAutoColorBy("id")
      .nodeCanvasObject((node: any, ctx, globalScale) => {
        const { won, goals, start: word, capturing } = useStore.getState();
        node.size ||= 0.8;
        if (node.hover) {
          node.size = Math.min(node.size + 0.1, 1.1);
        } else {
          node.size = Math.max(node.size - 0.1, 0.8);
        }
        const label = node.id;
        const fontSize = 18;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(
          (n) => n + fontSize * node.size
        ); // some padding
        if (node.hover && !won) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        } else {
          ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
        }
        ctx.fillRect(
          node.x! - bckgDimensions[0] / 2,
          node.y! - bckgDimensions[1] / 2,
          bckgDimensions[0],
          bckgDimensions[1]
        );

        const pathUpToIndex = useStore.getState().path.slice(
          0,
          useStore.getState().pathIndex + 1
        );


        // draw border around rect
        if (goals.includes(node.id)) {
          ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
        } else if (node.id === word) {
          ctx.strokeStyle = "rgba(55, 255, 55, 0.8)";
        } else if (pathUpToIndex.includes(node.id)) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        }

        if (node.tempHighlight) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 3;
        } else {
          ctx.lineWidth = 1;
        }


        ctx.strokeRect(
          node.x! - bckgDimensions[0] / 2,
          node.y! - bckgDimensions[1] / 2,
          bckgDimensions[0],
          bckgDimensions[1]
        );
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = node.clicked ? "rgba(138, 128, 128, 0.8)" : node.color;
        ctx.fillStyle = node.error ? "rgba(255, 0, 0, 0.8)" : ctx.fillStyle;
        if (node.loading) {
          const currentTime = Date.now();
          ctx.beginPath();
          ctx.arc(
            node.x,
            node.y,
            5,
            (currentTime / 100) % (2 * Math.PI),
            ((currentTime / 100) % (2 * Math.PI)) + Math.PI
          );
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.closePath();
        } else if (!capturing) {
          ctx.fillText(label, node.x, node.y);
        }
        // nodesById[node.id] = node;
        node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
      })
      .onNodeClick(onNodeClick)
      .linkWidth(6)
      .zoom(/* check mobile */ window.innerWidth < 600 ? 1.2 : 1)
      .linkColor(() => "rgba(128, 128, 256, 0.2)")
      .linkDirectionalParticles(2)
      .linkCurvature(0.25)
      // .enableNodeDrag(false)
      .onNodeHover((node: any, previousNode: any) => {
        if (node) {
          node.hover = true;
        }
        if (previousNode) {
          previousNode.hover = false;
        }
      })
      .onNodeDragEnd((node, translate) => {
        // if translate is small enough, consider it a click
        if (Math.abs(translate.x) < 10 && Math.abs(translate.y) < 10) {
          onNodeClick(node);
        }
      })
      .linkCanvasObjectMode(() => "after")
      .nodePointerAreaPaint((node: any, color, ctx) => {
        ctx.fillStyle = color;
        const bckgDimensions = node.__bckgDimensions;
        bckgDimensions &&
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );
      });
    Graph.d3Force("link")?.distance(() => {
      return 150;
    });
    // Graph.d3Force("charge")!.strength(-200);
    Graph.d3Force("charge", d3.forceManyBody().strength(-400));
    // Graph.d3Force("center", null);
    Graph.centerAt(0, 0, 1000);
    useStore.setState({ graph: Graph });
    updateGraph();
  };

  const updateGraph = async () => {
    const { nodes, links, graph } = useStore.getState();
    if (graph) {
      graph.graphData({ nodes, links });
    } else {
      await initializeGraph();
      updateGraph();
    }
  };

  const hintsLeft = useStore((state) => state.hintsLeft);
  const goals = useStore((state) => state.goals);
  const found = useStore((state) => state.found);
  const goal = goals[0];

  const [isSearchPanelVisible, setIsSearchPanelVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node && graph) {
      node.tempHighlight = true;
      setTimeout(() => {
        node.tempHighlight = false;
      }, 1000);
      graph.centerAt(node.x, node.y, 1000);
      graph.zoom(2, 1000);
    }
  };

  const filteredNodes = nodes.filter((node) =>
    typeof node.id === "string" && node.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {!loaded && (
        <div className="w-[100vw] h-[100vh] flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
      {loaded && (
        <div className="absolute top-0 left-0 right-0 p-4 flex flex-col md:flex-row items-center z-[999] bg-[rgba(75,75,86,0.4)]">
          <div className="flex items-center space-x-4 overflow-hidden flex-1">
            {goal && goals.length === 1 && (
              <h1 className="p-0 text-2xl text-primary whitespace-nowrap" id="goal">
                Find <strong>{goal}</strong>
              </h1>
            )}
            {goals.length > 1 && (
              <div className="p-0 text-2xl text-primary whitespace-nowrap" id="goal">
                <div className="grid grid-cols-3 gap-0 p-4">
                  {goals.map((goal) => (
                    <div key={goal} className={`p-4 text-sm text-center border-2 border-primary ${found.includes(goal) ? "bg-stone-300 text-green-700 text-base" : ""}`}>
                      <strong>{goal}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-4 md:mt-0 justify-between items-center">
            <details className="dropdown w-full max-w-xs">
              <summary className="btn m-1 flex justify-between items-center">
                {mode} <span className="ml-2">&#x25BC;</span>
              </summary>
              <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-full p-2 shadow">
                <li>
                  <a onClick={() => {
                    useStore.getState().graph?.graphData({ nodes: [], links: [] });
                    useStore.setState({ mode: "daily" as Mode, graph: null, nodes: [], links: [], current: "", start: "", goals: [""], path: [], hintsLeft: 3, clicks: 0 });
                    setLoaded(false);
                  }}>Daily</a>
                </li>
                <li>
                  <a onClick={() => {
                    useStore.getState().graph?.graphData({ nodes: [], links: [] });
                    useStore.setState({ mode: "unlimited" as Mode, graph: null, nodes: [], links: [], current: "", start: "", goals: [""], path: [], hintsLeft: 3, clicks: 0 });
                    setLoaded(false);
                  }}>Unlimited</a>
                </li>
                {/* {!isMobile() && (
                  <li>
                    <a onClick={() => {
                      useStore.getState().graph?.graphData({ nodes: [], links: [] });
                      useStore.setState({ mode: "bingo" as Mode, graph: null, nodes: [], links: [], current: "", start: "", goals: [""], path: [], hintsLeft: 3, clicks: 0 });
                      setLoaded(false);
                    }}>Bingo</a>
                  </li>
                )} */}
              </ul>
            </details>
            {mode !== 'bingo' && <button className="btn btn-primary whitespace-nowrap" onClick={() => {
              const path = useStore.getState().path;
              const nodes = useStore.getState().nodes;
              for (let i = useStore.getState().pathIndex + 1; i < path.length; i++) {
                if (nodes.find(n => n.id === path[i])) {
                  useStore.setState({
                    pathIndex: i,
                    current: path[i],
                    hintsLeft: hintsLeft - 1
                  });
                  onNodeClick(useStore.getState().nodes.find(n => n.id === path[i]));
                  return;
                }
              }
            }}>
              Hint ({hintsLeft} left)
            </button>}
            <button
              className="p-2 bg-primary text-white rounded-lg whitespace-nowrap h-12"
              onClick={() => setIsSearchPanelVisible(!isSearchPanelVisible)}
            >
              {isSearchPanelVisible ? <FaTimes className="text-black" /> : <FaSearch className="text-black" />}
            </button>
          </div>
          <AnimatePresence>
            {isSearchPanelVisible && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-full right-0 bg-black shadow-md rounded-lg w-full sm:w-auto p-4 mt-2"
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search for a word"
                  className="input input-bordered w-full mb-4 rounded-lg text-white"
                />
                <ul className="list-none p-0 max-h-[80vh] overflow-y-auto">
                  {filteredNodes.map((node) => (
                    <li
                      key={node.id}
                      className="cursor-pointer p-2 hover:bg-gray-200 rounded-lg"
                      style={{ color: (node as any).color }}
                      onClick={() => handleClick(node.id as string)}
                    >
                      {node.id}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <div
        id="graph"
        ref={graphRef}
        className="w-full h-full"
        style={{ display: !loaded ? "none" : "block" }}
      ></div>
    </>
  );
};

export default Graph;
