onload = async function () {
  const gsiv = new GSIV();
  await gsiv.loadProto();
  console.log(gsiv);
  const CanvasLayer = L.GridLayer.extend({
    createTile: function (coords, done) {
      // console.log(coords);
      let error = null;
      // create a <canvas> element for drawing
      const tile = L.DomUtil.create("canvas", "leaflet-tile");
      // setup tile width and height according to the options
      const size = this.getTileSize();
      tile.width = size.x * 2;
      tile.height = size.y * 2;
      const ctx = tile.getContext("2d");
      // ctx.fillStyle = "rgb(150,150,180)";
      // ctx.fillRect(0, 0, tile.width, tile.height);
      gsiv
        .loadTile(coords.z - 1, coords.x, coords.y)
        .then((data) => {
          const layers = data.layers;
          ctx.fillStyle = "rgb(250,250,250)";
          ctx.fillRect(0, 0, tile.width, tile.height);
          // ! Change flow
          // layers.foreach()
          if (layers.waterarea) gsiv.draw(tile, layers.waterarea);
          if (layers.lake) gsiv.draw(tile, layers.lake);
          if (layers.river) gsiv.draw(tile, layers.river);
          if (layers.railway) gsiv.draw(tile, layers.railway);
          if (layers.structurea) gsiv.draw(tile, layers.structurea);
          if (layers.building) gsiv.draw(tile, layers.building);
          if (layers.road) gsiv.draw(tile, layers.road);
          if (layers.structurel) gsiv.draw(tile, layers.structurel);
          done(error, tile);
        })
        .catch((e) => {
          // ctx.fillStyle = "rgb(150,150,150)";
          // ctx.fillRect(0, 0, tile.width, tile.height);
          done(error, tile);
        });
      return tile;
    },
  });
  const vlayer = new CanvasLayer({
    tileSize: 512,
    attribution:
      "<a href='https://github.com/gsi-cyberjapan/gsimaps-vector-experiment' target='_blank'>国土地理院ベクトルタイル提供実験</a>",
  });
  const map = L.map("map", {
    zoom: 14,
    minZoom: 4,
    maxZoom: 17,
    zoomSnap: 0,
    center: [35.657741, 139.742269],
  });
  vlayer.addTo(map);
};
