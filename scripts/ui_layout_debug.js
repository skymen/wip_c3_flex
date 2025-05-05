import UILayout from "./ui_layout.js";

/**
 * Generator function that processes the layout of an instance and its children step by step
 * @param {UILayout} layoutInstance - The UILayout class instance
 * @param {WorldInstance} instance - The instance to layout
 * @yields {Object} Debug info about current step
 */
function* processInstanceStepByStep(layoutInstance, instance) {
  // Helper function to get readable description of an instance
  function getInstanceInfo(inst) {
    return {
      id: [...inst.getAllTags()].join(" ") || "<anonymous>",
      classes: inst.instVars?.classes || "",
      position: [inst.x, inst.y],
      size: [inst.width, inst.height],
      styles: inst._computedStyles || {},
    };
  }

  // 1. Calculate and apply styles to current instance
  const styles = layoutInstance.getInstanceStyles(instance);
  layoutInstance.applyStylesToInstance(instance, styles);

  yield {
    step: "1. Applied styles to instance",
    instance: getInstanceInfo(instance),
    styles,
  };

  // 2. Get layout properties
  const layoutProps = layoutInstance.getLayoutProperties(instance);

  yield {
    step: "2. Retrieved layout properties",
    instance: getInstanceInfo(instance),
    layoutProps,
  };

  // 3. Separate children into in-flow and out-of-flow
  const children = [...instance.children()];
  const inFlowChildren = [];
  const outOfFlowChildren = [];
  const percentSizedChildren = [];

  for (const child of children) {
    // Skip non-visible or explicitly disabled children
    if (!child.isVisible || child.instVars?.doLayout === false) {
      continue;
    }

    // Apply preliminary styles to determine positioning
    const childStyles = layoutInstance.getInstanceStyles(child);
    child._computedStyles = childStyles;

    // Check if child has percentage-based sizing
    if (layoutInstance.hasPercentageSizing(childStyles)) {
      percentSizedChildren.push(child);
    }

    const childPosition = childStyles.position || "relative";
    if (childPosition === "absolute" || childPosition === "anchor") {
      outOfFlowChildren.push(child);
    } else {
      inFlowChildren.push(child);
    }
  }

  yield {
    step: "3. Separated children into flow types",
    instance: getInstanceInfo(instance),
    inFlowCount: inFlowChildren.length,
    outOfFlowCount: outOfFlowChildren.length,
    percentSizedCount: percentSizedChildren.length,
  };

  // 4. Recursively process all in-flow children FIRST
  yield {
    step: "4. Processing in-flow children first",
    instance: getInstanceInfo(instance),
    childCount: inFlowChildren.length,
  };

  for (let i = 0; i < inFlowChildren.length; i++) {
    const child = inFlowChildren[i];

    yield {
      step: `4.${i + 1}. Processing in-flow child ${i + 1}/${
        inFlowChildren.length
      }`,
      parent: getInstanceInfo(instance),
      child: getInstanceInfo(child),
    };

    // Recursively process this child's layout (yield* delegates to the child generator)
    yield* processInstanceStepByStep(layoutInstance, child);

    yield {
      step: `4.${i + 1}. Completed in-flow child ${i + 1}/${
        inFlowChildren.length
      }`,
      parent: getInstanceInfo(instance),
      child: getInstanceInfo(child),
    };
  }

  // 5. THEN apply normal flow layout with correctly sized children
  if (
    layoutProps.display &&
    layoutProps.position !== "absolute" &&
    layoutProps.position !== "anchor"
  ) {
    yield {
      step: "5. Applying normal flow layout",
      instance: getInstanceInfo(instance),
      layoutType: layoutProps.display,
    };

    layoutInstance.applyNormalFlowLayout(instance, layoutProps, inFlowChildren);

    yield {
      step: "5. Normal flow layout applied",
      instance: getInstanceInfo(instance),
      children: inFlowChildren.map(getInstanceInfo),
    };
  }

  // 6. Apply fit-content sizing if needed (after children are sized)
  if (layoutProps.fitContent) {
    yield {
      step: "6. Applying fit-content sizing",
      instance: getInstanceInfo(instance),
    };

    layoutInstance.applyFitContentSizing(instance, layoutProps);

    // Track sizes after fit-content is applied
    const sizeAfterFitContent = [instance.width, instance.height];

    yield {
      step: "6. Fit-content sizing applied",
      instance: getInstanceInfo(instance),
      newSize: sizeAfterFitContent,
    };

    // 6.1 If we have percentage-sized children, reapply their sizing
    if (percentSizedChildren.length > 0) {
      yield {
        step: "6.1. Reapplying percentage sizing for children",
        instance: getInstanceInfo(instance),
        percentChildrenCount: percentSizedChildren.length,
      };

      for (const child of percentSizedChildren) {
        const beforeSize = [child.width, child.height];
        layoutInstance.applyPercentageSizing(child);
        const afterSize = [child.width, child.height];

        yield {
          step: "6.1. Percentage sizing reapplied to child",
          parent: getInstanceInfo(instance),
          child: getInstanceInfo(child),
          sizeBefore: beforeSize,
          sizeAfter: afterSize,
        };
      }

      // 6.2 Reapply layout with new child sizes
      if (
        layoutProps.display &&
        layoutProps.position !== "absolute" &&
        layoutProps.position !== "anchor"
      ) {
        yield {
          step: "6.2. Reapplying layout with updated percentage-sized children",
          instance: getInstanceInfo(instance),
        };

        layoutInstance.applyNormalFlowLayout(
          instance,
          layoutProps,
          inFlowChildren
        );

        yield {
          step: "6.2. Layout reapplied",
          instance: getInstanceInfo(instance),
          children: inFlowChildren.map(getInstanceInfo),
        };
      }
    }
  }

  // 7. Process out-of-flow positioned elements
  yield {
    step: "7. Processing out-of-flow children",
    instance: getInstanceInfo(instance),
    childCount: outOfFlowChildren.length,
  };

  for (let i = 0; i < outOfFlowChildren.length; i++) {
    const child = outOfFlowChildren[i];

    yield {
      step: `7.${i + 1}. Processing out-of-flow child ${i + 1}/${
        outOfFlowChildren.length
      }`,
      parent: getInstanceInfo(instance),
      child: getInstanceInfo(child),
    };

    // Process the out-of-flow child first to ensure its size is calculated
    yield* processInstanceStepByStep(layoutInstance, child);

    // Store position before positioning
    const beforePos = [child.x, child.y];

    // Now position it relative to its container or anchor target
    layoutInstance.applyOutOfFlowLayout(child);

    yield {
      step: `7.${i + 1}. Positioned out-of-flow child ${i + 1}/${
        outOfFlowChildren.length
      }`,
      parent: getInstanceInfo(instance),
      child: getInstanceInfo(child),
      positionBefore: beforePos,
      positionAfter: [child.x, child.y],
    };
  }

  yield {
    step: "Layout complete for instance",
    instance: getInstanceInfo(instance),
  };
}

/**
 * Helper function to highlight an instance for visual debugging
 * @param {Object} runtime - Construct 3 runtime
 * @param {WorldInstance} instance - The instance to highlight
 */
function highlightInstance(runtime, instance) {
  let highlighter = runtime.objects.Highlight.getFirstInstance();
  if (!highlighter) {
    highlighter = runtime.objects.Highlight.createInstance(0, 0, 0);
  }
  highlighter.setSize(instance.width, instance.height);
  highlighter.setPosition(instance.x, instance.y);
  highlighter.moveAdjacentToInstance(instance, true);
}

class UILayoutDebug extends UILayout {
  constructor(runtime) {
    super(runtime);
    this.debugMode = false;
    this.debugGenerator = null;
    this.debugInfo = null;
    this.lastDebugInfo = null;
    this.pendingGenerators = []; // Stack of generators for nested processing
  }

  /**
   * Enable step-by-step debugging
   * @param {WorldInstance} rootInstance - The root instance to debug
   */
  enableDebugMode(rootInstance) {
    this.debugMode = true;
    this.debugGenerator = processInstanceStepByStep(this, rootInstance);
    this.pendingGenerators = [this.debugGenerator];
    this.nextStep(); // Get first step ready
    console.log("Debug mode enabled. Use nextLayoutStep() to proceed.");
  }

  /**
   * Disable debugging mode
   */
  disableDebugMode() {
    this.debugMode = false;
    this.debugGenerator = null;
    this.pendingGenerators = [];
    this.debugInfo = null;
    console.log("Debug mode disabled.");
  }

  /**
   * Move to next debugging step
   * @returns {Object|null} Debug info for the current step or null if complete
   */
  nextStep() {
    if (!this.debugMode || this.pendingGenerators.length === 0) {
      console.warn("Debug mode not enabled or no pending steps.");
      return null;
    }

    // Get the current active generator (top of stack)
    const currentGenerator =
      this.pendingGenerators[this.pendingGenerators.length - 1];

    // Get the next yield value
    const result = currentGenerator.next();

    if (result.done) {
      // This generator is done, remove it from the stack
      this.pendingGenerators.pop();

      // If we still have pending generators, continue with the parent
      if (this.pendingGenerators.length > 0) {
        return this.nextStep();
      } else {
        // All done
        console.log("Layout debugging complete.");
        this.lastDebugInfo = this.debugInfo;
        this.debugInfo = null;
        this.debugMode = false;
        return null;
      }
    }

    // Store and log the debug info
    this.lastDebugInfo = this.debugInfo;
    this.debugInfo = result.value;

    // Highlight the current instance being processed
    if (this.debugInfo.instance) {
      const instanceId = this.debugInfo.instance.id;
      // Find the instance in the runtime
      for (const objectType of Object.values(this.runtime.objects)) {
        for (const inst of objectType.getAllInstances()) {
          if ([...inst.getAllTags()].join(" ") === instanceId) {
            highlightInstance(this.runtime, inst);
            break;
          }
        }
      }
    }

    console.log(
      `%c[LAYOUT DEBUG] ${this.debugInfo.step}`,
      "color: #4CAF50; font-weight: bold"
    );
    console.log(this.debugInfo);

    return this.debugInfo;
  }

  /**
   * Override processInstance to use our debug generator when in debug mode
   * @param {WorldInstance} instance - The instance to process
   */
  processInstance(instance) {
    if (!this.debugMode) {
      // Normal processing when not in debug mode
      return super.processInstance(instance);
    }

    // When in debug mode, processInstance doesn't actually do anything
    // The processing happens step by step via the generator and nextStep()
    return;
  }
}

export default UILayoutDebug;
