import { useEffect, type FC, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { useStore } from "../store/store";
import { useMutation, useQuery, useQueryClient } from "react-query";
import ky from "ky";
import ForceGraph, { type ForceGraphInstance } from "force-graph";
import isMobile from "../util/isMobile";

type Start = {
  words: string[];
  path: string[];
}

const Graph: FC = () => {
  const { nodes, links, current, graph } = useStore.getState();

  useQuery("start", async () => {
    const data = await ky
      .get("./start.json", { timeout: 30000, searchParams: { date: new Date().toISOString() } })
      .json<Start>();
    useStore.setState({
      start: data.words[0],
      current: data.words[0],
      goal: data.words[1],
      nodes: [{ id: data.words[0] }],
      path: data.path,
    });
  });


  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (current) {
      mutateAsync();
    }
  }, [current]);

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
    const { nodes, goal, won } = useStore.getState();
    if (nodes.find((n) => n.id === goal && !won)) {
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
      await mutateAsync();
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
  useStore.setState({ lock: false });


  const { mutateAsync, isLoading: isMutating } = useMutation(
    ["word", current],
    async () => {
      const data = await ky
        .get(`./word.json?word=${current}`, { timeout: 30000 })
        .json<{ words: string[] }>();

      let { nodes, links } = useStore.getState();
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
        data.words.map((word: string) => ({ source: current, target: word }))
      );

      useStore.setState({ nodes, links });
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
        const { won, goal, start: word, capturing } = useStore.getState();
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
        if (node.id === goal) {
          ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
        } else if (node.id === word) {
          ctx.strokeStyle = "rgba(55, 255, 55, 0.8)";
        } else if (pathUpToIndex.includes(node.id)) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
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
        if (node.id === useStore.getState().current && client.isMutating({
          mutationKey: ["word", node.id]
        })) {
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
      return 125;
    });
    Graph.d3Force("charge")!.strength(-100);
    Graph.d3Force("center", null);
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

  const hintsLeft = useStore.getState().hintsLeft;

  return (
    <>
      {!loaded && (
        <div className="w-[100vw] h-[100vh] flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
      {loaded && hintsLeft > 0 && (
        <div className="absolute top-0 right-0 p-4 flex space-x-4 z-[999]">
          <button className="btn btn-primary" onClick={() => {
            const path = useStore.getState().path;
            const nodes = useStore.getState().nodes;
            for (let i = path.length - 1; i > useStore.getState().pathIndex; i--) {
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
          </button>
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
