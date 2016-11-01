
var ASSET_PATHS = {
  BG: 'images/bg.jpg',
  CONVEYOR_BELTS: {
    1: 'images/conveyorbelt1.png',
    2: 'images/conveyorbelt2.png',
    3: 'images/conveyorbelt3.png',
    4: 'images/conveyorbelt4.png'
  },
  GIFTS: {
    0: 'images/gift.png'
  },
  BAD_GIFTS: {
    0: 'images/elfboy.jpg'
  },
  SAC: 'images/sac.jpg',
  SCALE: 'images/scale.png',
  NEEDLE: 'images/needle.png'
};

var LEFT = 0;
var RIGHT = 1;


var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var eventQueue = [];

var TIME_BETWEEN_FEEDS = 0.75;

var NEEDLE_ROT_MIN = -Math.PI / 4;
var NEEDLE_ROT_MAX = Math.PI / 4;
var MAX_SCORE = 100;

var conveyorBeltToGifts = new Map();
var g_conveyorBeltFromDirections = new Map();

var g_feedTimer = 0;
var g_nextConveyorBeltIndex = 0;
var g_tweens = [];
var g_score = 0;

var getTickerDt = function (ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
};

var expoInOut = function(t, start, end) {
  if (t === 0) { return start; }
  if (t === 1) { return end; }

  var t2 = t * 2;

  if (t2 < 1) { 
    return ((end - start) / 2) * (Math.pow(2, 10 * (t2 - 1)) + start);
  } else {
    return ((end - start) / 2) * (-Math.pow(2, -10 * (t2 - 1)) + 2) + start; 
  }
};

var linear = function(t, start, end) {
  return start + (end - start) * t;
};

var createTween = function (obj, start, end, duration, easingFunc, onComplete) {
  onComplete = onComplete || null;

  var tween =  {
    obj: obj,
    start: start,
    end: end,
    duration: duration,
    easingFunc: easingFunc,
    onComplete: onComplete,
    t: 0
  };

  return tween;
};

var updateTween = function (dt, tween) {
  var obj = tween.obj;

  for (var prop in tween.end) {
    if (!tween.end.hasOwnProperty(prop)) { continue; }

    var newVal = tween.easingFunc(tween.t / tween.duration, tween.start[prop], tween.end[prop]);
    // TODO: CLEAN UP THIS CHECK! There has to be a way..
    if (newVal[prop]) {
      obj[prop] = newVal[prop]; // assume newVal has same props as tween.start/end
    } else {
      obj[prop] = newVal;
    }
  }

  if (tween.t >= tween.duration && tween.onComplete) {
    tween.onComplete(tween);
  }
  
  tween.t = Math.min(tween.t + dt, tween.duration);
};

var increaseScore = function(increase) {
  g_score += increase;
};

var updateNeedle = function(dt, sceneIndex) {
  sceneIndex.needle.rotation = linear(g_score / MAX_SCORE, NEEDLE_ROT_MIN, NEEDLE_ROT_MAX);
};

var getDropConveyorBelt = function(conveyorBelt) {
  var parent = conveyorBelt.parent;
  var index = parent.children.indexOf(conveyorBelt);
  return parent.children[index + 1];
};

var getConveyorBeltFromDirection = function(conveyorBelt) {
  return g_conveyorBeltFromDirections.get(conveyorBelt);
};

var getGiftStartPosition = function(gift, conveyorBelt) {
  var fromDirection = getConveyorBeltFromDirection(conveyorBelt);

  var conveyorBeltGlobalPos = conveyorBelt.getGlobalPosition();
  var conveyorBeltBounds = conveyorBelt.getBounds();

  var x = fromDirection === LEFT ? -gift.width : WIDTH + gift.width;
  var y = conveyorBeltGlobalPos.y - conveyorBeltBounds.height / 2 - gift.height / 2;

  return new PIXI.Point(x, y);
};

var getGiftTransforms = function(conveyorBelt) {
  var dropConveyorBelt = getDropConveyorBelt(conveyorBelt);

  var conveyorBeltGlobalPos = conveyorBelt.getGlobalPosition();
  var dropConveyorBeltGlobalPos = dropConveyorBelt.getGlobalPosition();

  var rotation = conveyorBelt.rotation;

  var distanceAlongBelt = conveyorBelt.width / 3;

  var directionMultiplier = getConveyorBeltFromDirection(conveyorBelt) === LEFT ? -1 : 1;

  var x1 = directionMultiplier * distanceAlongBelt * Math.cos(rotation);
  var y1 = directionMultiplier * distanceAlongBelt * Math.sin(rotation) - conveyorBelt.height / 2;

  var x2 = 0;
  var y2 = -conveyorBelt.height / 2;

  var x3 = -directionMultiplier * distanceAlongBelt * Math.cos(rotation);
  var y3 = -directionMultiplier * distanceAlongBelt * Math.sin(rotation) - conveyorBelt.height / 2;

  var x4 = -30 * directionMultiplier;
  var y4 = -dropConveyorBelt.height / 2;

  return [
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x1, conveyorBeltGlobalPos.y + y1), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x2, conveyorBeltGlobalPos.y + y2), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(conveyorBeltGlobalPos.x + x3, conveyorBeltGlobalPos.y + y3), rotation: conveyorBelt.rotation},
    {position: new PIXI.Point(dropConveyorBeltGlobalPos.x + x4, dropConveyorBeltGlobalPos.y + y4), rotation: 0},
  ]
};

var addGift = function(giftContainer) {
  var gift = PIXI.Sprite.fromFrame(ASSET_PATHS.GIFTS[0]);
  gift.anchor.set(0.5, 1);
  gift.scale.set(0.75);
  giftContainer.addChild(gift);
  return gift;
};

var createGiftTweens = function(gift, endPos, endRot) {
  var DURATION = TIME_BETWEEN_FEEDS / 3;

  var startPos = new PIXI.Point(gift.x, gift.y);

  var posTween = createTween(gift.position, startPos, endPos, DURATION, linear, function(tween) {
    g_tweens.splice(g_tweens.indexOf(tween), 1);
  });

  var rotTween = createTween(gift, {rotation: gift.rotation}, {rotation: endRot}, DURATION, linear, function(tween) {
    g_tweens.splice(g_tweens.indexOf(tween), 1);
  });

  g_tweens.push(posTween);
  g_tweens.push(rotTween);
};

var feedGifts = function(conveyorBelt, giftContainer) {
  var newGift = addGift(giftContainer);
  newGift.position = getGiftStartPosition(newGift, conveyorBelt);

  var gifts = conveyorBeltToGifts.get(conveyorBelt);
  if (!gifts) {
    gifts = [];
    conveyorBeltToGifts.set(conveyorBelt, gifts);
  }

  var giftTransforms = getGiftTransforms(conveyorBelt);

  gifts.unshift(newGift);

  var fallingGift = (gifts.length > giftTransforms.length) ? gifts.pop() : null;

  for(var i = 0; i < gifts.length; i++) {
    var gift = gifts[i];
    var nextGiftTransform = giftTransforms[i];
    // TODO: add a tween here instead
    //gift.position = nextGiftTransform.position;
    //gift.rotation = nextGiftTransform.rotation;
    createGiftTweens(gift, nextGiftTransform.position, nextGiftTransform.rotation);
  }

  if (fallingGift) {
    // TODO: make gift fall
    fallingGift.parent.removeChild(fallingGift);
  }
};


var updateFeedTimer = function(dt, sceneIndex) {
  g_feedTimer += dt;
  if (g_feedTimer >= TIME_BETWEEN_FEEDS) {
    var conveyorBelt = sceneIndex.allConveyorBeltsContainer.children[g_nextConveyorBeltIndex];
    feedGifts(conveyorBelt, sceneIndex.giftContainer);
    g_nextConveyorBeltIndex = (g_nextConveyorBeltIndex + 2) % sceneIndex.allConveyorBeltsContainer.children.length;
    g_feedTimer = 0;
  }
};

var processKeyDown = function(dt, event, sceneIndex) {
};

var processInput = function(dt, sceneIndex) {
  while (eventQueue.length) {
    var eventData = eventQueue.shift();
    switch (eventData.type) {
    case 'keydown':
      processKeyDown(dt, eventData.event, sceneIndex);
      break;
    }
  }
};


var update = function (dt, sceneIndex) {
  processInput(dt, sceneIndex);
  updateFeedTimer(dt, sceneIndex);
  for (var i = 0; i < g_tweens.length; i++) {
    updateTween(dt, g_tweens[i]);
  }

  updateNeedle(dt, sceneIndex);
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

var addConveyorBelt = function(conveyorBeltDatum) {
  var conveyorBelt = PIXI.Sprite.fromFrame(conveyorBeltDatum.assetPath);

  conveyorBelt.position.set(conveyorBeltDatum.position.x, conveyorBeltDatum.position.y);
  conveyorBelt.anchor.set(conveyorBeltDatum.anchor.x, conveyorBeltDatum.anchor.y);
  conveyorBelt.scale.set(conveyorBeltDatum.scale.x, conveyorBeltDatum.scale.y);
  conveyorBelt.rotation = conveyorBeltDatum.rotation;

  var fromDirection = conveyorBeltDatum.fromDirection;
  g_conveyorBeltFromDirections.set(conveyorBelt, fromDirection);

  return conveyorBelt
};

var buildSceneGraph = function () {

  var root = new PIXI.Container();

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

      var bg = PIXI.Sprite.fromFrame(ASSET_PATHS.BG);
      worldContainer.addChild(bg);

      var scaleContainer = new PIXI.Container();
      scaleContainer.scale.set(0.25);
      scaleContainer.position.set(WIDTH/2, 100);
      worldContainer.addChild(scaleContainer);
        var scale = PIXI.Sprite.fromFrame(ASSET_PATHS.SCALE);
        scale.anchor.set(0.5, 0.5)
        scaleContainer.addChild(scale);

        var needle = PIXI.Sprite.fromFrame(ASSET_PATHS.NEEDLE);
        needle.anchor.set(0.5, 1);
        needle.position.set(scale.x, -110);
        needle.pivot.y = 93;
        needle.rotation = -Math.PI / 4;
        scaleContainer.addChild(needle);

      var allConveyorBeltsContainer = new PIXI.Container();
      worldContainer.addChild(allConveyorBeltsContainer);

      var CONVEYOR_BELT_DATA = [
        { 
          position: { x: 0, y: 0 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[1], rotation: Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1}, 
          fromDirection: LEFT,
          dropConveyorBeltDatum: { 
            position: { x: 400, y: 120 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[1], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          }
        },

        { 
          position: { x: 0, y: 300 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[2], rotation: Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1},
          fromDirection: LEFT,
          dropConveyorBeltDatum: { 
            position: { x: 400, y: 420 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[2], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          } 
        },

        { 
          position: { x: 1282, y: 0 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[3], rotation: -Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1},
          fromDirection: RIGHT,
          dropConveyorBeltDatum: { 
            position: { x: 882, y: 120 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[3], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          }
        },

        { 
          position: { x: 1282, y: 300 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[4], rotation: -Math.PI / 8, anchor: {x: 0.5, y: 0.5}, scale: {x: 2, y: 1},
          fromDirection: RIGHT,
          dropConveyorBeltDatum: { 
            position: { x: 882, y: 420 }, assetPath: ASSET_PATHS.CONVEYOR_BELTS[4], rotation: 0, anchor: {x: 0.5, y: 0.5}, scale: {x: 0.75, y: 1},
            fromDirection: LEFT,
          }
        },
      ];

      CONVEYOR_BELT_DATA.forEach(function (conveyorBeltDatum) {
        var conveyorBeltContainer = new PIXI.Container();
        var conveyorBelt = addConveyorBelt(conveyorBeltDatum);
        var dropConveyorBelt = addConveyorBelt(conveyorBeltDatum.dropConveyorBeltDatum);

        allConveyorBeltsContainer.addChild(conveyorBelt);
        allConveyorBeltsContainer.addChild(dropConveyorBelt);
      });

      allConveyorBeltsContainer.position.set(allConveyorBeltsContainer.children[0].width / 2);

      var giftContainer = new PIXI.Container();
      worldContainer.addChild(giftContainer);

      var sac = PIXI.Sprite.fromFrame(ASSET_PATHS.SAC);
      sac.anchor.set(0.5, 1);
      sac.x = WIDTH / 2;
      sac.y = HEIGHT;
      worldContainer.addChild(sac);
        

  return {
    root: root,
      worldContainer: worldContainer,
        bg: bg,
        allConveyorBeltsContainer: allConveyorBeltsContainer,
        giftContainer: giftContainer,
        scaleContainer: scaleContainer,
        scale: scale,
        needle: needle
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