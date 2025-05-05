const sceneOptions = {
  transformX: true,
  transformY: true,
  transformWidth: false, // Don't transform width
  transformHeight: false, // Don't transform height
  transformAngle: false,
  destroyWithParent: true,
};

/**
 * Creates a simple vertical layout with cards
 * @param {Object} runtime - Construct 3 runtime
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} layer - Z-order layer
 * @returns {Object} The root container
 */
export function createSimpleVerticalLayout(runtime, x, y, layer) {
  // Create root container
  const container = runtime.objects.Panel.createInstance(layer, x, y);
  container.instVars.classes = "";
  container.instVars.style = `
        display: vertical
        gap: 10
        padding: 20
        fit-content: true
        border: 2
    `;
  container.setAllTags(new Set(["root"]));
  container.colorRgb = [40 / 255, 40 / 255, 45 / 255]; // Light gray with slight blue tint

  // Create cards
  for (let i = 0; i < 3; i++) {
    const card = runtime.objects.Panel.createInstance(layer, 0, 0);
    card.instVars.style = `
            width: 200
            height: 80
            margin: 5
            border: 1
        `;
    card.instVars.classes = "";
    card.behaviors.DragDrop.isEnabled = false;
    card.behavior;

    // Vary card colors
    switch (i) {
      case 0:
        card.colorRgb = [255 / 255, 230 / 255, 230 / 255]; // Light red
        break;
      case 1:
        card.colorRgb = [230 / 255, 255 / 255, 230 / 255]; // Light green
        break;
      case 2:
        card.colorRgb = [230 / 255, 230 / 255, 255 / 255]; // Light blue
        break;
    }

    // Add to container
    container.addChild(card, sceneOptions);
  }

  return container;
}

/**
 * Creates a horizontal layout with header and footer
 * @param {Object} runtime - Construct 3 runtime
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} layer - Z-order layer
 * @returns {Object} The root container
 */
export function createHorizontalWithHeaderFooter(runtime, x, y, layer) {
  // Create main container
  const viewport = runtime.layout.getLayer(layer).getViewport();
  // const container = runtime.objects.Panel.createInstance(
  //   layer,
  //   viewport.left,
  //   viewport.top
  // );
  const container = runtime.objects.Panel.createInstance(layer, x, y);
  container.instVars.style = `
        display: vertical
        gap: 0
        padding: 0
        border: 2
    `;
  // container.width = viewport.width;
  // container.height = viewport.height;
  container.instVars.classes = "";
  container.setAllTags(new Set(["root", "fullscreen"]));
  container.colorRgb = [45 / 255, 45 / 255, 50 / 255]; // Very light gray

  // container.behaviors.Anchor.isEnabled = true;

  // Create header
  const header = runtime.objects.Panel.createInstance(layer, 0, 0);
  header.instVars.style = `
        height: 60
        width: 100%
        margin: 0
        border-bottom-width: 1
    `;
  header.instVars.classes = "";
  header.behaviors.DragDrop.isEnabled = false;
  header.colorRgb = [70 / 255, 130 / 255, 180 / 255]; // Steel blue
  container.addChild(header, sceneOptions);

  // Create content area with horizontal layout
  const content = runtime.objects.Panel.createInstance(layer, 0, 0);
  content.instVars.style = `
        display: horizontal
        gap: 10
        padding: 10
        height: 280
        width: 100%
        fit-content: true
    `;
  content.instVars.classes = "";
  content.behaviors.DragDrop.isEnabled = false;
  content.colorRgb = [150 / 255, 150 / 255, 155 / 255]; // White with slight blue tint
  container.addChild(content, sceneOptions);

  // Add sidebar to content
  const sidebar = runtime.objects.Panel.createInstance(layer, 0, 0);
  sidebar.instVars.style = `
        width: 120
        height: 100%
        border-right-width: 1
    `;
  sidebar.instVars.classes = "";
  sidebar.behaviors.DragDrop.isEnabled = false;
  sidebar.colorRgb = [240 / 255, 240 / 255, 245 / 255]; // Light gray
  content.addChild(sidebar, sceneOptions);

  // Add main area to content
  const mainArea = runtime.objects.Panel.createInstance(layer, 0, 0);
  mainArea.instVars.style = `
        width: 330
        height: 100%
    `;
  mainArea.instVars.classes = "";
  mainArea.behaviors.DragDrop.isEnabled = false;
  mainArea.colorRgb = [255 / 255, 255 / 255, 255 / 255]; // White
  content.addChild(mainArea, sceneOptions);

  // Create footer
  const footer = runtime.objects.Panel.createInstance(layer, 0, 0);
  footer.instVars.style = `
        height: 40
        width: 100%
        margin: 0
        border-top-width: 1
    `;
  footer.instVars.classes = "";
  footer.behaviors.DragDrop.isEnabled = false;
  footer.colorRgb = [230 / 255, 230 / 255, 240 / 255]; // Light gray
  container.addChild(footer, sceneOptions);

  return container;
}

/**
 * Creates a grid layout dashboard
 * @param {Object} runtime - Construct 3 runtime
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} layer - Z-order layer
 * @returns {Object} The root container
 */
export function createGridDashboard(runtime, x, y, layer) {
  // Create container
  const container = runtime.objects.Panel.createInstance(layer, x, y);
  container.instVars.style = `
        display: grid
        columns: 3
        gap: 15
        padding: 20
        width: 600
        height: 400
        border: 2
        fit-content: true
    `;
  container.setAllTags(new Set(["root"]));
  container.instVars.classes = "";
  container.colorRgb = [245 / 255, 245 / 255, 250 / 255]; // Very light gray

  // Create grid items
  const colors = [
    [255 / 255, 200 / 255, 200 / 255], // Light red
    [200 / 255, 255 / 255, 200 / 255], // Light green
    [200 / 255, 200 / 255, 255 / 255], // Light blue
    [255 / 255, 255 / 255, 200 / 255], // Light yellow
    [255 / 255, 200 / 255, 255 / 255], // Light magenta
    [200 / 255, 255 / 255, 255 / 255], // Light cyan
  ];

  for (let i = 0; i < 6; i++) {
    const item = runtime.objects.Panel.createInstance(layer, 0, 0);
    item.instVars.style = `
            width: 170
            height: 170
            border: 1
        `;
    item.instVars.classes = "";
    item.behaviors.DragDrop.isEnabled = false;
    item.colorRgb = colors[i];
    container.addChild(item, sceneOptions);
  }

  return container;
}

/**
 * Creates a layout with mixed positioning (absolute and anchor)
 * @param {Object} runtime - Construct 3 runtime
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} layer - Z-order layer
 * @returns {Object} The root container
 */
export function createMixedPositioningLayout(runtime, x, y, layer) {
  // Create container
  const container = runtime.objects.Panel.createInstance(layer, x, y);
  container.instVars.style = `
        width: 500
        height: 400
        padding: 15
        border: 2
        align: center
    `;
  container.setAllTags(new Set(["root"]));
  container.instVars.classes = "";
  container.colorRgb = [45 / 255, 45 / 255, 50 / 255]; // Very light gray

  // Create a main panel to interact with
  const mainPanel = runtime.objects.Panel.createInstance(layer, 0, 0);
  mainPanel.instVars.style = `
        width: 200
        height: 150
        position: relative
        marginLeft: 150
        marginTop: 100
    `;
  mainPanel.instVars.classes = "";
  mainPanel.behaviors.DragDrop.isEnabled = false;
  mainPanel.colorRgb = [100 / 255, 149 / 255, 237 / 255]; // Cornflower blue

  // Set a tag for anchoring instead of ID
  mainPanel.setAllTags(new Set(["mainPanel"]));

  container.addChild(mainPanel, sceneOptions);

  // Create absolutely positioned corner elements
  const positions = [
    {
      name: "top-left",
      style: "top: 10; left: 10;",
      color: [255 / 255, 200 / 255, 200 / 255],
    },
    {
      name: "top-right",
      style: "top: 10; right: 10;",
      color: [200 / 255, 255 / 255, 200 / 255],
    },
    {
      name: "bottom-left",
      style: "bottom: 10; left: 10;",
      color: [200 / 255, 200 / 255, 255 / 255],
    },
    {
      name: "bottom-right",
      style: "bottom: 10; right: 10;",
      color: [255 / 255, 255 / 255, 200 / 255],
    },
  ];

  for (const pos of positions) {
    const corner = runtime.objects.Panel.createInstance(layer, 0, 0);
    corner.instVars.style = `
            width: 50
            height: 50
            position: absolute
            ${pos.style.split(";").join("\n")}
            border: 1
        `;
    corner.instVars.classes = "";
    corner.behaviors.DragDrop.isEnabled = false;
    corner.colorRgb = pos.color;
    container.addChild(corner, sceneOptions);
  }

  // Create anchor-positioned tooltip
  const tooltip = runtime.objects.Panel.createInstance(layer, 0, 0);
  tooltip.instVars.style = `
        width: 120
        height: 40
        position: anchor
        anchor-target: mainPanel
        anchor-point: top
        self-anchor: bottom
        anchor-offset-y: -5
        border: 1
    `;
  tooltip.colorRgb = [255 / 255, 255 / 255, 220 / 255]; // Light yellow
  tooltip.instVars.classes = "";
  tooltip.behaviors.DragDrop.isEnabled = false;
  container.addChild(tooltip, sceneOptions);

  // Create anchor-positioned menu
  const menu = runtime.objects.Panel.createInstance(layer, 0, 0);
  menu.instVars.style = `
        width: 100
        height: 150
        position: anchor
        anchor-target: mainPanel
        anchor-point: right
        self-anchor: left
        anchor-offset-x: 10
        border: 1
    `;
  menu.instVars.classes = "";
  menu.behaviors.DragDrop.isEnabled = false;
  menu.colorRgb = [220 / 255, 220 / 255, 255 / 255]; // Light purple
  container.addChild(menu, sceneOptions);

  return container;
}

/**
 * Creates a complex app-like layout
 * @param {Object} runtime - Construct 3 runtime
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} layer - Z-order layer
 * @returns {Object} The root container
 */
export function createComplexAppLayout(runtime, x, y, layer) {
  // Create app container
  const app = runtime.objects.Panel.createInstance(layer, x, y);
  app.instVars.style = `
        display: vertical
        gap: 0
        padding: 0
        width: 0
        height: 0
        align: center
        border: 2
        fit-content: true
    `;
  app.instVars.classes = "";
  app.setAllTags(new Set(["root"]));
  app.colorRgb = [245 / 255, 245 / 255, 250 / 255]; // Very light gray

  // Create header with horizontal layout
  const header = runtime.objects.Panel.createInstance(layer, 0, 0);
  header.instVars.style = `
        display: horizontal
        height: 60
        width: 100%
        padding: 10
        align-items: center
        justify-content: space-between
        border-bottom-width: 1
    `;
  header.instVars.classes = "";
  header.colorRgb = [60 / 255, 80 / 255, 100 / 255]; // Dark blue-gray
  header.behaviors.DragDrop.isEnabled = false;
  app.addChild(header, sceneOptions);

  // Create logo area in header
  const logo = runtime.objects.Panel.createInstance(layer, 0, 0);
  logo.instVars.style = `
        width: 120
        height: 40
    `;
  logo.instVars.classes = "";
  logo.colorRgb = [255 / 255, 255 / 255, 255 / 255]; // White
  logo.behaviors.DragDrop.isEnabled = false;
  logo.opacity = 0.9; // Set opacity directly on the instance
  header.addChild(logo, sceneOptions);

  // Create menu area in header
  const menu = runtime.objects.Panel.createInstance(layer, 0, 0);
  menu.instVars.style = `
        display: horizontal
        gap: 10
        width: 300
        height: 40
        align-items: center
    `;
  menu.instVars.classes = "";
  menu.behaviors.DragDrop.isEnabled = false;
  menu.colorRgb = [60 / 255, 80 / 255, 100 / 255]; // Same as header
  header.addChild(menu, sceneOptions);

  // Create menu items
  for (let i = 0; i < 3; i++) {
    const menuItem = runtime.objects.Panel.createInstance(layer, 0, 0);
    menuItem.instVars.style = `
            width: 80
            height: 30
            border: 1
        `;
    menuItem.instVars.classes = "";
    menuItem.behaviors.DragDrop.isEnabled = false;
    menuItem.colorRgb = [80 / 255, 100 / 255, 120 / 255]; // Slightly lighter than header
    menu.addChild(menuItem, sceneOptions);
  }

  // Create user profile in header
  const profile = runtime.objects.Panel.createInstance(layer, 0, 0);
  profile.instVars.style = `
        width: 40
        height: 40
        border-radius: 20
    `;
  profile.instVars.classes = "";
  profile.behaviors.DragDrop.isEnabled = false;
  profile.colorRgb = [100 / 255, 180 / 255, 240 / 255]; // Light blue
  header.addChild(profile, sceneOptions);

  // Create main content area with sidebar and content
  const content = runtime.objects.Panel.createInstance(layer, 0, 0);
  content.instVars.style = `
        display: horizontal
        gap: 0
        fit-content: true
    `;
  content.instVars.classes = "";
  content.behaviors.DragDrop.isEnabled = false;
  content.colorRgb = [255 / 255, 255 / 255, 255 / 255]; // White
  content.opacity = 0;
  app.addChild(content, sceneOptions);

  // Create sidebar with vertical layout
  const sidebar = runtime.objects.Panel.createInstance(layer, 0, 0);
  sidebar.instVars.style = `
        display: vertical
        gap: 10
        padding: 15
        width: 200
        border-right-width: 1
        fit-content: true
    `;
  sidebar.instVars.classes = "";
  sidebar.behaviors.DragDrop.isEnabled = false;
  sidebar.colorRgb = [45 / 255, 45 / 255, 50 / 255]; // Very light gray
  content.addChild(sidebar, sceneOptions);

  // Create sidebar items
  for (let i = 0; i < 5; i++) {
    const sidebarItem = runtime.objects.Panel.createInstance(layer, 0, 0);
    sidebarItem.instVars.style = `
            width: 170
            height: 40
            border: 1
        `;
    sidebarItem.instVars.classes = "";
    sidebarItem.behaviors.DragDrop.isEnabled = false;
    sidebarItem.colorRgb = [240 / 255, 230 / 255, 240 / 255]; // Light gray
    sidebar.addChild(sidebarItem, sceneOptions);
  }

  // Create main content panel with grid layout
  const mainContent = runtime.objects.Panel.createInstance(layer, 0, 0);
  mainContent.instVars.style = `
        display: grid
        columns: 2
        gap: 20
        padding: 20
        height: 100%
        fit-content: true
    `;
  mainContent.instVars.classes = "";
  mainContent.behaviors.DragDrop.isEnabled = false;
  mainContent.colorRgb = [52 / 255, 52 / 255, 55 / 255]; // Almost white
  content.addChild(mainContent, sceneOptions);

  // Create grid content items
  for (let i = 0; i < 4; i++) {
    const contentItem = runtime.objects.Panel.createInstance(layer, 0, 0);
    contentItem.instVars.style = `
            width: 150
            height: 100
            border: 1
        `;
    contentItem.instVars.classes = "";
    contentItem.behaviors.DragDrop.isEnabled = false;

    // Alternate colors
    if (i % 2 === 0) {
      contentItem.colorRgb = [240 / 255, 248 / 255, 255 / 255]; // Alice blue
    } else {
      contentItem.colorRgb = [255 / 255, 250 / 255, 240 / 255]; // Floral white
    }

    mainContent.addChild(contentItem, sceneOptions);
  }

  // Create a modal dialog with absolute positioning
  const modal = runtime.objects.Panel.createInstance(layer, 0, 0);
  modal.instVars.style = `
        display: vertical
        position: absolute
        width: 400
        height: 300
        border: 2
    `;
  modal.instVars.classes = "";
  //modal.behaviors.DragDrop.isEnabled = false;
  modal.colorRgb = [255 / 255, 255 / 255, 255 / 255]; // White
  modal.opacity = 0.95; // Set transparency directly on the instance
  //app.addChild(modal, sceneOptions);

  // Create modal header
  const modalHeader = runtime.objects.Panel.createInstance(layer, 0, 0);
  modalHeader.instVars.style = `
        width: 100%
        height: 40
        border-bottom-width: 1
    `;
  modalHeader.instVars.classes = "";
  modalHeader.behaviors.DragDrop.isEnabled = false;
  modalHeader.colorRgb = [70 / 255, 130 / 255, 180 / 255]; // Steel blue

  // Set tag for anchor targeting
  modalHeader.setAllTags(new Set(["modalHeader"]));

  modal.addChild(modalHeader, sceneOptions);

  // Create close button with anchor positioning
  const closeBtn = runtime.objects.Panel.createInstance(layer, 0, 0);
  closeBtn.instVars.style = `
        position: anchor
        anchor-target: modalHeader
        anchor-point: right
        self-anchor: center
        anchor-offset-x: -20
        width: 20
        height: 20
    `;
  closeBtn.behaviors.DragDrop.isEnabled = false;
  closeBtn.instVars.classes = "";
  closeBtn.colorRgb = [255 / 255, 100 / 255, 100 / 255]; // Light red
  modal.addChild(closeBtn, sceneOptions);

  return app;
}

/**
 * Creates a form layout with inputs and labels
 * @param {Object} runtime - Construct 3 runtime
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} layer - Z-order layer
 * @returns {Object} The root container
 */
export function createFormLayout(runtime, x, y, layer) {
  // Create form container
  const form = runtime.objects.Panel.createInstance(layer, x, y);
  form.instVars.style = `
        display: vertical
        gap: 15
        padding: 20
        width: 400
        height: 350
        border: 2
        fit-content: true
    `;
  form.setAllTags(new Set(["root"]));
  form.instVars.classes = "";
  form.colorRgb = [50 / 255, 50 / 255, 55 / 255]; // Very light blue

  // Create form header
  const header = runtime.objects.Panel.createInstance(layer, 0, 0);
  header.instVars.style = `
        width: 100%
        height: 50
        border-bottom-width: 1
        margin-bottom: 10
    `;
  header.instVars.classes = "";
  header.behaviors.DragDrop.isEnabled = false;
  header.colorRgb = [70 / 255, 130 / 255, 180 / 255]; // Steel blue
  form.addChild(header, sceneOptions);

  // Create form fields (label + input pairs)
  const fieldData = [
    { label: "Name", height: 30 },
    { label: "Email", height: 30 },
    { label: "Message", height: 80 },
  ];

  for (const data of fieldData) {
    // Create field container with horizontal layout
    const fieldRow = runtime.objects.Panel.createInstance(layer, 0, 0);
    fieldRow.instVars.style = `
            display: horizontal
            gap: 10
            width: 100%
            height: ${data.height + 10}
            align-items: start
            fit-content: true
        `;
    fieldRow.instVars.classes = "";
    fieldRow.behaviors.DragDrop.isEnabled = false;
    fieldRow.colorRgb = [50 / 255, 50 / 255, 55 / 255]; // Same as form
    form.addChild(fieldRow, sceneOptions);

    // Create label
    const label = runtime.objects.Panel.createInstance(layer, 0, 0);
    label.instVars.style = `
            width: 80
            height: ${data.height}
            border: 1
        `;
    label.instVars.classes = "";
    label.behaviors.DragDrop.isEnabled = false;
    label.colorRgb = [240 / 255, 240 / 255, 245 / 255]; // Light gray
    fieldRow.addChild(label, sceneOptions);

    // Create input
    const input = runtime.objects.Panel.createInstance(layer, 0, 0);
    input.instVars.style = `
            width: 270
            height: ${data.height}
            border: 1
        `;
    input.instVars.classes = "";
    input.behaviors.DragDrop.isEnabled = false;
    input.colorRgb = [255 / 255, 255 / 255, 255 / 255]; // White
    fieldRow.addChild(input, sceneOptions);
  }

  // Create buttons container with horizontal layout and right alignment
  const buttons = runtime.objects.Panel.createInstance(layer, 0, 0);
  buttons.instVars.style = `
        display: horizontal
        gap: 10
        width: 100%
        height: 40
        justify-content: end
        margin-top: 10
    `;
  buttons.instVars.classes = "";
  buttons.behaviors.DragDrop.isEnabled = false;
  buttons.colorRgb = [50 / 255, 50 / 255, 55 / 255]; // Same as form
  form.addChild(buttons, sceneOptions);

  // Create cancel button
  const cancelBtn = runtime.objects.Panel.createInstance(layer, 0, 0);
  cancelBtn.instVars.style = `
        width: 100
        height: 40
    `;
  cancelBtn.instVars.classes = "";
  cancelBtn.behaviors.DragDrop.isEnabled = false;
  cancelBtn.colorRgb = [220 / 255, 220 / 255, 220 / 255]; // Gray
  buttons.addChild(cancelBtn, sceneOptions);

  // Create submit button
  const submitBtn = runtime.objects.Panel.createInstance(layer, 0, 0);
  submitBtn.instVars.style = `
        width: 100
        height: 40
    `;
  submitBtn.instVars.classes = "";
  submitBtn.behaviors.DragDrop.isEnabled = false;
  submitBtn.colorRgb = [70 / 255, 200 / 255, 120 / 255]; // Green
  buttons.addChild(submitBtn, sceneOptions);

  return form;
}
