/**
 * Hxighlighter is the superclass that will contain all instances of the tool.
 * It will allow users to set up targets to annotate and then ways to annotate
 */

/* common.css is imported by each full-version entry point (text-index, image-index-m2,
   video-index-vjs). The lite entry point imports common_lite.css instead.
   This keeps host-page-affecting body/html rules out of the lite bundle. */

/* istanbul ignore next */
var root = global || window;
root.Hxighlighter = root.Hxighlighter || function(options) {

  if (!options) {
    return;
  }

  // if no current instances, set up the dictionary
  if (!Hxighlighter.exists(Hxighlighter._instances)) {
    Hxighlighter._instances = {};
    Hxighlighter._instanceIDs = [];
  }

  // create a unique id for this instance
  var inst_id = options.inst_id;
  if (!Hxighlighter.exists(inst_id)) {
    if (Hxighlighter.exists(options.commonInfo.context_id) &&
            Hxighlighter.exists(options.commonInfo.collection_id) &&
            Hxighlighter.exists(options.commonInfo.object_id)) {
      // WARNING: If events aren't properly sent/received, check pub/sub functions are encoding object id in base64
      inst_id = options.commonInfo.context_id.replace(/\+/g, '_') + ':' + options.commonInfo.collection_id + ':' + btoa(options.commonInfo.object_id);
    } else {
      inst_id = Hxighlighter.getUniqueId();
    }
  }

  // save the new instance by its id
  Hxighlighter._instances[inst_id] = {
    'id': inst_id
  };

  // id gets pushed to list as well
  Hxighlighter._instanceIDs.push(inst_id);

  // set up the actual instance of Hxighlighter
  Hxighlighter._instances[inst_id].core = new Hxighlighter.Core(options, inst_id);
};

/**
 * List of Required Sequential Events (RSEs)
 */
Hxighlighter.requiredEvents = [
  // all components should deal with being enabled/disabled
  "ComponentEnable",
  "ComponentDisable",

  // targets should be sure that they have a way to make selection and show/hide annotations
  "TargetSelectionMade",
  "TargetAnnotationDraw",
  "TargetAnnotationUndraw",

  // viewers should handle a way to 1) make annotations and 2) display the text
  "ViewerEditorOpen",
  "ViewerEditorClose",
  "ViewerDisplayOpen",
  "ViewerDisplayClose",

  // storage should handle keeping track of the annotations made
  "StorageAnnotationSave",
  "StorageAnnotationLoad",
  "StorageAnnotationEdit",
  "StorageAnnotationDelete",
  "StorageAnnotationUpdate",

  // though replies are not mandatory, they are annotations and should be treated similarly
  // the line below can be commented out should it not be relevant to your usecase.
  "StorageAnnotationSearch",
];

/**
 * selectors will populate this array for target controllers to retrieve when
 * they are loaded on the page
 */
Hxighlighter.selectors = [];
Hxighlighter.drawers = [];
Hxighlighter.viewers = [];
Hxighlighter.plugins = [];
Hxighlighter.storage = [];
Hxighlighter.globals = {};

/**
 * Gets the .hxighlighter-container element when it acts as a positioning
 * context (i.e. has position:relative, set by the lite/embedded CSS).
 * Returns null for full-page/iframe mode so callers fall back to
 * viewport-relative logic (body, window.innerHeight, :root, etc.).
 *
 * @param      {Element|jQuery}  [fromElement]  Optional element to search from
 * @return     {Element|null}    The container DOM element, or null
 */
Hxighlighter.getContainer = function(fromElement) {
  var container;
  if (fromElement) {
    var el = fromElement instanceof jQuery ? fromElement[0] : fromElement;
    container = el.closest('.hxighlighter-container');
  } else {
    container = document.querySelector('.hxighlighter-container');
  }
  // Only return the container when it is a positioning context.
  // The lite CSS sets position:relative on .hxighlighter-container;
  // the full-page CSS leaves it static. This ensures the full/iframe
  // version continues to use viewport-relative coordinates.
  if (container && getComputedStyle(container).position !== 'static') {
    return container;
  }
  return null;
};

// comment out following line when not webpacking
export default Hxighlighter;
