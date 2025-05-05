// Simple UI Layout System for Construct 3 with Style Support
// Assumes all instances are WorldInstance with hierarchy support

/**
 * Parses CSS-like text into a style object
 *
 * Supports features:
 * - Property declarations line by line
 * - Optional semicolons
 * - Both camelCase and kebab-case properties (e.g., minWidth or min-width)
 * - Automatic conversion of numeric values
 * - Support for !important declarations
 *
 * @param {string} cssText - CSS-like text with properties
 * @returns {Object} Object containing computed style and important properties
 */
function parseStyle(cssText) {
  if (!cssText) return { computedStyle: {}, importantProperties: [] };

  const computedStyle = {};
  const importantProperties = [];

  // Split the input text by line breaks
  const lines = cssText.split("\n");

  for (let line of lines) {
    // Remove any whitespace and optional semicolon
    line = line.trim();
    if (!line) continue;

    if (line.endsWith(";")) {
      line = line.slice(0, -1);
    }

    // Split by the first colon
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const property = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    if (!property || !value) continue;

    // Check for !important
    const isImportant = value.includes("!important");
    if (isImportant) {
      value = value.replace(/\s*!important\s*$/, "").trim();
      // Convert kebab-case to camelCase for the important list
      importantProperties.push(kebabToCamel(property));
    }

    // Convert kebab-case to camelCase if needed
    const camelProperty = kebabToCamel(property);

    // Convert value if needed (handling numbers)
    computedStyle[camelProperty] = convertValue(value);
  }

  return {
    computedStyle,
    importantProperties,
  };
}

/**
 * Converts kebab-case to camelCase (e.g., min-width → minWidth)
 * @param {string} str - Property name to convert
 * @returns {string} camelCase property name
 */
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (match, group) => group.toUpperCase());
}

/**
 * Converts string values to appropriate types
 * @param {string} value - Value to convert
 * @returns {string|number} Converted value
 */
function convertValue(value) {
  // If it's a pure number (no units), convert to number type
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }

  // Special case for zero with units - just return 0
  if (/^0(px|%|em|rem|pt|vh|vw)$/.test(value)) {
    return 0;
  }

  // Otherwise keep as string (for percentages, auto, etc.)
  return value;
}

/**
 * Merges multiple style objects while respecting !important declarations
 *
 * @param {Array} styleObjects - Array of style objects from parseStyle
 * @returns {Object} Final merged style object
 */
function mergeStyles(styleObjects) {
  if (!styleObjects || !Array.isArray(styleObjects)) return {};

  // Track properties that have been applied with !important
  const appliedImportantProps = new Set();

  // Final computed style to apply to the node
  const finalStyle = {};

  // Process each style object in order (like CSS cascade)
  for (const styleObj of styleObjects) {
    if (!styleObj || !styleObj.computedStyle) continue;

    const { computedStyle, importantProperties = [] } = styleObj;

    // Process each property in the current style
    for (const [prop, value] of Object.entries(computedStyle)) {
      const isCurrentPropImportant = importantProperties.includes(prop);

      // Apply the property if:
      // 1. This property hasn't been applied yet as !important, OR
      // 2. This property is being applied with !important now
      if (!appliedImportantProps.has(prop) || isCurrentPropImportant) {
        finalStyle[prop] = value;

        // Track if we're applying this as important
        if (isCurrentPropImportant) {
          appliedImportantProps.add(prop);
        }
      }
    }
  }

  // Return the final style that was applied (useful for debugging)
  return finalStyle;
}

class UILayout {
  constructor(runtime) {
    this.runtime = runtime;
    // Map to store registered classes and their styles
    this.registeredClasses = new Map();
  }

  /**
   * Register a class with its style definition
   * @param {string} className - Name of the class
   * @param {string} styleString - CSS-like style string
   */
  registerClass(className, styleString) {
    const parsedStyle = parseStyle(styleString);
    this.registeredClasses.set(className, parsedStyle);
  }

  /**
   * Process an instance and its children following correct cascade order
   * @param {WorldInstance} instance - The instance to process
   */
  processInstance(instance) {
    // 1. Calculate and apply styles to current instance
    const styles = this.getInstanceStyles(instance);
    this.applyStylesToInstance(instance, styles);

    // 2. Get layout properties for current instance
    const layoutProps = this.getLayoutProperties(instance);

    if (!instance.getParent()) {
      layoutProps.position = "relative";
    }

    // 3. Separate children into in-flow and out-of-flow
    const children = [...instance.children()];
    const inFlowChildren = [];
    const outOfFlowChildren = [];
    const percentSizedChildren = [];
    const justifyContentChildren = [];

    for (const child of children) {
      // Skip non-visible or explicitly disabled children
      if (!child.isVisible || child.instVars?.doLayout === false) {
        continue;
      }

      // Apply preliminary styles to determine positioning
      const childStyles = this.getInstanceStyles(child);
      child._computedStyles = childStyles;

      // Check if child has percentage-based sizing
      if (this.hasPercentageSizing(childStyles)) {
        percentSizedChildren.push(child);
      }

      // Check if child uses non-default justify-content
      const childLayoutProps = this.getLayoutProperties(child);
      if (
        childLayoutProps.display &&
        childLayoutProps.justifyContent &&
        childLayoutProps.justifyContent !== "start"
      ) {
        justifyContentChildren.push(child);
      }

      const childPosition = childStyles.position || "relative";
      if (childPosition === "absolute" || childPosition === "anchor") {
        outOfFlowChildren.push(child);
      } else {
        inFlowChildren.push(child);
      }
    }

    // 4. FIRST recursively process all in-flow children to establish their sizes
    for (const child of inFlowChildren) {
      this.processInstance(child);
    }

    // 5. THEN apply normal flow layout now that children are properly sized
    if (
      layoutProps.display &&
      layoutProps.position !== "absolute" &&
      layoutProps.position !== "anchor"
    ) {
      this.applyNormalFlowLayout(instance, layoutProps, inFlowChildren);
    }

    // 6. Apply fit-content sizing if needed (after children are sized)
    if (layoutProps.fitContent) {
      this.applyFitContentSizing(instance, layoutProps);
    }
    // 6.1 If size changed and we have percentage-sized children, reapply their sizing
    if (percentSizedChildren.length > 0) {
      for (const child of percentSizedChildren) {
        // Reapply the percentage sizing now that parent dimensions are finalized
        this.applyPercentageSizing(child);
      }

      // 6.2 And reapply layout to ensure positions are correct with new sizes
      if (
        layoutProps.display &&
        layoutProps.position !== "absolute" &&
        layoutProps.position !== "anchor"
      ) {
        this.applyNormalFlowLayout(instance, layoutProps, inFlowChildren);
      }
    }

    // 6.3 If size changed, we also need to update children with justify-content
    if (justifyContentChildren.length > 0) {
      for (const child of justifyContentChildren) {
        const childLayoutProps = this.getLayoutProperties(child);
        const childChildren = this.getLayoutChildren(child);

        // Reapply layout with the updated parent size
        if (
          childLayoutProps.display &&
          childLayoutProps.position !== "absolute" &&
          childLayoutProps.position !== "anchor"
        ) {
          this.applyNormalFlowLayout(child, childLayoutProps, childChildren);
        }
      }
    }

    // 7. Process out-of-flow positioned elements AFTER regular flow
    for (const child of outOfFlowChildren) {
      // Process the out-of-flow child first to ensure its size is calculated
      this.processInstance(child);

      // Now position it relative to its container or anchor target
      this.applyOutOfFlowLayout(child);
    }
  }

  /**
   * Check if an element has percentage-based sizing
   * @param {Object} styles - Element styles
   * @returns {boolean} True if element has percentage sizing
   */
  hasPercentageSizing(styles) {
    // Check for percentWidth/percentHeight properties
    if ("percentWidth" in styles || "percentHeight" in styles) {
      return true;
    }

    // Check for width/height with percentage strings
    if (
      styles.width &&
      typeof styles.width === "string" &&
      styles.width.endsWith("%")
    ) {
      return true;
    }

    if (
      styles.height &&
      typeof styles.height === "string" &&
      styles.height.endsWith("%")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Apply percentage-based sizing to an element
   * @param {WorldInstance} instance - The instance to size
   */
  applyPercentageSizing(instance) {
    if (!instance._computedStyles || !instance.getParent()) {
      return;
    }

    const styles = instance._computedStyles;
    const parent = instance.getParent();
    const parentBoxModel = this.getBoxModel(parent);

    // Apply width percentages if present
    if (
      "percentWidth" in styles ||
      (styles.width &&
        typeof styles.width === "string" &&
        styles.width.endsWith("%"))
    ) {
      const percentValue =
        "percentWidth" in styles
          ? styles.percentWidth
          : parseFloat(styles.width) || 0;

      if (percentValue > 0) {
        const availableWidth =
          parent.width -
          parentBoxModel.padding.left -
          parentBoxModel.padding.right -
          parentBoxModel.border.left -
          parentBoxModel.border.right;

        instance.width = (availableWidth * percentValue) / 100;
      }
    }

    // Apply height percentages if present
    if (
      "percentHeight" in styles ||
      (styles.height &&
        typeof styles.height === "string" &&
        styles.height.endsWith("%"))
    ) {
      const percentValue =
        "percentHeight" in styles
          ? styles.percentHeight
          : parseFloat(styles.height) || 0;

      if (percentValue > 0) {
        const availableHeight =
          parent.height -
          parentBoxModel.padding.top -
          parentBoxModel.padding.bottom -
          parentBoxModel.border.top -
          parentBoxModel.border.bottom;

        instance.height = (availableHeight * percentValue) / 100;
      }
    }

    // Apply min/max constraints if present
    const constraints = {};
    if ("minWidth" in styles) constraints.minWidth = styles.minWidth;
    if ("maxWidth" in styles) constraints.maxWidth = styles.maxWidth;
    if ("minHeight" in styles) constraints.minHeight = styles.minHeight;
    if ("maxHeight" in styles) constraints.maxHeight = styles.maxHeight;

    if (Object.keys(constraints).length > 0) {
      this.applyMinMaxConstraints(instance, constraints);
    }
  }

  /**
   * Get styles for an instance based on its inline style and classes
   * @param {WorldInstance} instance - The instance to get styles for
   * @returns {Object} Merged style object
   */
  getInstanceStyles(instance) {
    const stylesToMerge = [];

    // Get classes from instance variables
    const classString = instance.instVars?.classes || "";
    const classes = classString.split(" ").filter((c) => c.trim());

    // Add styles from each class
    for (const className of classes) {
      if (this.registeredClasses.has(className)) {
        stylesToMerge.push(this.registeredClasses.get(className));
      }
    }

    // Add inline style if present
    const inlineStyle = instance.instVars?.style || "";
    if (inlineStyle) {
      stylesToMerge.push(parseStyle(inlineStyle));
    }

    // Merge all styles
    return mergeStyles(stylesToMerge);
  }

  /**
   * Apply styles to an instance
   * @param {WorldInstance} instance - The instance to apply styles to
   * @param {Object} styles - Style object to apply
   */
  applyStylesToInstance(instance, styles) {
    // Store computed styles on instance for later use
    instance._computedStyles = styles;

    // Build size constraints
    const constraints = {};
    if ("minWidth" in styles) constraints.minWidth = styles.minWidth;
    if ("maxWidth" in styles) constraints.maxWidth = styles.maxWidth;
    if ("minHeight" in styles) constraints.minHeight = styles.minHeight;
    if ("maxHeight" in styles) constraints.maxHeight = styles.maxHeight;

    // Handle percentage sizing if parent exists
    if (instance.getParent()) {
      if (
        "percentWidth" in styles ||
        ("width" in styles &&
          styles.width &&
          typeof styles.width === "string" &&
          styles.width.endsWith("%"))
      ) {
        const percentValue =
          "percentWidth" in styles
            ? styles.percentWidth
            : parseFloat(styles.width) || 0;

        if (percentValue > 0) {
          const parent = instance.getParent();
          const parentBoxModel = this.getBoxModel(parent);
          const availableWidth =
            parent.width -
            parentBoxModel.padding.left -
            parentBoxModel.padding.right -
            parentBoxModel.border.left -
            parentBoxModel.border.right;

          instance.width = (availableWidth * percentValue) / 100;
        }
      }

      if (
        "percentHeight" in styles ||
        ("height" in styles &&
          styles.height &&
          typeof styles.height === "string" &&
          styles.height.endsWith("%"))
      ) {
        const percentValue =
          "percentHeight" in styles
            ? styles.percentHeight
            : parseFloat(styles.height) || 0;

        if (percentValue > 0) {
          const parent = instance.getParent();
          const parentBoxModel = this.getBoxModel(parent);
          const availableHeight =
            parent.height -
            parentBoxModel.padding.top -
            parentBoxModel.padding.bottom -
            parentBoxModel.border.top -
            parentBoxModel.border.bottom;

          instance.height = (availableHeight * percentValue) / 100;
        }
      }
    }

    // Apply explicit width/height if specified as numeric values
    if ("width" in styles && typeof styles.width === "number") {
      instance.width = styles.width;
    }

    if ("height" in styles && typeof styles.height === "number") {
      instance.height = styles.height;
    }

    // Apply min/max constraints after explicit sizing
    if ("minWidth" in constraints) {
      instance.width = Math.max(instance.width, constraints.minWidth);
    }

    if ("maxWidth" in constraints) {
      instance.width = Math.min(instance.width, constraints.maxWidth);
    }

    if ("minHeight" in constraints) {
      instance.height = Math.max(instance.height, constraints.minHeight);
    }

    if ("maxHeight" in constraints) {
      instance.height = Math.min(instance.height, constraints.maxHeight);
    }
  }

  /**
   * Get computed layout properties from styles
   * @param {WorldInstance} instance - The instance to get layout properties for
   * @returns {Object} Layout properties
   */
  getLayoutProperties(instance) {
    if (!instance._computedStyles) {
      const styles = this.getInstanceStyles(instance);
      instance._computedStyles = styles;
    }

    const styles = instance._computedStyles;

    return {
      display: styles.display || "vertical", // vertical, horizontal, grid
      position: styles.position || "relative", // relative, absolute, anchor
      gap: styles.gap || 0,
      padding: styles.padding || 0,
      alignItems: styles.alignItems || styles.alignment || "start", // start, center, end
      justifyContent: styles.justifyContent || "start", // start, center, end, space-between, space-around
      columns: styles.columns || 2,
      fitContent: styles.fitContent || false,
      top: styles.top,
      right: styles.right,
      bottom: styles.bottom,
      left: styles.left,
      // Anchor positioning properties
      anchorTarget: styles.anchorTarget, // ID or instance reference
      anchorPoint: styles.anchorPoint || "center", // Anchor point on target
      selfAnchor: styles.selfAnchor || "center", // Anchor point on self
      anchorOffsetX: styles.anchorOffsetX || 0,
      anchorOffsetY: styles.anchorOffsetY || 0,
    };
  }

  /**
   * Apply normal flow layout (static/relative positioning)
   * @param {WorldInstance} instance - The instance to layout
   * @param {Object} layoutProps - Layout properties
   * @param {Array} children - Children to layout (optional, if already filtered)
   */
  applyNormalFlowLayout(instance, layoutProps, children) {
    // Use provided children or get them if not provided
    const layoutChildren = children || this.getLayoutChildren(instance);

    switch (layoutProps.display) {
      case "vertical":
        this.layoutVertical(instance, layoutProps, layoutChildren);
        break;
      case "horizontal":
        this.layoutHorizontal(instance, layoutProps, layoutChildren);
        break;
      case "grid":
        this.layoutGrid(instance, layoutProps, layoutChildren);
        break;
    }
  }

  /**
   * Apply fit-content sizing to a container based on its children
   * @param {WorldInstance} instance - The container to apply fit-content to
   * @param {Object} layoutProps - Layout properties
   */
  applyFitContentSizing(instance, layoutProps) {
    const children = this.getLayoutChildren(instance);
    const containerBoxModel = this.getBoxModel(instance);

    // Different sizing logic based on display type
    switch (layoutProps.display) {
      case "vertical":
        // Calculate total height and max width
        let totalHeightVertical =
          containerBoxModel.padding.top + containerBoxModel.padding.bottom;
        let maxWidth = 0;

        children.forEach((child, index) => {
          totalHeightVertical += this.getOuterHeight(child);
          if (index < children.length - 1) {
            totalHeightVertical += layoutProps.gap;
          }
          maxWidth = Math.max(maxWidth, this.getOuterWidth(child));
        });

        // Apply new dimensions
        instance.height =
          totalHeightVertical +
          containerBoxModel.border.top +
          containerBoxModel.border.bottom;
        instance.width =
          maxWidth +
          containerBoxModel.padding.left +
          containerBoxModel.padding.right +
          containerBoxModel.border.left +
          containerBoxModel.border.right;
        break;

      case "horizontal":
        // Calculate total width and max height
        let totalWidthHorizontal =
          containerBoxModel.padding.left + containerBoxModel.padding.right;
        let maxHeight = 0;

        children.forEach((child, index) => {
          totalWidthHorizontal += this.getOuterWidth(child);
          if (index < children.length - 1) {
            totalWidthHorizontal += layoutProps.gap;
          }
          maxHeight = Math.max(maxHeight, this.getOuterHeight(child));
        });

        // Apply new dimensions
        instance.width =
          totalWidthHorizontal +
          containerBoxModel.border.left +
          containerBoxModel.border.right;
        instance.height =
          maxHeight +
          containerBoxModel.padding.top +
          containerBoxModel.padding.bottom +
          containerBoxModel.border.top +
          containerBoxModel.border.bottom;
        break;

      case "grid":
        // Grid is more complex, we need to calculate row/column count
        const columns = layoutProps.columns || 2;
        const rows = Math.ceil(children.length / columns);

        // Find max cell dimensions
        let maxCellWidth = 0;
        let maxCellHeight = 0;

        children.forEach((child) => {
          const childBoxModel = this.getBoxModel(child);

          maxCellWidth = Math.max(
            maxCellWidth,
            child.width + childBoxModel.margin.left + childBoxModel.margin.right
          );

          maxCellHeight = Math.max(
            maxCellHeight,
            child.height +
              childBoxModel.margin.top +
              childBoxModel.margin.bottom
          );
        });

        // Calculate total dimensions
        const totalWidthGrid =
          columns * maxCellWidth +
          (columns - 1) * layoutProps.gap +
          containerBoxModel.padding.left +
          containerBoxModel.padding.right +
          containerBoxModel.border.left +
          containerBoxModel.border.right;

        const totalHeightGrid =
          rows * maxCellHeight +
          (rows - 1) * layoutProps.gap +
          containerBoxModel.padding.top +
          containerBoxModel.padding.bottom +
          containerBoxModel.border.top +
          containerBoxModel.border.bottom;

        // Apply new dimensions
        instance.width = totalWidthGrid;
        instance.height = totalHeightGrid;
        break;
    }
  }

  /**
   * Apply out-of-flow layout (absolute/anchor positioning)
   * @param {WorldInstance} instance - The instance to layout
   */
  applyOutOfFlowLayout(instance) {
    if (!instance._computedStyles) {
      const styles = this.getInstanceStyles(instance);
      instance._computedStyles = styles;
    }

    const layoutProps = this.getLayoutProperties(instance);

    switch (layoutProps.position) {
      case "absolute":
        this.positionAbsolute(instance, layoutProps);
        break;
      case "anchor":
        this.positionAnchor(instance, layoutProps);
        break;
    }
  }

  /**
   * Position an element absolutely within its parent
   * @param {WorldInstance} instance - The instance to position
   * @param {Object} layoutProps - Layout properties
   */
  positionAbsolute(instance, layoutProps) {
    if (!instance.getParent()) return;

    const parent = instance.getParent();
    const parentBoxModel = this.getBoxModel(parent);
    const instanceBoxModel = this.getBoxModel(instance);

    // Get content area boundaries (inside padding/border)
    const contentLeft =
      parent.x + parentBoxModel.padding.left + parentBoxModel.border.left;
    const contentTop =
      parent.y + parentBoxModel.padding.top + parentBoxModel.border.top;
    const contentRight =
      parent.x +
      parent.width -
      parentBoxModel.padding.right -
      parentBoxModel.border.right;
    const contentBottom =
      parent.y +
      parent.height -
      parentBoxModel.padding.bottom -
      parentBoxModel.border.bottom;

    // Calculate position based on properties
    let x, y;

    // Handle horizontal positioning
    if (layoutProps.left !== undefined) {
      x = contentLeft + layoutProps.left + instanceBoxModel.margin.left;
    } else if (layoutProps.right !== undefined) {
      x =
        contentRight -
        layoutProps.right -
        instance.width -
        instanceBoxModel.margin.right;
    } else {
      // Default to left: 0
      x = contentLeft + instanceBoxModel.margin.left;
    }

    // Handle vertical positioning
    if (layoutProps.top !== undefined) {
      y = contentTop + layoutProps.top + instanceBoxModel.margin.top;
    } else if (layoutProps.bottom !== undefined) {
      y =
        contentBottom -
        layoutProps.bottom -
        instance.height -
        instanceBoxModel.margin.bottom;
    } else {
      // Default to top: 0
      y = contentTop + instanceBoxModel.margin.top;
    }

    // Apply the position
    instance.x = x;
    instance.y = y;
  }

  /**
   * Position an element using anchor positioning
   * @param {WorldInstance} instance - The instance to position
   * @param {Object} layoutProps - Layout properties
   */
  positionAnchor(instance, layoutProps) {
    let target = null;

    // If no anchor target specified, default to parent
    if (!layoutProps.anchorTarget) {
      target = instance.getParent();
      if (!target) return; // No parent to anchor to
    } else {
      // Find the target element by tag/name
      if (typeof layoutProps.anchorTarget === "string") {
        // Special case: "parent" refers to the parent element
        if (layoutProps.anchorTarget === "parent") {
          target = instance.getParent();
        } else {
          // Look through all objects to find one with matching tag
          for (const objectType of Object.values(this.runtime.objects)) {
            for (const inst of objectType.getAllInstances()) {
              if (inst.hasTags(layoutProps.anchorTarget)) {
                target = inst;
                break;
              }
            }
            if (target) break;
          }
        }
      } else if (
        layoutProps.anchorTarget instanceof this.runtime.objects.WorldInstance
      ) {
        // Direct instance reference
        target = layoutProps.anchorTarget;
      }
    }

    if (!target) return;

    // Ensure we have the current position
    const originalX = instance.x;
    const originalY = instance.y;

    // Get anchor points
    const targetPoint = this.getAnchorPoint(target, layoutProps.anchorPoint);
    const selfPoint = this.getAnchorPoint(
      instance,
      layoutProps.selfAnchor,
      true
    );

    // Calculate offset between anchor points
    const offsetX =
      targetPoint.x -
      (originalX + selfPoint.offsetX) +
      layoutProps.anchorOffsetX;
    const offsetY =
      targetPoint.y -
      (originalY + selfPoint.offsetY) +
      layoutProps.anchorOffsetY;

    // Apply position
    instance.x = originalX + offsetX;
    instance.y = originalY + offsetY;
  }

  /**
   * Get the coordinates of an anchor point on an instance
   * @param {WorldInstance} instance - The instance
   * @param {string} anchor - The anchor point name
   * @param {boolean} returnOffset - If true, return offset from instance origin instead of absolute coordinates
   * @returns {Object} {x, y} coordinates or {offsetX, offsetY} if returnOffset is true
   */
  getAnchorPoint(instance, anchor, returnOffset = false) {
    // Calculate based on anchor point
    let offsetX, offsetY;

    switch (anchor) {
      case "top-left":
        offsetX = 0;
        offsetY = 0;
        break;
      case "top":
      case "top-center":
        offsetX = instance.width / 2;
        offsetY = 0;
        break;
      case "top-right":
        offsetX = instance.width;
        offsetY = 0;
        break;
      case "left":
      case "center-left":
        offsetX = 0;
        offsetY = instance.height / 2;
        break;
      case "center":
        offsetX = instance.width / 2;
        offsetY = instance.height / 2;
        break;
      case "right":
      case "center-right":
        offsetX = instance.width;
        offsetY = instance.height / 2;
        break;
      case "bottom-left":
        offsetX = 0;
        offsetY = instance.height;
        break;
      case "bottom":
      case "bottom-center":
        offsetX = instance.width / 2;
        offsetY = instance.height;
        break;
      case "bottom-right":
        offsetX = instance.width;
        offsetY = instance.height;
        break;
      default:
        // Default to center
        offsetX = instance.width / 2;
        offsetY = instance.height / 2;
    }

    if (returnOffset) {
      return { offsetX, offsetY };
    } else {
      return {
        x: instance.x + offsetX,
        y: instance.y + offsetY,
      };
    }
  }

  /**
   * Get box model properties for an instance
   * @param {WorldInstance} instance - The instance to get box model for
   * @returns {Object} Box model properties
   */
  getBoxModel(instance) {
    if (!instance._computedStyles) {
      const styles = this.getInstanceStyles(instance);
      instance._computedStyles = styles;
    }

    const styles = instance._computedStyles;

    // Get margin (supports individual sides or shorthand)
    const marginTop = styles.marginTop ?? styles.margin ?? 0;
    const marginRight = styles.marginRight ?? styles.margin ?? 0;
    const marginBottom = styles.marginBottom ?? styles.margin ?? 0;
    const marginLeft = styles.marginLeft ?? styles.margin ?? 0;

    // Get padding (supports individual sides or shorthand)
    const paddingTop = styles.paddingTop ?? styles.padding ?? 0;
    const paddingRight = styles.paddingRight ?? styles.padding ?? 0;
    const paddingBottom = styles.paddingBottom ?? styles.padding ?? 0;
    const paddingLeft = styles.paddingLeft ?? styles.padding ?? 0;

    // Get border (for now, just a single border size)
    const borderTop =
      styles.borderTopWidth ?? styles.borderWidth ?? styles.border ?? 0;
    const borderRight =
      styles.borderRightWidth ?? styles.borderWidth ?? styles.border ?? 0;
    const borderBottom =
      styles.borderBottomWidth ?? styles.borderWidth ?? styles.border ?? 0;
    const borderLeft =
      styles.borderLeftWidth ?? styles.borderWidth ?? styles.border ?? 0;

    return {
      margin: {
        top: marginTop,
        right: marginRight,
        bottom: marginBottom,
        left: marginLeft,
      },
      padding: {
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft,
      },
      border: {
        top: borderTop,
        right: borderRight,
        bottom: borderBottom,
        left: borderLeft,
      },
    };
  }

  /**
   * Get the total outer width of an instance including margin
   * @param {WorldInstance} instance - The instance
   * @returns {number} Total width including margin
   */
  getOuterWidth(instance) {
    const boxModel = this.getBoxModel(instance);
    return instance.width + boxModel.margin.left + boxModel.margin.right;
  }

  /**
   * Get the total outer height of an instance including margin
   * @param {WorldInstance} instance - The instance
   * @returns {number} Total height including margin
   */
  getOuterHeight(instance) {
    const boxModel = this.getBoxModel(instance);
    return instance.height + boxModel.margin.top + boxModel.margin.bottom;
  }

  /**
   * Get children that should be included in layout
   * @param {WorldInstance} instance - The parent instance
   * @returns {Array} Array of instances to layout
   */
  getLayoutChildren(instance) {
    return [...instance.children()]
      .filter((child) => {
        // Check if layout is explicitly disabled
        const doLayout = child.instVars?.doLayout;
        if (doLayout === false) return false;

        // Check visibility
        if (!child.isVisible) return false;

        // Apply styles to get computed properties
        if (!child._computedStyles) {
          const childStyles = this.getInstanceStyles(child);
          child._computedStyles = childStyles;
        }

        // Check if child is positioned out of flow
        const childPosition = child._computedStyles.position || "relative";
        if (childPosition === "absolute" || childPosition === "anchor") {
          return false;
        }

        return true;
      })
      .sort((a, b) => (a._layoutOrder || 0) - (b._layoutOrder || 0));
  }

  /**
   * Layout children in a vertical stack
   * @param {WorldInstance} container - The container
   * @param {Object} layoutProps - Layout properties
   * @param {Array} children - Array of child instances
   */
  layoutVertical(container, layoutProps, children) {
    // Get container box model
    const containerBoxModel = this.getBoxModel(container);

    // Extract layout parameters
    const gap = layoutProps.gap || 0;
    const alignment = layoutProps.alignItems || "start";
    const justifyContent = layoutProps.justifyContent || "start";

    // Calculate available space
    const contentHeight =
      container.height -
      containerBoxModel.padding.top -
      containerBoxModel.padding.bottom -
      containerBoxModel.border.top -
      containerBoxModel.border.bottom;

    // Calculate total children height including margins but without gaps
    let totalChildrenHeight = 0;
    children.forEach((child) => {
      const childBoxModel = this.getBoxModel(child);
      totalChildrenHeight +=
        child.height + childBoxModel.margin.top + childBoxModel.margin.bottom;
    });

    // Calculate total gaps (only between elements, not after the last one)
    const totalGaps = children.length > 1 ? gap * (children.length - 1) : 0;

    // Calculate extra space
    const extraSpace = Math.max(
      0,
      contentHeight - totalChildrenHeight - totalGaps
    );

    // Calculate spacing based on justifyContent
    let startOffset = 0;
    let spaceBetween = 0;
    let spaceAround = 0;

    switch (justifyContent) {
      case "start":
        startOffset = 0;
        break;

      case "center":
        startOffset = extraSpace / 2;
        break;

      case "end":
        startOffset = extraSpace;
        break;

      case "space-between":
        spaceBetween =
          children.length > 1 ? extraSpace / (children.length - 1) : 0;
        break;

      case "space-around":
        spaceAround = children.length > 0 ? extraSpace / children.length : 0;
        break;
    }

    // Start position
    let currentY =
      containerBoxModel.padding.top +
      containerBoxModel.border.top +
      startOffset;

    // For space-around, add half space at the beginning
    if (justifyContent === "space-around" && children.length > 0) {
      currentY += spaceAround / 2;
    }

    // Position each child
    children.forEach((child, index) => {
      const childBoxModel = this.getBoxModel(child);

      // Account for child's margin
      currentY += childBoxModel.margin.top;

      // Position child relative to parent
      child.y = container.y + currentY;

      // Handle horizontal alignment
      const contentWidth =
        container.width -
        containerBoxModel.padding.left -
        containerBoxModel.padding.right -
        containerBoxModel.border.left -
        containerBoxModel.border.right;

      const childTotalWidth =
        child.width + childBoxModel.margin.left + childBoxModel.margin.right;

      switch (alignment) {
        case "center":
          child.x =
            container.x +
            containerBoxModel.padding.left +
            containerBoxModel.border.left +
            (contentWidth - childTotalWidth) / 2 +
            childBoxModel.margin.left;
          break;

        case "end":
          child.x =
            container.x +
            container.width -
            containerBoxModel.padding.right -
            containerBoxModel.border.right -
            child.width -
            childBoxModel.margin.right;
          break;

        default: // 'start'
          child.x =
            container.x +
            containerBoxModel.padding.left +
            containerBoxModel.border.left +
            childBoxModel.margin.left;
      }

      // Move to next position
      currentY += child.height + childBoxModel.margin.bottom;

      // Add gap or space-between for next element
      if (index < children.length - 1) {
        currentY += gap;

        // Add extra space for space-between or space-around
        if (justifyContent === "space-between") {
          currentY += spaceBetween;
        } else if (justifyContent === "space-around") {
          currentY += spaceAround;
        }
      }
    });
  }

  /**
   * Layout children in a horizontal row
   * @param {WorldInstance} container - The container
   * @param {Object} layoutProps - Layout properties
   * @param {Array} children - Array of child instances
   */
  layoutHorizontal(container, layoutProps, children) {
    // Get container box model
    const containerBoxModel = this.getBoxModel(container);

    // Extract layout parameters
    const gap = layoutProps.gap || 0;
    const alignment = layoutProps.alignItems || "start";
    const justifyContent = layoutProps.justifyContent || "start";

    // Calculate available space
    const contentWidth =
      container.width -
      containerBoxModel.padding.left -
      containerBoxModel.padding.right -
      containerBoxModel.border.left -
      containerBoxModel.border.right;

    // Calculate total children width including margins but without gaps
    let totalChildrenWidth = 0;
    children.forEach((child) => {
      const childBoxModel = this.getBoxModel(child);
      totalChildrenWidth +=
        child.width + childBoxModel.margin.left + childBoxModel.margin.right;
    });

    // Calculate total gaps (only between elements, not after the last one)
    const totalGaps = children.length > 1 ? gap * (children.length - 1) : 0;

    // Calculate extra space
    const extraSpace = Math.max(
      0,
      contentWidth - totalChildrenWidth - totalGaps
    );

    // Calculate spacing based on justifyContent
    let startOffset = 0;
    let spaceBetween = 0;
    let spaceAround = 0;

    switch (justifyContent) {
      case "start":
        startOffset = 0;
        break;

      case "center":
        startOffset = extraSpace / 2;
        break;

      case "end":
        startOffset = extraSpace;
        break;

      case "space-between":
        spaceBetween =
          children.length > 1 ? extraSpace / (children.length - 1) : 0;
        break;

      case "space-around":
        spaceAround = children.length > 0 ? extraSpace / children.length : 0;
        break;
    }

    // Start position
    let currentX =
      containerBoxModel.padding.left +
      containerBoxModel.border.left +
      startOffset;

    // For space-around, add half space at the beginning
    if (justifyContent === "space-around" && children.length > 0) {
      currentX += spaceAround / 2;
    }

    // Position each child
    children.forEach((child, index) => {
      const childBoxModel = this.getBoxModel(child);

      // Account for child's margin
      currentX += childBoxModel.margin.left;

      // Position child relative to parent
      child.x = container.x + currentX;

      // Handle vertical alignment
      const contentHeight =
        container.height -
        containerBoxModel.padding.top -
        containerBoxModel.padding.bottom -
        containerBoxModel.border.top -
        containerBoxModel.border.bottom;

      const childTotalHeight =
        child.height + childBoxModel.margin.top + childBoxModel.margin.bottom;

      switch (alignment) {
        case "center":
          child.y =
            container.y +
            containerBoxModel.padding.top +
            containerBoxModel.border.top +
            (contentHeight - childTotalHeight) / 2 +
            childBoxModel.margin.top;
          break;

        case "end":
          child.y =
            container.y +
            container.height -
            containerBoxModel.padding.bottom -
            containerBoxModel.border.bottom -
            child.height -
            childBoxModel.margin.bottom;
          break;

        default: // 'start'
          child.y =
            container.y +
            containerBoxModel.padding.top +
            containerBoxModel.border.top +
            childBoxModel.margin.top;
      }

      // Move to next position
      currentX += child.width + childBoxModel.margin.right;

      // Add gap or space-between for next element
      if (index < children.length - 1) {
        currentX += gap;

        // Add extra space for space-between or space-around
        if (justifyContent === "space-between") {
          currentX += spaceBetween;
        } else if (justifyContent === "space-around") {
          currentX += spaceAround;
        }
      }
    });
  }

  /**
   * Layout children in a grid
   * @param {WorldInstance} container - The container
   * @param {Object} layoutProps - Layout properties
   * @param {Array} children - Array of child instances
   */
  layoutGrid(container, layoutProps, children) {
    // Get container box model
    const containerBoxModel = this.getBoxModel(container);

    // Extract layout parameters
    const columns = layoutProps.columns || 2;
    const gap = layoutProps.gap || 0;
    const justifyContent = layoutProps.justifyContent || "start";

    // Calculate available content width
    const contentWidth =
      container.width -
      containerBoxModel.padding.left -
      containerBoxModel.padding.right -
      containerBoxModel.border.left -
      containerBoxModel.border.right;

    // Calculate grid metrics
    const numRows = Math.ceil(children.length / columns);

    // Get maximum cell dimensions
    let maxCellWidth = 0;
    let maxCellHeight = 0;

    children.forEach((gridChild) => {
      const gridChildBoxModel = this.getBoxModel(gridChild);

      maxCellWidth = Math.max(
        maxCellWidth,
        gridChild.width +
          gridChildBoxModel.margin.left +
          gridChildBoxModel.margin.right
      );

      maxCellHeight = Math.max(
        maxCellHeight,
        gridChild.height +
          gridChildBoxModel.margin.top +
          gridChildBoxModel.margin.bottom
      );
    });

    // Calculate row and column metrics for justify-content
    // The width needed for all cells without any extra spacing
    const totalCellWidth = maxCellWidth * columns;

    // The total width of gaps between cells (not including any extra space)
    const totalGapWidth = (columns - 1) * gap;

    // The total width needed for cells and basic gaps
    const totalWidthNeeded = totalCellWidth + totalGapWidth;

    // Any extra space available
    const extraWidth = Math.max(0, contentWidth - totalWidthNeeded);

    // Calculate position adjustments based on justifyContent
    let startOffsetX = 0;
    let extraColumnGap = 0;

    switch (justifyContent) {
      case "start":
        startOffsetX = 0;
        break;

      case "center":
        startOffsetX = extraWidth / 2;
        break;

      case "end":
        startOffsetX = extraWidth;
        break;

      case "space-between":
        // Only add extra space between columns if there are multiple columns
        extraColumnGap = columns > 1 ? extraWidth / (columns - 1) : 0;
        break;

      case "space-around":
        // Add space around each column
        startOffsetX = extraWidth / columns / 2;
        extraColumnGap = extraWidth / columns;
        break;
    }

    // Now position each child
    children.forEach((child, index) => {
      const childBoxModel = this.getBoxModel(child);

      // Calculate grid position
      const row = Math.floor(index / columns);
      const col = index % columns;

      // Calculate base position
      const baseX =
        containerBoxModel.padding.left +
        containerBoxModel.border.left +
        startOffsetX;
      const baseY =
        containerBoxModel.padding.top + containerBoxModel.border.top;

      // Position with justify-content applied
      child.x =
        container.x +
        baseX +
        col * (maxCellWidth + gap + extraColumnGap) +
        childBoxModel.margin.left;

      child.y =
        container.y +
        baseY +
        row * (maxCellHeight + gap) +
        childBoxModel.margin.top;
    });
  }
}

// Export for use in Construct 3
export default UILayout;
