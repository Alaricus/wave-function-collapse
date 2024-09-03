let widthInTiles = document.querySelector('#width');
let heightInTiles = document.querySelector('#height');
const animateTileGeneration = document.querySelector('#animate');
const reload = document.querySelector('#reload');
reload.addEventListener('click', () => {
  widthInTiles = document.querySelector('#width');
  heightInTiles = document.querySelector('#height');
  if (+widthInTiles.value > (+widthInTiles.getAttribute("max"))) {
    widthInTiles.value = widthInTiles.getAttribute("max");
  }
  if (+widthInTiles.value < (+widthInTiles.getAttribute("min"))) {
    widthInTiles.value = widthInTiles.getAttribute("min");
  }
  if (+heightInTiles.value > (+heightInTiles.getAttribute("max"))) {
    heightInTiles.value = heightInTiles.getAttribute("max");
  }
  if (+heightInTiles.value < (+heightInTiles.getAttribute("min"))) {
    heightInTiles.value = heightInTiles.getAttribute("min");
  }
  main();
});

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let tileset = null;

// Coordinates (in x,y format) on each tile on the tileset image
const tileCoordsXY = [
  [0, 0], // NW shore
  [1, 0], // N shore
  [2, 0], // NE shore
  [0, 1], // W shore
  [1, 1], // Grass
  [2, 1], // E shore
  [0, 2], // SW shore
  [1, 2], // S shore
  [2, 2], // SE shore
  [0, 3], // Warer
  [3, 0], // SE bay
  [4, 0], // SW bay
  [3, 1], // NE bay
  [4, 1], // NW bay
];

const edgeEnum = {
  WATER: 0,
  GRASS: 1,
  N_SHORE: 2,
  E_SHORE: 3,
  S_SHORE: 4,
  W_SHORE: 5,
};

// The keys in this object correspond to the indices of tileCoordxXY array
const tileTypes = {
  0: { // Northwestern shore
    n: edgeEnum.WATER,
    e: edgeEnum.N_SHORE,
    s: edgeEnum.W_SHORE,
    w: edgeEnum.WATER,
  },
  1: { // Northern shore
    n: edgeEnum.WATER,
    e: edgeEnum.N_SHORE,
    s: edgeEnum.GRASS,
    w: edgeEnum.N_SHORE,
  },
  2: { // Northeastern shore
    n: edgeEnum.WATER,
    e: edgeEnum.WATER,
    s: edgeEnum.E_SHORE,
    w: edgeEnum.N_SHORE,
  },
  3: { // Western shore
    n: edgeEnum.W_SHORE,
    e: edgeEnum.GRASS,
    s: edgeEnum.W_SHORE,
    w: edgeEnum.WATER,
  },
  4: { // Grass
    n: edgeEnum.GRASS,
    e: edgeEnum.GRASS,
    s: edgeEnum.GRASS,
    w: edgeEnum.GRASS,
  },
  5: { // Eastern shore
    n: edgeEnum.E_SHORE,
    e: edgeEnum.WATER,
    s: edgeEnum.E_SHORE,
    w: edgeEnum.GRASS,
  },
  6: { // Southwestern shore
    n: edgeEnum.W_SHORE,
    e: edgeEnum.S_SHORE,
    s: edgeEnum.WATER,
    w: edgeEnum.WATER,
  },
  7: { // Southern shore
    n: edgeEnum.GRASS,
    e: edgeEnum.S_SHORE,
    s: edgeEnum.WATER,
    w: edgeEnum.S_SHORE,
  },
  8: { // Southeastern shore
    n: edgeEnum.E_SHORE,
    e: edgeEnum.WATER,
    s: edgeEnum.WATER,
    w: edgeEnum.S_SHORE,
  },
  9: { // Water
    n: edgeEnum.WATER,
    e: edgeEnum.WATER,
    s: edgeEnum.WATER,
    w: edgeEnum.WATER,
  },
  10: { // Southeastern bay
    n: edgeEnum.GRASS,
    e: edgeEnum.S_SHORE,
    s: edgeEnum.E_SHORE,
    w: edgeEnum.GRASS,
  },
  11: { // Southwestern bay
    n: edgeEnum.GRASS,
    e: edgeEnum.GRASS,
    s: edgeEnum.W_SHORE,
    w: edgeEnum.S_SHORE,
  },
  12: { // Northeastern bay
    n: edgeEnum.E_SHORE,
    e: edgeEnum.N_SHORE,
    s: edgeEnum.GRASS,
    w: edgeEnum.GRASS,
  },
  13: { // Northwestern bay
    n: edgeEnum.W_SHORE,
    e: edgeEnum.GRASS,
    s: edgeEnum.GRASS,
    w: edgeEnum.N_SHORE,
  },
};

window.onload = () => {
  const image = new Image();
  image.src = './tileset.png';
  tileset = image;

  // WTF
  setTimeout(main, 100);
};

const buildBoard = (rows, columns) => {
  const arr = [];

  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < columns; j++) {
      row.push({ result: null, variants: Object.keys(tileTypes) });
    }
    arr.push(row);
  }

  return arr;
};

const delay = (ms) => {
  return new Promise(resolve => {
      setTimeout(resolve, ms);
  });
};

const draw = (board, tileSize) => {
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  board.forEach((row, i) => {
    row.forEach((col, j) => {
      const x = j * tileSize;
      const y = i * tileSize;
      const w = tileSize;
      const h = tileSize;

      const cell = board[i][j];

      ctx.fillRect(x, y, w, h);

      if (cell.result !== null) {
        const [sx, sy] = tileCoordsXY[cell.result];
        ctx.drawImage(tileset, sx * tileSize, sy * tileSize, tileSize, tileSize, x, y, tileSize, tileSize);
      } else {
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.fillText(cell.variants.length, x + ((w - ctx.measureText(cell.variants.length.toString()).width) / 2), y + 19);
      }

      ctx.fillStyle = 'white';
    });
  });
};

const main = async () => {
  const height = heightInTiles.value;
  const width = widthInTiles.value;
  const tileSize = 32;

  ctx.width = width * tileSize;
  ctx.height = height * tileSize;
  ctx.canvas.width = width * tileSize;
  ctx.canvas.height = height * tileSize;

  const getLowestEntropyTile = () => {
    const lowest = board.flat().reduce((acc, cur, index) => {
      if (cur.result === null && cur.variants.length <= acc.entropy) {
        acc.entropy = cur.variants.length;
        acc.index = index;
      }
      return acc;
    }, { entropy: Object.keys(edgeEnum).length, index: null });

    if (lowest.index === null) {
      return null;
    }

    const result = {
      x: lowest.index % width,
      y: Math.floor(lowest.index / width)
    };

    return result;
  };

  const board = buildBoard(height, width);
  const startingTileCoords = {
    x: Math.floor(Math.random() * width),
    y: Math.floor(Math.random() * height)
  };
  const startingTileType = Math.floor(Math.random() * Object.keys(tileTypes).length);

  board[startingTileCoords.y][startingTileCoords.x] = { result: startingTileType, variants: [] };

  let resetCounter = 1;
  let resetSize = 1;

  const resetTileAndNeighbors = (x, y) => {
    console.log(`reset ${resetCounter} times, at ${resetSize * 2 + 1}x${resetSize * 2 + 1}`);
    resetCounter++;
    if (resetCounter > 5) {
      resetSize++;
      resetCounter = 1;
    }
    // Select a square around the problem tile and reset it
    const minX = x - resetSize;
    const maxX = x + resetSize;
    const minY = y - resetSize;
    const maxY = y + resetSize;

    for (let i = minY; i < maxY + 1; i++) {
      if (i > -1 && i < height) {
        for (let j = minX; j < maxX + 1; j++) {
          if (j > -1 && j < width) {
            board[i][j] = { result: null, variants: Object.keys(tileTypes) };
          }
        }
      }
    }
  };

  // Pass the coords of the first random tile first
  const processTile = async (x, y) => {
    const thisTile = board[y][x];
    if (thisTile.result !== null) {
      // For a known tile, find the neighbors and process them
      const wNeighborCoords = (x > 0) ? { x: x - 1, y: y } : null;
      const eNeighborCoords = (x < width - 1) ? { x: x + 1, y: y } : null;
      const nNeighborCoords = (y > 0) ? { x: x, y: y - 1 } : null;
      const sNeighborCoords = (y < height - 1) ? { x: x, y: y + 1 } : null;

      const processNeighbor = (coords, direction) => {
        let oppositeDirection = null;
        if (direction === 'w') { oppositeDirection = 'e'};
        if (direction === 'e') { oppositeDirection = 'w'};
        if (direction === 'n') { oppositeDirection = 's'};
        if (direction === 's') { oppositeDirection = 'n'};
        // if a west neighbor exists
        if (coords && oppositeDirection) {
          // remove variants that don't exist in tileTypes for this type of cell
          const neighbor = board[coords.y][coords.x]
          if (neighbor.result === null) {
            // filter variants (tileTypes) by them having a correct western constraint
            // get all tile types that match this W edge
            const allowed = [];
            for (const key in tileTypes) {
              if (tileTypes[key][oppositeDirection] === tileTypes[thisTile.result][direction]) {
                allowed.push(key);
              }
            }
            neighbor.variants = neighbor.variants.filter(variant => allowed.includes(variant));
            if (neighbor.variants.length === 0) {
              resetTileAndNeighbors(x, y);
            }
          }
        }
      };

      processNeighbor(wNeighborCoords, 'w');
      processNeighbor(eNeighborCoords, 'e');
      processNeighbor(nNeighborCoords, 'n');
      processNeighbor(sNeighborCoords, 's');

      // Find the tile with lowest amount of variants and randomly select one for it to collapse into
      const lowestEntropyTileCoords = getLowestEntropyTile();
      if (!lowestEntropyTileCoords) {
        return;
      }
      const lowestEntropyTile = board[lowestEntropyTileCoords.y][lowestEntropyTileCoords.x];
      const randomVariant = lowestEntropyTile.variants[Math.floor(Math.random() * lowestEntropyTile.variants.length)];
      lowestEntropyTile.result = randomVariant;

      // Experimenting with land/water bodies chunkiness. Will probably want to replace this with weights later
      // Adjust chunkiness of water
      if (lowestEntropyTile.variants.includes('9')) {
        const percentage = Math.random();
        if (percentage <= 0.95) {
          lowestEntropyTile.result = '9';
        } else {
          lowestEntropyTile.result = randomVariant;
        }
      }
      // Adjust chunkiness of land
      if (lowestEntropyTile.variants.includes('4')) {
        const percentage = Math.random();
        if (percentage <= 0.9) {
          lowestEntropyTile.result = '4';
        } else {
          lowestEntropyTile.result = randomVariant;
        }
      }

      if (animateTileGeneration.checked === true) {
        await delay(15);
      }

      draw(board, tileSize);

      processTile(lowestEntropyTileCoords.x, lowestEntropyTileCoords.y);
    }
  };

  processTile(startingTileCoords.x, startingTileCoords.y);
};