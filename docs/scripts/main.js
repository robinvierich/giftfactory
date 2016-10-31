
var ASSET_PATHS = {
  BG: 'images/bg.jpg',
  CONVEYOR_BELTS: {
    1: 'images/conveyorbelt1.png',
    2: 'images/conveyorbelt2.png',
    3: 'images/conveyorbelt3.png',
    4: 'images/conveyorbelt4.png'
  }
};

var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var eventQueue = [];

var getTickerDt = function (ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
};

var update = function (dt, sceneIndex) {
};

var run = function (renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var startGame = function (renderer, sceneIndex) {
  //setupScene(sceneIndex);
  PIXI.ticker.shared.add(run.bind(null, renderer, sceneIndex));
};

// returns an index of {name: element}
var buildSceneGraph = function () {

  var root = new PIXI.Container();

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

      var bg = PIXI.Sprite.fromFrame(ASSET_PATHS.BG);
      worldContainer.addChild(bg);

      var conveyorBeltContainer = new PIXI.Container();
      worldContainer.addChild(conveyorBeltContainer);

      var CONVEYOR_BELT_DATA = [
        { position: { x: 0, y: 0 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[1], rotation: Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1} },
        { position: { x: 0, y: 400 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[2], rotation: Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1} },
        { position: { x: 1282, y: 0 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[3], rotation: -Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1} },
        { position: { x: 1282, y: 400 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[4], rotation: -Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1} }
      ];

      CONVEYOR_BELT_DATA.forEach(function (conveyorBeltDatum) {
        var conveyorBelt = PIXI.Sprite.fromFrame(conveyorBeltDatum.assetPath);
        conveyorBelt.position.set(conveyorBeltDatum.position.x, conveyorBeltDatum.position.y);
        conveyorBelt.anchor.set(conveyorBeltDatum.anchor.x, conveyorBeltDatum.anchor.y);
        conveyorBelt.scale.set(conveyorBeltDatum.scale.x, conveyorBeltDatum.scale.y);
        conveyorBelt.rotation = conveyorBeltDatum.rotation;
        conveyorBeltContainer.addChild(conveyorBelt);
      });

      conveyorBeltContainer.position.set(conveyorBeltContainer.children[0].width / 2);
        

  return {
    root: root,
      worldContainer: worldContainer,
        bg: bg,
        conveyorBeltContainer: conveyorBeltContainer
  };
};


var addKeyHandlers = function (renderer, worldContainer) {
  window.addEventListener('keydown', function (e) {
    // push keydown event to event queue
    eventQueue.push({ type: 'keydown', event: e });
  });

  window.addEventListener('keyup', function (e) {
    // push keyup event to event queue
    eventQueue.push({ type: 'keyup', event: e });
  });
};

var loadAssetObject = function (loader, assetObj) {
  for (let reference in assetObj) {
    var assetDesc = assetObj[reference];
    if (typeof assetDesc === 'object') {
      loadAssetObject(loader, assetDesc);
    } else {
      loader.add(assetObj[reference]);
    }
  }
}

var load = function () {
  return new Promise(function (resolve, reject) {
    var loader = new PIXI.loaders.Loader();

    loadAssetObject(loader, ASSET_PATHS);

    loader.once('complete', resolve);
    loader.once('error', reject);

    loader.load();
  });
};

var init = function () {
  var canvas = document.getElementById('root-canvas');
  var resolution = document.devicePixelRatio;

  var renderer = new PIXI.WebGLRenderer(WIDTH, HEIGHT, {
    view: canvas,
    resolution: resolution
  });

  load()
  .then(function () {
    // build scene
    var sceneIndex = buildSceneGraph();
    // add key handlers
    addKeyHandlers(renderer, sceneIndex.worldContainer);

    // DEBUGGING
    window.sceneIndex = sceneIndex;

    startGame(renderer, sceneIndex);
  })
  .catch(function (e) {
    window.console.error('error loading resources!');
    window.console.error(e);
  })
};