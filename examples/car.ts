import { ExecutionEngine } from "../src";
import * as fs from "fs";

const executionEngine = new ExecutionEngine();
executionEngine.run(() => "init ok !", ["projectX"], {
  trace: { label: "Project Initiation" },
});

const res = executionEngine.run(
  () => {
    executionEngine.run(() => "Vehicle Design ok!", ["projectX"], {
      trace: {
        label: "Vehicle Design",
        parent: "designAndPlanning",
      },
      config:{
        parallel: true
      }
    });
    executionEngine.run(() => "Production Planning ok!", ["projectX"], {
      trace: {
        label: "Production Planning",
        parent: "designAndPlanning",
      },
      config:{
        parallel: true
      }
    });
    return "design and planning results";
  },
  ["projectX"],
  { trace: { label: "Design and Planning", id: "designAndPlanning" } }
);

const res2 = executionEngine.run(
  () => {
    executionEngine.run(() => "Engine Manufacturing ok!", ["plans"], {
      trace: {
        label: "Engine Manufacturing",
        parent: "ComponentManufacturing"
      },
      config:{
        parallel: true
      }
    });
    executionEngine.run(() => "Body and Chassis ok!", ["plans"], {
      trace: {
        label: "Body and Chassis Production",
        parent: "ComponentManufacturing",
      },
      config:{
        parallel: true
      }
    });
    return ["engine", "chassis"];
  },
  [res],
  { trace: { label: "Component Manufacturing", id: "ComponentManufacturing" } }
);

executionEngine.run(
  () => {
    executionEngine.run(
      () => {
        executionEngine.run(() => "ok!", ["plans"], {
          trace: {
            label: "Engine installation",
            parent: "assembly",
            parallel: true,
          },
        });
        executionEngine.run(() => "ok!", ["plans"], {
          trace: {
            label: "Chassis integration",
            parent: "assembly",
            parallel: true,
          },
        });
        executionEngine.run(() => "ok!", ["plans"], {
          trace: {
            label: "Interior assembly",
            parent: "assembly",
            parallel: true,
          },
        });
      },
      [res],
      { trace: { label: "", id: "assembly", parent: "VehicleAssembly" } }
    );
    executionEngine.run(() => "ok!", ["plans"], {
      trace: { label: "Final Assembly", parent: "VehicleAssembly" },
    });
    return ["engine", "chassis"];
  },
  ["assembly documents", res2],
  { trace: { label: "Vehicle Assembly", id: "VehicleAssembly" } }
);

executionEngine.run(() => "bip bip", ["model X"], {
  trace: { label: "Quality Assurance and Testing" },
});

executionEngine.run(() => "bip bip", ["model X"], {
  trace: { label: "Delivery" },
});

// Retrieve the trace
const finalTrace = executionEngine.getTrace();
const jsonString = JSON.stringify(finalTrace, null, 2);

// Write the JSON string to the file
const filePath = process?.argv?.[1]?.replace(".ts",".json");
fs.writeFile(filePath, jsonString, "utf-8", (err) => {
  if (err) {
    console.error("Error writing JSON to file:", err);
  } else {
    console.log(`JSON data written to ${filePath}`);
  }
});
