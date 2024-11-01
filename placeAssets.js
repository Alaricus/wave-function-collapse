 // Once the map is ready this will place some assets
 export const placeAssets = async (ctx, delay, assetsImage, board, assetList, width, tileSize, typeTile) => {
  // TODO:
  // 1. large lilies clip land - limitation of the tileset
  // 2. things that should be rare and far apart (rocks, logs) bunch up like plants - need to code that up somehow

  const typeList = {
    '10': 'grass',
    '13': 'dirt',
    '16': 'shallow_water'
  };
  const assets = assetList.filter(asset => asset.biome.includes(typeList[typeTile]));

  // For now lets assume assets are plants that can only originate on grass tiles
  const typeTilesCoords = board.flat().reduce((acc, cur, index) => {
    if (cur.result === typeTile) {
      acc.push({ x: index % width, y: Math.floor(index / width) })
    }
    return acc;
  }, []);

  const numOfAssets = typeTilesCoords.length / (typeTile === '10' ? 3 : 6);
  const assetsToDraw = [];

  const findAvailableSpot = (length) => {
    const result = [];

    // find a random tile of the right type
    const randomTileTypeCoords = typeTilesCoords[Math.floor(Math.random() * typeTilesCoords.length)];

    if (length === 1 && !board[randomTileTypeCoords.y][randomTileTypeCoords.x]?.assetName) {
      result.push(randomTileTypeCoords);
    } else {
      let adjacentTileTypeCoords;
      const adjustment = Math.floor(Math.random() * 2) ? 1 : -1;

      // check sides
      if (board[randomTileTypeCoords.y][randomTileTypeCoords.x + adjustment]?.result === typeTile) {
        adjacentTileTypeCoords = { x: randomTileTypeCoords.x + adjustment, y: randomTileTypeCoords.y };

        if (!board[randomTileTypeCoords.y][randomTileTypeCoords.x]?.assetName &&
          !board[adjacentTileTypeCoords.y][adjacentTileTypeCoords.x]?.assetName
        ) {
          if (adjustment < 0) {
            result.push(adjacentTileTypeCoords);
            result.push(randomTileTypeCoords);
          } else {
            result.push(randomTileTypeCoords);
          result.push(adjacentTileTypeCoords);
          }
        }
      }
    }

    return result;
  };

  for (let i = 0; i < numOfAssets; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];

    // To fit all types of footprints we need to take the lower line of the footprint
    // (assuming for now that a footprint can be maximum of 2 tiles in height)
    // and find a group of horizontal tiles that's 2 less than the footprint's length
    // (with a minimum length of one)
    const minFootprintLength = asset['footprint-width'] - 2 >= 1 ? asset['footprint-width'] - 2 : 1;

    const footprintTilesCoords = findAvailableSpot(minFootprintLength);
    if (!footprintTilesCoords.length) {
      continue;
    }

    for (const tileCoords of footprintTilesCoords) {
      board[tileCoords.y][tileCoords.x].assetName = asset.name;
    }

    // This is the coords of the actual leftmost tile of the footprint (using the actual length not minimum length)
    const footprintOriginCoords = { x: footprintTilesCoords[0].x, y: footprintTilesCoords[0].y };
    if (asset['footprint-width'] > 2) {
      footprintOriginCoords.x -= 1;
    }

    const assetToDraw = {
      w: asset['total-width'] * tileSize,
      h: asset['total-height'] * tileSize,
      x: footprintOriginCoords.x * tileSize - tileSize - (asset.footprint_offset ? asset.footprint_offset * tileSize : 0),
      y: footprintOriginCoords.y * tileSize - (asset['total-height'] - 1) * tileSize,
      sx: asset['origin-x'],
      sy: asset['origin-y'],
      bottomY: footprintOriginCoords.y,
    };

    assetsToDraw.push(assetToDraw);
  }

  const drawAsset = (assetToDraw, mirror) => {
    mirror && ctx.save();
    mirror && ctx.scale(-1,1);
    ctx.drawImage(
      assetsImage,
      assetToDraw.sx * tileSize,
      assetToDraw.sy * tileSize,
      assetToDraw.w,
      assetToDraw.h,
      assetToDraw.x * (mirror ? -1 : 1) - (mirror ? assetToDraw.w : 0),
      assetToDraw.y,
      assetToDraw.w,
      assetToDraw.h,
    );
    mirror & ctx.restore();
  }

  assetsToDraw.sort((a, b) => a.bottomY - b.bottomY);

  for (const assetToDraw of assetsToDraw) {
    await delay(100);
    drawAsset(assetToDraw, Math.floor(Math.random() * 2));
  }
};
