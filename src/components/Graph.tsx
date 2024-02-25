import { useEffect, type FC, useState, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { useStore } from "../store/store";
import { useMutation, useQuery } from "react-query";
import ky from "ky";
import ForceGraph, { type ForceGraphInstance } from "force-graph";
import isMobile from "../util/isMobile";

const Graph: FC = () => {
  const { isLoading } = useQuery("start", async () => {
    const data = await ky
      .get("./start.json", { timeout: 30000 })
      .json<string[]>();
    useStore.setState({
      start: data[0],
      current: data[0],
      goal: data[1],
      nodes: [{ id: data[0] }],
    });
  });

  const { nodes, links, current, graph } = useStore.getState();

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (current) {
      mutateAsync();
    }
  }, [current]);

  useEffect(() => {
    const { nodes, goal, won } = useStore.getState();
    if (nodes.find((n) => n.id === goal && !won)) {
      console.log("Won!");
      graph!.zoomToFit(1000, isMobile() ? 100 : 250);
      useStore.setState({ capturing: true, won: true });
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
  // Graph.graphData({
  //   nodes,
  //   links,
  // });
  useStore.setState({ lock: false });

  // return newNodes;

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
    console.log("Creating graph");
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
        const label = node.id;
        const fontSize = 18;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(
          (n) => n + fontSize * 0.8
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
        // draw border around rect
        if (node.id === goal) {
          ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
        } else if (node.id === word) {
          ctx.strokeStyle = "rgba(55, 255, 55, 0.8)";
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
      .zoom(/* check mobile */ window.innerWidth < 600 ? 1.5 : 1)
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
        console.log(node, translate);
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

  return (
    <>
      {!loaded && (
        <div className="w-[100vw] h-[100vh] flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
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
