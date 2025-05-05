import UILayout from "./ui_layout.js";
import UILayoutDebug from "./ui_layout_debug.js"; // Updated version of UILayout

function registerClasses(layout) {
  // Register some default classes
  layout.registerClass(
    "vertical",
    `
        display: vertical
        gap: 10
        padding: 20
        align-items: center
        fit-content: true
    `
  );

  layout.registerClass(
    "horizontal",
    `
        display: horizontal
        gap: 10
        padding: 15
        align-items: center
        fit-content: true
    `
  );

  layout.registerClass(
    "grid",
    `
        display: grid
        columns: 3
        gap: 15
        padding: 20
    `
  );

  layout.registerClass(
    "card",
    `
        min-width: 200
        min-height: 100
        padding: 10
        border: 2
        margin: 8
    `
  );

  layout.registerClass(
    "primary-button",
    `
        width: 120
        height: 40
        min-width: 100
        max-width: 200
        margin: 4
    `
  );

  layout.registerClass(
    "absolute-overlay",
    `
        position: absolute
        top: 10
        right: 10
        padding: 5
        border: 1
    `
  );

  layout.registerClass(
    "centered-modal",
    `
        position: absolute
        top: 50
        left: 50
        width: 300
        height: 200
        margin: -100 0 0 -150
    `
  );

  layout.registerClass(
    "bottom-bar",
    `
        position: absolute
        bottom: 0
        left: 0
        right: 0
        height: 50
        padding: 10
    `
  );

  layout.registerClass(
    "tooltip",
    `
        position: anchor
        anchor-point: bottom
        self-anchor: top
        anchor-offset-y: 5
        padding: 5
        border: 1
    `
  );

  layout.registerClass(
    "dropdown",
    `
        position: anchor
        anchor-point: bottom-left
        self-anchor: top-left
        anchor-offset-y: 2
        min-width: 150
        padding: 10
    `
  );

  layout.registerClass(
    "popup-menu",
    `
        position: anchor
        anchor-point: top-right
        self-anchor: top-left
        anchor-offset-x: 5
        min-width: 120
        padding: 8
    `
  );
}

// Runtime script with CSS-based layout system
runOnStartup(async (runtime) => {
  //const layout = new UILayout(runtime);

  const layout = new UILayoutDebug(runtime);
  registerClasses(layout);
  window.layoutDebugEnabled = false;
  window.layoutDebugRoot = null;

  // Make debug functions globally available
  window.startLayoutDebug = (rootInstanceId) => {
    const instances = runtime.objects.Panel.getAllInstances();
    const rootInstance = instances.find((inst) => inst.hasTags(rootInstanceId));

    if (!rootInstance) {
      console.error(`Root instance with ID "${rootInstanceId}" not found`);
      return;
    }

    layout.enableDebugMode(rootInstance);
    window.layoutDebugEnabled = true;
    window.layoutDebugRoot = rootInstance;

    console.log(
      `Debug started for instance with tag "${rootInstanceId}". Press "n" key to step through or call nextLayoutStep()`
    );
  };

  window.nextLayoutStep = () => {
    return layout.nextStep();
  };

  window.stopLayoutDebug = () => {
    layout.disableDebugMode();
    window.layoutDebugEnabled = false;
    window.layoutDebugRoot = null;
    console.log("Layout debugging stopped");
  };

  // Add a keyboard shortcut for advancing the debug
  window.addEventListener("keydown", (e) => {
    if (window.layoutDebugEnabled && e.key === "n") {
      window.nextLayoutStep();
    }
  });

  // Modified event handler for layout processing
  runtime.addEventListener("tick2", () => {
    // If in debug mode, don't do automatic layout
    if (window.layoutDebugEnabled) return;

    // Process all root instances that have styles
    const allInstances = [...runtime.objects.Panel.getAllInstances()];

    allInstances.forEach((instance) => {
      if (instance.getParent()) return; // Skip if instance has a parent
      layout.processInstance(instance);
    });
  });
});

// Example usage:
/*
// In the browser console:
startLayoutDebug("root");  // Start debugging the instance with the "root" tag
nextLayoutStep();          // Move to the next step
stopLayoutDebug();         // Stop debugging

// Or use the 'n' key to step through the layout process
*/
