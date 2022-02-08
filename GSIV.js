class GSIV {
  loadProto = () =>
    new Promise((resolve, reject) => {
      protobuf.load("vector_tile.proto", (err, root) => {
        if (err) reject(err);
        this.tile = root.lookupType("vector_tile.Tile");
        resolve(this);
      });
    });

  static load = (path) =>
    new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open("get", path, true);
      req.responseType = "arraybuffer";
      req.onload = () =>
        req.status == 200 ? resolve(req.response) : reject("file cannot load");
      req.send();
    });

  loadTile = (z, x, y, using_layers) =>
    new Promise((resolve, reject) => {
      GSIV.load(
        `https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/${z}/${x}/${y}.pbf`
      )
        .then((plain) => {
          const buf = new Uint8Array(plain);
          const msg = this.tile.decode(buf);
          const obj = this.tile.toObject(msg);
          const layers = {};
          const layer_names_for_dbug = [];
          // filter layer
          for (let layer of obj.layers) {
            layer_names_for_dbug.push(layer.name);
            if (using_layers.includes(layer.name)) layers[layer.name] = layer;
          }
          console.log(layer_names_for_dbug);
          resolve({ zoom: z, tilex: x, tiley: y, layers: layers });
        })
        .catch((r) => reject("cannot load tile"));
    });

  draw(can, layer, style) {
    const decodeint = (value) => (value >> 1) ^ -(value & 1);
    const ext = layer.extent;
    const ctx = can.getContext("2d");
    let lc = 0;
    const wx = can.width / ext;
    const wy = can.height / ext;
    for (let i in layer.features) {
      // decode tags
      const tags = layer.features[i].tags;
      const type = layer.features[i].type;
      const attr = {};
      for (let i = 0; i < tags.length; i += 2) {
        attr[layer.keys[tags[i]]] = layer.values[tags[i + 1]];
      }

      //   console.log(attr);
      // Set Default
      {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.fillStyle = "rgba(100,100,200,1)";
      }
      if (style[layer.name].lineWidth)
        ctx.lineWidth = style[layer.name].lineWidth;
      if (style[layer.name].strokeStyle)
        ctx.strokeStyle = style[layer.name].strokeStyle;
      if (style[layer.name].fillStyle)
        ctx.fillStyle = style[layer.name].fillStyle;
      switch (layer.name) {
        case "waterarea":
        case "lake":
          ctx.fillStyle = "rgba(150,150,200,1)";
          break;
        case "contour":
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(100,50,50,0.5)";
          break;
      }
      //decode geometory
      const geo = layer.features[i].geometry;
      let gi = 0;
      let cx = 0;
      let cy = 0;
      let sx = 0;
      let sy = 0;
      //		ctx.lineWidth = attr.rnkWidth.intValue + 1
      ctx.beginPath();
      while (gi < geo.length) {
        let c = geo[gi++];
        let cmd = c & 7; //command
        let count = c >> 3; //count
        switch (cmd) {
          case 1: //moveto
            for (let i = 0; i < count; i++) {
              cx = cx + decodeint(geo[gi]);
              cy = cy + decodeint(geo[gi + 1]);
              ctx.moveTo(cx * wx, cy * wy);
              //						console.log("move "+ cx+"x"+cy)
            }
            (sx = cx), (sy = cy);
            gi += count * 2;
            break;
          case 2: //liento
            for (let i = 0; i < count; i++) {
              cx += decodeint(geo[gi++]);
              cy += decodeint(geo[gi++]);
              ctx.lineTo(cx * wx, cy * wy);
              lc++;
              //						console.log("line "+cx+"x"+cy)
            }
            break;
          case 7: //close
            ctx.lineTo(sx * wx, sy * wy);
            ctx.moveTo(cx * wx, cy * wy);
            lc++;
            break;
          default:
            console.log("illigal command");
        }
      }
      if (type == 3) ctx.fill();
      else ctx.stroke();
    }
    return lc;
  }
}

const decodeGeometory = (ctx) => {
  ctx.beginPath();
  while (gi < geo.length) {
    let c = geo[gi++];
    let cmd = c & 7;
    let count = c >> 3;
    switch (cmd) {
      case 1: //moveto
        for (let i = 0; i < count; i++) {
          cx = cx + decodeint(geo[gi]);
          cy = cy + decodeint(geo[gi + 1]);
          ctx.moveTo(cx * wx, cy * wy);
          //   console.log("move " + cx + "x" + cy);
        }
        (sx = cx), (sy = cy);
        gi += count * 2;
        break;
      case 2: //liento
        for (let i = 0; i < count; i++) {
          cx += decodeint(geo[gi++]);
          cy += decodeint(geo[gi++]);
          ctx.lineTo(cx * wx, cy * wy);
          lc++;
          //   console.log("line " + cx + "x" + cy);
        }
        break;
      case 7: //close
        ctx.lineTo(sx * wx, sy * wy);
        ctx.moveTo(cx * wx, cy * wy);
        lc++;
        break;
      default:
        console.log("illigal command");
    }
  }
  if (type == 3) ctx.fill();
  else ctx.stroke();
};
